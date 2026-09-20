from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.content import Content
from app.schemas.content import ContentResponse, ContentUpdate
from app.services.content_service import create_content, update_content, delete_content

router = APIRouter(prefix="/content", tags=["Content Management"])

@router.get("", response_model=List[ContentResponse])
def list_contents(db: Session = Depends(get_db)):
    """List all uploaded images and videos"""
    return db.query(Content).order_by(Content.created_at.desc()).all()

@router.post("/upload", response_model=ContentResponse, status_code=status.HTTP_201_CREATED)
def upload_content(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    duration: float = Form(10.0),
    tags: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload image or video media file to the platform"""
    return create_content(
        db=db,
        title=title,
        description=description,
        file=file,
        duration=duration,
        tags=tags
    )

@router.get("/{content_id}", response_model=ContentResponse)
def get_content(content_id: int, db: Session = Depends(get_db)):
    content = db.query(Content).filter(Content.id == content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return content

@router.put("/{content_id}", response_model=ContentResponse)
def update_content_metadata(content_id: int, updates: ContentUpdate, db: Session = Depends(get_db)):
    content = update_content(db, content_id, updates)
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return content

@router.delete("/{content_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_content(content_id: int, db: Session = Depends(get_db)):
    success = delete_content(db, content_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found")
    return None
