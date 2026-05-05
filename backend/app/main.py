from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import approvals as approvals_api
from app.api import gateway as gateway_api

app = FastAPI(
    title="North Star",
    description="Private AI-powered Personal Navigation OS — backend.",
    version="0.1.0",
)

app.include_router(gateway_api.router)
app.include_router(approvals_api.router)

# Dev-only: serve the approval demo HTML at /static.
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": "north-star"}
