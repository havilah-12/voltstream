import os
os.environ["ANONYMIZED_TELEMETRY"] = "False"

import logging
import asyncio
from contextlib import asynccontextmanager

from database.db import initialize_database
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from routers import device_agent, analytics, billing, chat, dashboard, devices, orchestrator_agent

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("voltstream")

# Completely remove ChromaDB telemetry module from running
os.environ["CHROMA_TELEMETRY_IMPL"] = "chromadb.telemetry.product.null.NullTelemetry"


@asynccontextmanager
async def lifespan(api: FastAPI):
    try:
        logger.info("Initializing database...")
        await asyncio.wait_for(initialize_database(), timeout=15.0)
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database during startup: {e}")
    yield


app = FastAPI(title="VoltStream API", version="1.0", lifespan=lifespan)


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
            "http://localhost:3000",
            "http://127.0.0.1:3000",
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
    api.include_router(chat.router, prefix="/api/v1/aibot")
    api.include_router(device_agent.router, prefix="/api/v1/agent")
    api.include_router(orchestrator_agent.router, prefix="/api/v1/multi_agent")


@app.get("/", include_in_schema=False)
def root():
    return {"message": "VoltStream API is running"}


def configure_tracing(api: FastAPI) -> None:
    resource = Resource.create(attributes={
        "service.name": "voltstream-backend"
    })
    provider = TracerProvider(resource=resource)
    
    if os.getenv("ENABLE_TRACING", "false").lower() == "true":
        processor = BatchSpanProcessor(OTLPSpanExporter())
        provider.add_span_processor(processor)
        
    trace.set_tracer_provider(provider)
    
    FastAPIInstrumentor.instrument_app(api)


configure_middleware(app)
register_routes(app)
configure_tracing(app)
