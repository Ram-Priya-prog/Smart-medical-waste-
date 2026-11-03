import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Medical-Waste Collection System"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./medical_waste.db")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-smart-medical-waste-jwt-key-change-in-prod-2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    
    # ML paths
    ML_MODEL_PATH: str = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "model", "pickup_delay_risk_model.joblib")
    ML_LEGACY_MODEL_PATH: str = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "model", "pickup_priority_model.joblib")
    ML_METRICS_PATH: str = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "model", "metrics.json")
    
    class Config:
        case_sensitive = True

settings = Settings()
