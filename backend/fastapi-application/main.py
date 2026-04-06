import logging

import uvicorn
from api import router as api_router
from core.config import settings
from create_fastapi_app import create_app
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

logging.basicConfig(
    format=settings.logging.log_format,
)

main_app = create_app(create_custom_static_urls=True)

# ─── CORS ────────────────────────────────────────────────────────────────────
main_app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

main_app.include_router(api_router)
main_app.mount("/static", StaticFiles(directory="static"), name="static")


if __name__ == "__main__":
    uvicorn.run(
        "main:main_app",
        host=settings.run.host,
        port=settings.run.port,
        reload=True,
    )
