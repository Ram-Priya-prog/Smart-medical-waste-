from app.routers.auth import router as auth_router
from app.routers.waste import router as waste_router
from app.routers.pickups import router as pickups_router
from app.routers.admin import router as admin_router
from app.routers.collector import router as collector_router
from app.routers.history import router as history_router
from app.routers.location import router as location_router
from app.routers.analytics import router as analytics_router
from app.routers.ml_router import router as ml_router
from app.routers.ws import router as ws_router
from app.routers.routes import router as routes_router
from app.routers.audit import router as audit_router

__all__ = [
    "auth_router",
    "waste_router",
    "pickups_router",
    "admin_router",
    "collector_router",
    "history_router",
    "location_router",
    "analytics_router",
    "ml_router",
    "ws_router",
    "routes_router",
    "audit_router",
]
