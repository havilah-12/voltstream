import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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

static_dir = Path(__file__).parent / "static"

@app.get("/")
def root():
    index_file = static_dir / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"message": "VoltStream API is running"}

if static_dir.exists():
    assets_dir = static_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        requested_file = static_dir / full_path
        if requested_file.is_file():
            return FileResponse(requested_file)
        return FileResponse(static_dir / "index.html")
