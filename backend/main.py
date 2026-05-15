import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import analytics, billing, chat, dashboard, devices

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("voltstream")

app = FastAPI(title="VoltStream API", version="1.0")


async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code} {request.method} {request.url}")
    return response


def configure_middleware(api: FastAPI) -> None:
    api.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://voltstreamapp-12.web.app",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    api.middleware("http")(log_requests)


def register_routes(api: FastAPI) -> None:
    api.include_router(dashboard.router, prefix="/api/v1/dashboard")
    api.include_router(analytics.router, prefix="/api/v1/analytics")
    api.include_router(devices.router, prefix="/api/v1/devices")
    api.include_router(billing.router, prefix="/api/v1/billing")
    api.include_router(chat.router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
def root():
    return {"message": "VoltStream API is running"}


configure_middleware(app)
register_routes(app)
