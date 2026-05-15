"""Seed realistic mock data for development & demos.

Run with:  python -m app.seed_mock
Idempotent — checks if user already exists before inserting.
"""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select

from app.db import SessionLocal
from app.models.user import User
from app.models.card import Card
from app.models.habit import Habit, HabitLog
from app.models.health_log import HealthLog
from app.models.money_transaction import MoneyTransaction
from app.models.diary_entry import DiaryEntry
from app.models.energy import EnergyLog

# Fixed user ID matching DEV_USER_ID in mobile config
USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000000")
NOW = datetime.now(timezone.utc)
TODAY = date.today()


def seed_mock() -> None:
    with SessionLocal() as db:
        # --- User ---
        existing = db.execute(select(User).where(User.id == USER_ID)).scalar_one_or_none()
        if not existing:
            db.add(User(id=USER_ID, email="ana@northstar.local", display_name="Ana"))
            db.commit()
            print("Created dev user.")
        else:
            print("Dev user exists.")

        # --- Cards (across all statuses and life areas) ---
        existing_cards = db.execute(select(Card).where(Card.user_id == USER_ID)).scalars().all()
        if len(existing_cards) >= 10:
            print(f"Cards already seeded ({len(existing_cards)} exist). Skipping.")
        else:
            cards = [
                # Vision
                Card(user_id=USER_ID, title="Live a happy, free, intentional life",
                     level="vision", type="goal", status="planned", life_area="mind_healing",
                     priority="high", energy_required="low",
                     description="Personal mission: explore hidden rules, build freedom, refine in solitude."),
                # Goals
                Card(user_id=USER_ID, title="Build North Star app",
                     level="goal", type="goal", status="in_progress_my_side", life_area="app_building",
                     priority="high", energy_required="high",
                     description="Private AI-powered life OS. React Native + FastAPI + Ollama."),
                Card(user_id=USER_ID, title="Achieve financial freedom (FIRE)",
                     level="goal", type="goal", status="planned", life_area="money_freedom",
                     priority="high", energy_required="medium",
                     description="Build passive income, reduce expenses, invest consistently."),
                Card(user_id=USER_ID, title="Improve sleep to 7.5h average",
                     level="goal", type="goal", status="planned", life_area="health_energy",
                     priority="high", energy_required="low"),
                # Projects
                Card(user_id=USER_ID, title="North Star: implement Plan tab",
                     level="project", type="task", status="today", life_area="app_building",
                     priority="high", energy_required="high", estimated_minutes=90),
                Card(user_id=USER_ID, title="Research home server setup",
                     level="project", type="research", status="planned", life_area="app_building",
                     priority="medium", energy_required="medium"),
                # Tasks - today
                Card(user_id=USER_ID, title="Walk 15 minutes",
                     level="task", type="task", status="today", life_area="health_energy",
                     priority="medium", energy_required="low", estimated_minutes=15),
                Card(user_id=USER_ID, title="Log food for the day",
                     level="task", type="habit", status="today", life_area="health_energy",
                     priority="low", energy_required="low", estimated_minutes=5),
                # Tasks - inbox
                Card(user_id=USER_ID, title="Maybe learn Rust?",
                     level="task", type="thought", status="inbox", life_area="work_skills",
                     priority="low", energy_required="medium",
                     description="Random thought — probably a fake want. Needs intake filter."),
                Card(user_id=USER_ID, title="Buy birthday gift for mum",
                     level="task", type="task", status="inbox", life_area="family",
                     priority="medium", energy_required="low"),
                Card(user_id=USER_ID, title="Plan Japan trip with family",
                     level="project", type="goal", status="planned", life_area="family",
                     priority="medium", energy_required="medium",
                     description="Oct 2026 target. Need to research flights and budget."),
                # Tasks - done
                Card(user_id=USER_ID, title="Write project spec",
                     level="task", type="task", status="done", life_area="app_building",
                     priority="high", energy_required="high",
                     completed_at=NOW - timedelta(days=3)),
                Card(user_id=USER_ID, title="Set up Docker Compose",
                     level="task", type="task", status="done", life_area="app_building",
                     priority="high", energy_required="medium",
                     completed_at=NOW - timedelta(days=5)),
                Card(user_id=USER_ID, title="Define personal mission",
                     level="task", type="decision", status="done", life_area="mind_healing",
                     priority="high", energy_required="high",
                     completed_at=NOW - timedelta(days=7)),
                # Stuck card (moved 3+ times)
                Card(user_id=USER_ID, title="Finish CS50 AI course",
                     level="project", type="task", status="planned", life_area="work_skills",
                     priority="high", energy_required="high",
                     moved_count=4, description="Keeps getting pushed. Review needed."),
                # Later
                Card(user_id=USER_ID, title="Write a book about hidden patterns",
                     level="goal", type="goal", status="later", life_area="contribution",
                     priority="low", energy_required="high",
                     description="Aligned with mission but not the right time."),
            ]
            db.add_all(cards)
            db.commit()
            print(f"Seeded {len(cards)} cards.")

        # --- Habits ---
        existing_habits = db.execute(select(Habit).where(Habit.user_id == USER_ID)).scalars().all()
        if existing_habits:
            print(f"Habits already seeded ({len(existing_habits)} exist). Skipping.")
            habit_map = {h.title: h for h in existing_habits}
        else:
            habits = [
                Habit(user_id=USER_ID, title="Sleep before 1am", kind="yes_no"),
                Habit(user_id=USER_ID, title="Wake before 8am", kind="yes_no"),
                Habit(user_id=USER_ID, title="Walk 10+ minutes", kind="yes_no"),
                Habit(user_id=USER_ID, title="Drink 2L water", kind="yes_no"),
                Habit(user_id=USER_ID, title="Protein target (120g)", kind="number",
                      target_value=Decimal("120"), target_unit="grams"),
                Habit(user_id=USER_ID, title="No sweets after 15:00", kind="yes_no"),
                Habit(user_id=USER_ID, title="Study AI (minutes)", kind="number",
                      target_value=Decimal("45"), target_unit="minutes"),
                Habit(user_id=USER_ID, title="Kaizen review", kind="yes_no"),
            ]
            db.add_all(habits)
            db.commit()
            print(f"Seeded {len(habits)} habits.")
            habit_map = {h.title: h for h in habits}

        # --- Habit Logs (last 7 days) ---
        existing_logs = db.execute(select(HabitLog).where(HabitLog.user_id == USER_ID)).scalars().all()
        if existing_logs:
            print(f"Habit logs already seeded ({len(existing_logs)} exist). Skipping.")
        else:
            import random
            logs = []
            for habit in habit_map.values():
                for day_offset in range(7):
                    d = TODAY - timedelta(days=day_offset)
                    if random.random() < 0.25:  # 25% skip days
                        continue
                    if habit.kind == "yes_no":
                        logs.append(HabitLog(
                            habit_id=habit.id, user_id=USER_ID,
                            log_date=d, value_bool=random.random() > 0.3
                        ))
                    elif habit.kind == "number":
                        val = Decimal(str(round(random.uniform(
                            float(habit.target_value or 60) * 0.5,
                            float(habit.target_value or 60) * 1.2
                        ), 1)))
                        logs.append(HabitLog(
                            habit_id=habit.id, user_id=USER_ID,
                            log_date=d, value_number=val
                        ))
            db.add_all(logs)
            db.commit()
            print(f"Seeded {len(logs)} habit logs.")

        # --- Health Logs (last 14 days) ---
        existing_health = db.execute(select(HealthLog).where(HealthLog.user_id == USER_ID)).scalars().all()
        if existing_health:
            print(f"Health logs already seeded ({len(existing_health)} exist). Skipping.")
        else:
            import random
            health_logs = []
            for day_offset in range(14):
                d = TODAY - timedelta(days=day_offset)
                health_logs.append(HealthLog(
                    user_id=USER_ID,
                    log_date=d,
                    sleep_minutes=random.randint(330, 480),  # 5.5h–8h
                    weight_kg=Decimal(str(round(random.uniform(81.5, 84.0), 1))),
                    calories=random.randint(1600, 2400),
                    protein_g=random.randint(80, 140),
                    steps=random.randint(3000, 12000),
                    energy=random.randint(4, 9),
                    mood=random.randint(4, 8),
                    notes={"symptoms": [] if random.random() > 0.3 else ["tired", "headache"]},
                ))
            db.add_all(health_logs)
            db.commit()
            print(f"Seeded {len(health_logs)} health logs.")

        # --- Money Transactions (last 30 days) ---
        existing_money = db.execute(
            select(MoneyTransaction).where(MoneyTransaction.user_id == USER_ID)
        ).scalars().all()
        if existing_money:
            print(f"Money transactions already seeded ({len(existing_money)} exist). Skipping.")
        else:
            import random
            txns = [
                # Income
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=1),
                                 amount=Decimal("3200.00"), category="salary",
                                 description="Monthly salary"),
                # Regular expenses
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=2),
                                 amount=Decimal("-45.00"), category="groceries",
                                 description="Weekly shop"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=3),
                                 amount=Decimal("-120.00"), category="utilities",
                                 description="Electric + gas"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=4),
                                 amount=Decimal("-850.00"), category="rent",
                                 description="Monthly rent"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=5),
                                 amount=Decimal("-12.99"), category="subscriptions",
                                 description="Spotify + iCloud"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=6),
                                 amount=Decimal("-35.00"), category="transport",
                                 description="Weekly travel card"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=7),
                                 amount=Decimal("-28.50"), category="groceries",
                                 description="Midweek top-up"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=8),
                                 amount=Decimal("-4.20"), category="ai_usage",
                                 description="Claude API — diary analysis"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=10),
                                 amount=Decimal("-500.00"), category="investment",
                                 description="Monthly S&P 500 ISA"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=12),
                                 amount=Decimal("-65.00"), category="health",
                                 description="Gym membership"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=15),
                                 amount=Decimal("-22.00"), category="food_out",
                                 description="Lunch with colleague"),
                MoneyTransaction(user_id=USER_ID, txn_date=TODAY - timedelta(days=20),
                                 amount=Decimal("-180.00"), category="renovation",
                                 description="Flat renovation materials"),
            ]
            db.add_all(txns)
            db.commit()
            print(f"Seeded {len(txns)} money transactions.")

        # --- Diary Entries ---
        existing_diary = db.execute(
            select(DiaryEntry).where(DiaryEntry.user_id == USER_ID)
        ).scalars().all()
        if existing_diary:
            print(f"Diary entries already seeded ({len(existing_diary)} exist). Skipping.")
        else:
            entries = [
                DiaryEntry(
                    user_id=USER_ID,
                    title="Feeling scattered",
                    body="Too many open projects. I keep jumping between the app, CS50, renovation, and random ideas. "
                         "Need to apply my own mission filter. The app isn't another project — it's THE project that "
                         "helps me manage everything else. Focus on that.",
                    mood="reflective",
                ),
                DiaryEntry(
                    user_id=USER_ID,
                    title="Good energy day",
                    body="Slept 7.5 hours. Woke early. Did 45 min of deep work on the app before anything else. "
                         "This is the pattern I want: sleep → early → deep work → walk → admin. "
                         "When I follow this, everything flows.",
                    mood="calm",
                ),
                DiaryEntry(
                    user_id=USER_ID,
                    title="Sadness wave",
                    body="Thought about the past again. Not a decision moment — just a wave. "
                         "Logged it, reduced plans for today, will review tomorrow. "
                         "This is exactly what the healing agent should say: don't act, just observe.",
                    mood="melancholy",
                    privacy_level="sensitive",
                ),
            ]
            db.add_all(entries)
            db.commit()
            print(f"Seeded {len(entries)} diary entries.")

        # --- Energy Logs (last 7 days, multiple per day) ---
        existing_energy = db.execute(
            select(EnergyLog).where(EnergyLog.user_id == USER_ID)
        ).scalars().all()
        if existing_energy:
            print(f"Energy logs already seeded ({len(existing_energy)} exist). Skipping.")
        else:
            import random
            energy_logs = []
            levels = ["low", "medium", "high"]
            for day_offset in range(7):
                # Morning energy
                morning = NOW.replace(hour=8, minute=0) - timedelta(days=day_offset)
                energy_logs.append(EnergyLog(
                    user_id=USER_ID, level=random.choice(["medium", "high"]),
                    logged_at=morning, notes="Morning check-in"
                ))
                # Afternoon
                afternoon = NOW.replace(hour=14, minute=0) - timedelta(days=day_offset)
                energy_logs.append(EnergyLog(
                    user_id=USER_ID, level=random.choice(levels),
                    logged_at=afternoon
                ))
                # Evening
                evening = NOW.replace(hour=20, minute=0) - timedelta(days=day_offset)
                energy_logs.append(EnergyLog(
                    user_id=USER_ID, level=random.choice(["low", "medium"]),
                    logged_at=evening
                ))
            db.add_all(energy_logs)
            db.commit()
            print(f"Seeded {len(energy_logs)} energy logs.")

        print("\n✓ Mock data seeding complete.")


if __name__ == "__main__":
    seed_mock()
