import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Safely handle GeoAlchemy2 on SQLite when SpatiaLite C-library is not loaded
try:
    import geoalchemy2.admin.dialects.sqlite as sqlite_admin
    _original_sqlite_after_create = sqlite_admin.after_create
    def _safe_sqlite_after_create(table, bind, **kw):
        try:
            _original_sqlite_after_create(table, bind, **kw)
        except Exception:
            # Silently pass if SpatiaLite extension is not loaded in SQLite
            pass
    sqlite_admin.after_create = _safe_sqlite_after_create
except Exception:
    pass

is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False, "timeout": 30.0} if is_sqlite else {}

if is_sqlite:
    from sqlalchemy.pool import NullPool
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args=connect_args,
        poolclass=NullPool,
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=20,
        max_overflow=40,
    )


if is_sqlite:
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


Base = declarative_base()

def get_db():
    """FastAPI Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
