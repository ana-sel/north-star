from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import agents as agents_api
from app.api import approvals as approvals_api
from app.api import cards as cards_api
from app.api import gateway as gateway_api

app = FastAPI(
    title="North Star",
    description="Private AI-powered Personal Navigation OS — backend.",
    version="0.1.0",
)

# Dev-only CORS: Expo web preview runs on http://localhost:8081 (or :19006)
# while the API runs on :8000, so the browser blocks fetches without CORS.
# Auth lands later; for now allow any localhost origin.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(gateway_api.router)
app.include_router(approvals_api.router)
app.include_router(cards_api.router)
app.include_router(agents_api.router)

# Dev-only: serve the approval demo HTML at /static.
_static_dir = Path(__file__).resolve().parent.parent / "static"
if _static_dir.is_dir():
    app.mount("/static", StaticFiles(directory=str(_static_dir)), name="static")


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "app": "north-star"}
