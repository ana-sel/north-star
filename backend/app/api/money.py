"""Money transactions API — spec §9 Money screen.

Tracks transactions (positive = income, negative = expense). Provides
a totals/by-category summary endpoint to back simple budget views.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.enums import PrivacyLevel
from app.models.money_transaction import MoneyTransaction


router = APIRouter(prefix="/money", tags=["money"])


class TransactionOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    txn_date: date
    amount: Decimal
    currency: str
    category: str | None
    description: str | None
    privacy_level: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
class TransactionCreate(BaseModel):
    user_id: uuid.UUID
    amount: Decimal
    txn_date: date | None = None
    currency: str = "GBP"
    category: str | None = None
    description: str | None = None


class TransactionUpdate(BaseModel):
    txn_date: date | None = None
    amount: Decimal | None = None
    currency: str | None = None
    category: str | None = None
    description: str | None = None


class CategoryTotal(BaseModel):
    category: str
    total: Decimal
    count: int


class MoneySummary(BaseModel):
    period_days: int
    income: Decimal
    expenses: Decimal
    net: Decimal
    by_category: list[CategoryTotal]


@router.get("", response_model=list[TransactionOut])
def list_transactions(
    user_id: uuid.UUID = Query(...),
    days: int = Query(default=30, ge=1, le=365),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MoneyTransaction]:
    since = date.today() - timedelta(days=days)
    stmt = (
        select(MoneyTransaction)
        .where(
            MoneyTransaction.user_id == user_id,
            MoneyTransaction.txn_date >= since,
        )
        .order_by(MoneyTransaction.txn_date.desc(), MoneyTransaction.created_at.desc())
    )
    if category is not None:
        stmt = stmt.where(MoneyTransaction.category == category)
    return list(db.execute(stmt).scalars())


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(
    payload: TransactionCreate, db: Session = Depends(get_db)
) -> MoneyTransaction:
    txn = MoneyTransaction(
        user_id=payload.user_id,
        txn_date=payload.txn_date or date.today(),
        amount=payload.amount,
        currency=payload.currency,
        category=payload.category,
        description=payload.description,
        privacy_level=PrivacyLevel.SENSITIVE,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return txn


@router.patch("/{txn_id}", response_model=TransactionOut)
def update_transaction(
    txn_id: uuid.UUID,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
) -> MoneyTransaction:
    txn = db.get(MoneyTransaction, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(txn, field, value)
    db.commit()
    db.refresh(txn)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(
    txn_id: uuid.UUID, db: Session = Depends(get_db)
) -> Response:
    txn = db.get(MoneyTransaction, txn_id)
    if txn is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(txn)
    db.commit()
    return Response(status_code=204)


@router.get("/summary", response_model=MoneySummary)
def money_summary(
    user_id: uuid.UUID = Query(...),
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
) -> MoneySummary:
    since = date.today() - timedelta(days=days)
    base = select(MoneyTransaction).where(
        MoneyTransaction.user_id == user_id,
        MoneyTransaction.txn_date >= since,
    )

    income = db.execute(
        select(func.coalesce(func.sum(MoneyTransaction.amount), 0)).where(
            MoneyTransaction.user_id == user_id,
            MoneyTransaction.txn_date >= since,
            MoneyTransaction.amount > 0,
        )
    ).scalar_one()
    expenses = db.execute(
        select(func.coalesce(func.sum(MoneyTransaction.amount), 0)).where(
            MoneyTransaction.user_id == user_id,
            MoneyTransaction.txn_date >= since,
            MoneyTransaction.amount < 0,
        )
    ).scalar_one()

    cat_expr = func.coalesce(MoneyTransaction.category, "uncategorised")
    cat_rows = db.execute(
        select(
            cat_expr.label("category"),
            func.sum(MoneyTransaction.amount).label("total"),
            func.count().label("count"),
        )
        .where(
            MoneyTransaction.user_id == user_id,
            MoneyTransaction.txn_date >= since,
        )
        .group_by(cat_expr)
        .order_by(func.sum(MoneyTransaction.amount))
    ).all()

    return MoneySummary(
        period_days=days,
        income=Decimal(income),
        expenses=Decimal(expenses),
        net=Decimal(income) + Decimal(expenses),
        by_category=[
            CategoryTotal(category=r.category, total=Decimal(r.total), count=r.count)
            for r in cat_rows
        ],
    )
