import os
import shutil
import uuid
from typing import List, Optional, Tuple
from fastapi import UploadFile
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.content import Content
from app.schemas.content import ContentCreate, ContentUpdate

def save_uploaded_media(file: UploadFile) -> Tuple[str, str, int, str]:
    """
    Saves file to local upload directory (or pluggable S3/Supabase storage).
    Returns (file_url, storage_key, file_size, media_type)
    """
    ext = os.path.splitext(file.filename)[1].lower()
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(dest_path)
    
    # Determine media type
    if ext in [".mp4", ".mov", ".avi", ".webm", ".mkv"]:
        media_type = "video"
    else:
        media_type = "image"
        
    file_url = f"/static/uploads/{unique_filename}"
    return file_url, dest_path, file_size, media_type

def create_content(db: Session, title: str, description: Optional[str], file: UploadFile, duration: float = 10.0, tags: Optional[str] = None) -> Content:
    file_url, storage_key, file_size, media_type = save_uploaded_media(file)
    db_content = Content(
        title=title,
        description=description,
        file_url=file_url,
        storage_key=storage_key,
        media_type=media_type,
        file_size=file_size,
        duration=duration,
        tags=tags
    )
    db.add(db_content)
    db.commit()
    db.refresh(db_content)
    return db_content

def update_content(db: Session, content_id: int, updates: ContentUpdate) -> Optional[Content]:
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        return None
    for field, value in updates.dict(exclude_unset=True).items():
        setattr(content, field, value)
    db.commit()
    db.refresh(content)
    return content

def delete_content(db: Session, content_id: int) -> bool:
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        return False
    # If local file exists, remove it
    if content.storage_key and os.path.exists(content.storage_key):
        try:
            os.remove(content.storage_key)
        except OSError:
            pass
    db.delete(content)
    db.commit()
    return True
