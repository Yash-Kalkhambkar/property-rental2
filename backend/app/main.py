from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.routers import (
    auth,
    properties,
    units,
    tenants,
    leases,
    payments,
    dashboard,
    internal,
    tenant_auth,
    tenant_data,
    chat,
)
from app.tasks.scheduler import start_scheduler

limiter = Limiter(key_func=get_remote_address)


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        start_scheduler()
        yield

    app = FastAPI(
        title="Property Rental Management API",
        version="1.0.0",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    allowed_origins = [settings.FRONTEND_URL]
    if settings.FRONTEND_URL_ALT:
        allowed_origins.append(settings.FRONTEND_URL_ALT)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    prefix = "/api/v1"
    app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["Auth"])
    app.include_router(
        properties.router, prefix=f"{prefix}/properties", tags=["Properties"]
    )
    app.include_router(units.router, prefix=f"{prefix}/units", tags=["Units"])
    app.include_router(
        tenants.router, prefix=f"{prefix}/tenants", tags=["Tenants"]
    )
    app.include_router(
        leases.router, prefix=f"{prefix}/leases", tags=["Leases"]
    )
    app.include_router(
        payments.router, prefix=f"{prefix}/payments", tags=["Payments"]
    )
    app.include_router(
        dashboard.router, prefix=f"{prefix}/dashboard", tags=["Dashboard"]
    )
    app.include_router(
        internal.router, prefix=f"{prefix}/internal", tags=["Internal"]
    )
    app.include_router(
        tenant_auth.router,
        prefix=f"{prefix}/auth/tenant",
        tags=["Tenant Auth"],
    )
    app.include_router(
        tenant_data.router,
        prefix=f"{prefix}/tenant",
        tags=["Tenant Data"],
    )
    app.include_router(
        chat.router,
        prefix=f"{prefix}/chat",
        tags=["AI Chat"],
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    return app


app = create_app()
