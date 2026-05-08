import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import dashboard, analytics, devices, billing

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("voltstream")

app = FastAPI(title="VoltStream API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code} {request.method} {request.url}")
    return response

app.include_router(dashboard.router, prefix="/api/v1/dashboard")
app.include_router(analytics.router, prefix="/api/v1/analytics")
app.include_router(devices.router, prefix="/api/v1/devices")
app.include_router(billing.router, prefix="/api/v1/billing")

@app.get("/")
def root():
    return {"message": "VoltStream API is running"}
