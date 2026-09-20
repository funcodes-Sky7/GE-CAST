import os
from typing import List, Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "GEOCAST - Location-Aware Remote Content Management"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "geocast_jwt_secret_hackathon_2026_supersecure")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Database (PostgreSQL + PostGIS by default, SQLite fallback for local quick test)
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://geocast:geocast_pass@localhost:5432/geocast_db"
    )
    
    # Heartbeat & Monitoring
    DEVICE_OFFLINE_THRESHOLD_SECONDS: int = 40
    
    # Media Storage
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "local")  # "local" | "s3" | "supabase"
    UPLOAD_DIR: str = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
        "static", 
        "uploads"
    )
    
    # Optional S3 / Supabase config
    S3_BUCKET: Optional[str] = os.getenv("S3_BUCKET", None)
    S3_ENDPOINT: Optional[str] = os.getenv("S3_ENDPOINT", None)
    S3_ACCESS_KEY: Optional[str] = os.getenv("S3_ACCESS_KEY", None)
    S3_SECRET_KEY: Optional[str] = os.getenv("S3_SECRET_KEY", None)
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure static directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(os.path.join(os.path.dirname(settings.UPLOAD_DIR), "player"), exist_ok=True)
