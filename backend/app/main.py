import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, WasteRecord, PickupRequest, CollectorLocation
from app.services.seed import seed_database
from app.routers import (
    auth_router,
    waste_router,
    pickups_router,
    admin_router,
    collector_router,
    history_router,
    location_router,
    analytics_router,
    ml_router,
    ws_router,
    routes_router,
    audit_router
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Ensure DB schema exists
    print("[Startup] Initializing SQLite database tables...")
    Base.metadata.create_all(bind=engine)
    
    # 2. Seed Admin & initial demo data
    db = SessionLocal()
    try:
        seed_database(db)
    except Exception as e:
        print(f"[Startup Error] Seeding error: {e}")
    finally:
        db.close()
        
    print("[Startup] Smart Medical-Waste Collection System backend is ready.")
    yield
    print("[Shutdown] Backend shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack Smart Medical Waste Management & ML Pickup Priority System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]
if "*" not in origins:
    origins.extend(["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In academic/local environment, allow all origins for seamless client connection
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers under /api
app.include_router(auth_router, prefix="/api")
app.include_router(waste_router, prefix="/api")
app.include_router(pickups_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(collector_router, prefix="/api")
app.include_router(history_router, prefix="/api")
app.include_router(location_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(routes_router, prefix="/api")
app.include_router(audit_router, prefix="/api")
app.include_router(ws_router) # WebSocket at /ws/location/{pickup_id}

@app.get("/")
def root():
    return {
        "system": "Smart Medical-Waste Collection System API",
        "status": "Healthy & Operational",
        "version": "1.0.0",
        "docs": "/docs"
    }
