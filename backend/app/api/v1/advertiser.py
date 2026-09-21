"""
Advertiser-only API endpoints.
All routes require a valid JWT with role == ADVERTISER.
Data is always scoped to the authenticated advertiser (owner_user_id).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy import or_
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.campaign import Campaign
from app.models.content import Content
from app.models.device import Device
from app.schemas.auth import UserResponse
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignResponse
from app.api.v1.auth import get_current_advertiser
from app.services.content_service import save_uploaded_media, delete_content
from app.services.assignment_engine import get_current_content
from app.services.websocket_manager import ws_manager
from app.services.device_service import invalidate_device_playlist_cache

router = APIRouter(prefix="/advertiser", tags=["Advertiser Portal"])


def sync_campaign_content(
    db: Session,
    campaign_name: str,
    media_url: Optional[str],
    description: Optional[str],
    user: User,
    zone_ids: Optional[str] = None,
    campaign_id: Optional[int] = None,
    priority: int = 5,
    is_active: bool = True,  # kept for API compat; content row is always active in the library
) -> None:
    """Ensure media asset is registered in the platform's Content Library for admin view with full zone targeting."""
    if not media_url:
        return
    advertiser_label = user.company_name or user.full_name or user.email
    title = f"[{advertiser_label}] {campaign_name}"
    tags = f"advertiser,{user.company_name or 'campaign'}"

    # Determine local storage path if applicable
    storage_key = None
    if media_url.startswith("/static/uploads/"):
        filename = os.path.basename(media_url)
        candidate_path = os.path.join(settings.UPLOAD_DIR, filename)
        if os.path.exists(candidate_path):
            storage_key = candidate_path

    # Determine media_type from URL extension
    ext = os.path.splitext(media_url)[1].lower() if "." in media_url else ""
    media_type_from_url = "video" if ext in [".mp4", ".mov", ".avi", ".webm", ".mkv"] else "image"

    # Look for existing content matching file_url, campaign_id, or title
    filter_conditions = [Content.file_url == media_url, Content.title == title]
    if campaign_id is not None:
        filter_conditions.append(Content.campaign_id == campaign_id)

    existing_items = db.query(Content).filter(or_(*filter_conditions)).all()

    if existing_items:
        for existing in existing_items:
            existing.title = title
            existing.tags = tags
            if zone_ids is not None:
                existing.zone_ids = zone_ids
            if campaign_id is not None:
                existing.campaign_id = campaign_id
            if storage_key and not existing.storage_key:
                existing.storage_key = storage_key
            if description:
                existing.description = description
            existing.priority = priority
            # Always keep content active in the library — campaign status gates
            # eligibility in the assignment engine; deactivating the Content row
            # would also hide it from the Admin Content page incorrectly.
            existing.is_active = True
            # Ensure media_type is correctly set (fix any mis-classified rows)
            if ext and not existing.media_type.startswith(media_type_from_url):
                existing.media_type = media_type_from_url
    else:
        new_content = Content(
            title=title,
            description=description or f"Campaign asset for {campaign_name} by {advertiser_label}",
            file_url=media_url,
            storage_key=storage_key,
            media_type=media_type_from_url,
            duration=15.0,
            tags=tags,
            zone_ids=zone_ids,
            campaign_id=campaign_id,
            priority=priority,
            is_active=True,  # always active in content library
        )
        db.add(new_content)
    db.commit()


# ─── Media Upload ─────────────────────────────────────────────────────────────

@router.post("/upload-media")
def upload_advertiser_media(
    file: UploadFile = File(...),
    campaign_name: Optional[str] = Form(None),
    zone_ids: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """
    Directly uploads media from an advertiser, storing it locally and
    registering it immediately in the Content Library with zone assignments for the admin portal.
    """
    file_url, storage_key, file_size, media_type = save_uploaded_media(file)
    advertiser_label = current_user.company_name or current_user.full_name or current_user.email
    title = f"[{advertiser_label}] {campaign_name or file.filename}"

    content = Content(
        title=title,
        description=f"Uploaded by advertiser {advertiser_label} ({current_user.email})",
        file_url=file_url,
        storage_key=storage_key,
        media_type=media_type,
        file_size=file_size,
        duration=15.0,
        tags=f"advertiser,{current_user.company_name or 'campaign'}",
        zone_ids=zone_ids,
    )
    db.add(content)
    db.commit()
    db.refresh(content)

    return {
        "file_url": file_url,
        "media_type": media_type,
        "content_id": content.id,
        "title": title,
    }


# ─── Profile ──────────────────────────────────────────────────────────────────

@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_advertiser)):
    """Return the authenticated advertiser's profile."""
    return current_user


# ─── Campaigns ────────────────────────────────────────────────────────────────

@router.get("/campaigns", response_model=List[CampaignResponse])
def list_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """
    List campaigns belonging to the authenticated advertiser (or all if admin).
    """
    if current_user.role == "ADMIN":
        return db.query(Campaign).all()
    return db.query(Campaign).filter(Campaign.owner_user_id == current_user.id).all()


@router.post("/campaigns", response_model=CampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_in: CampaignCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """
    Create a campaign. owner_user_id is ALWAYS derived from the JWT token —
    the frontend cannot override it.
    """
    campaign = Campaign(
        owner_user_id=current_user.id,   # ← always from token
        name=campaign_in.name,
        description=campaign_in.description,
        media_url=campaign_in.media_url,
        zone_ids=campaign_in.zone_ids,
        device_types=campaign_in.device_types,
        priority=campaign_in.priority if campaign_in.priority is not None else 5,
        start_date=campaign_in.start_date,
        end_date=campaign_in.end_date,
        status=campaign_in.status or "draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    if campaign.media_url:
        sync_campaign_content(
            db=db,
            campaign_name=campaign.name,
            media_url=campaign.media_url,
            description=campaign.description,
            user=current_user,
            zone_ids=campaign.zone_ids,
            campaign_id=campaign.id,
            priority=campaign.priority,
            is_active=(campaign.status == "active"),
        )

    invalidate_device_playlist_cache()
    # Broadcast real-time playlist updates to dashboard and affected devices
    try:
        await ws_manager.broadcast_to_dashboard({
            "event": "CONTENT_CHANGED",
            "type": "CAMPAIGN_CREATED",
            "campaign_id": campaign.id,
            "message": f"Campaign '{campaign.name}' created. Recalculating all zone playlists."
        })

        all_devices = db.query(Device).all()
        for dev in all_devices:
            assignment = get_current_content(db, dev)
            pl = assignment.get("playlist") or []
            await ws_manager.send_to_device(dev.device_id, {
                "event": "PLAYLIST_UPDATED",
                "type": "PLAYLIST_UPDATED",
                "device_id": dev.device_id,
                "zone_id": assignment.get("zone_id"),
                "zone_name": assignment.get("zone_name"),
                "slot_duration": assignment.get("slot_duration") or 3,
                "playlist": pl,
                "content_id": assignment.get("content_id"),
                "reason": "CAMPAIGN_CREATED"
            })
    except Exception as ws_err:
        print(f"[WebSocket Broadcast Warning on Campaign Create] {ws_err}")

    return campaign


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """Fetch a single campaign."""
    query = db.query(Campaign).filter(Campaign.id == campaign_id)
    if current_user.role != "ADMIN":
        query = query.filter(Campaign.owner_user_id == current_user.id)
    campaign = query.first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return campaign


@router.patch("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: int,
    updates: CampaignUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """Update a campaign."""
    query = db.query(Campaign).filter(Campaign.id == campaign_id)
    if current_user.role != "ADMIN":
        query = query.filter(Campaign.owner_user_id == current_user.id)
    campaign = query.first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(campaign)

    if campaign.media_url:
        sync_campaign_content(
            db=db,
            campaign_name=campaign.name,
            media_url=campaign.media_url,
            description=campaign.description,
            user=current_user,
            zone_ids=campaign.zone_ids,
            campaign_id=campaign.id,
            priority=campaign.priority,
            is_active=(campaign.status == "active"),
        )

    invalidate_device_playlist_cache()
    # Broadcast real-time playlist updates to dashboard and affected devices
    try:
        await ws_manager.broadcast_to_dashboard({
            "event": "CONTENT_CHANGED",
            "type": "CAMPAIGN_UPDATED",
            "campaign_id": campaign.id,
            "message": f"Campaign '{campaign.name}' updated. Recalculating all zone playlists."
        })

        all_devices = db.query(Device).all()
        for dev in all_devices:
            assignment = get_current_content(db, dev)
            pl = assignment.get("playlist") or []
            await ws_manager.send_to_device(dev.device_id, {
                "event": "PLAYLIST_UPDATED",
                "type": "PLAYLIST_UPDATED",
                "device_id": dev.device_id,
                "zone_id": assignment.get("zone_id"),
                "zone_name": assignment.get("zone_name"),
                "slot_duration": assignment.get("slot_duration") or 3,
                "playlist": pl,
                "content_id": assignment.get("content_id"),
                "reason": "CAMPAIGN_UPDATED"
            })
    except Exception as ws_err:
        print(f"[WebSocket Broadcast Warning on Campaign Update] {ws_err}")

    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """
    Delete a campaign — only if it belongs to the authenticated advertiser (or admin).
    Cascades deletion to the Content Library, cleans unshared media files, recalculates
    device playlists, and broadcasts real-time WebSocket invalidation events.
    """
    query = db.query(Campaign).filter(Campaign.id == campaign_id)
    if current_user.role != "ADMIN":
        query = query.filter(Campaign.owner_user_id == current_user.id)
    campaign = query.first()
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    advertiser_label = current_user.company_name or current_user.full_name or current_user.email
    content_title = f"[{advertiser_label}] {campaign.name}"

    # 1. Identify all associated Content records (by explicit campaign_id link, media_url, or advertiser title)
    content_query = [Content.campaign_id == campaign_id]
    if campaign.media_url:
        content_query.append(
            (Content.file_url == campaign.media_url) & 
            (Content.campaign_id.is_(None) | (Content.campaign_id == campaign_id))
        )
    if advertiser_label:
        content_query.append(Content.title == content_title)

    matching_contents = db.query(Content).filter(or_(*content_query)).all()
    matching_ids = [c.id for c in matching_contents]

    # 2. Safely clean up physical media file if not shared with other active campaigns/contents
    for c in matching_contents:
        file_url = c.file_url
        storage_key = c.storage_key

        shared_in_campaign = False
        shared_in_content = False
        if file_url:
            shared_in_campaign = db.query(Campaign).filter(
                Campaign.id != campaign_id,
                Campaign.media_url == file_url
            ).first() is not None

            shared_in_content = db.query(Content).filter(
                ~Content.id.in_(matching_ids),
                Content.file_url == file_url
            ).first() is not None

        if not shared_in_campaign and not shared_in_content:
            target_path = storage_key
            if not target_path and file_url and file_url.startswith("/static/uploads/"):
                filename = os.path.basename(file_url)
                cand = os.path.join(settings.UPLOAD_DIR, filename)
                if os.path.exists(cand):
                    target_path = cand

            if target_path and os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except OSError:
                    pass

        db.delete(c)

    # 3. Delete Campaign and commit transaction atomically
    db.delete(campaign)
    db.commit()

    invalidate_device_playlist_cache()

    # 4. If any device was pointing to a deleted content, recalculate its assignment
    if matching_ids:
        devices_affected = db.query(Device).filter(Device.active_content_id.in_(matching_ids)).all()
        for dev in devices_affected:
            assignment = get_current_content(db, dev)
            dev.active_content_id = assignment.get("content_id")
        if devices_affected:
            db.commit()

    # 5. Broadcast real-time WebSocket invalidations to dashboard and devices
    try:
        from app.services.websocket_manager import ws_manager
        await ws_manager.broadcast_to_dashboard({
            "event": "CONTENT_CHANGED",
            "type": "CAMPAIGN_DELETED",
            "campaign_id": campaign_id,
            "message": f"Campaign #{campaign_id} deleted. Recalculating all zone playlists."
        })

        all_devices = db.query(Device).all()
        for dev in all_devices:
            assignment = get_current_content(db, dev)
            await ws_manager.send_to_device(dev.device_id, {
                "event": "PLAYLIST_UPDATED",
                "type": "PLAYLIST_UPDATED",
                "device_id": dev.device_id,
                "zone_id": assignment.get("zone_id"),
                "zone_name": assignment.get("zone_name"),
                "slot_duration": assignment.get("slot_duration") or 3,
                "playlist": assignment.get("playlist") or [],
                "content_id": assignment.get("content_id"),
                "reason": "CAMPAIGN_DELETED"
            })
    except Exception as ws_err:
        print(f"[WebSocket Broadcast Warning on Campaign Delete] {ws_err}")


# ─── Dashboard stats ──────────────────────────────────────────────────────────

@router.get("/dashboard-stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_advertiser),
):
    """Aggregate campaign statistics for the advertiser dashboard."""
    if current_user.role == "ADMIN":
        campaigns = db.query(Campaign).all()
    else:
        campaigns = db.query(Campaign).filter(Campaign.owner_user_id == current_user.id).all()
    now = datetime.utcnow()

    total = len(campaigns)
    active = sum(1 for c in campaigns if c.status == "active")
    scheduled = sum(
        1 for c in campaigns
        if c.status in ("draft", "scheduled") and c.start_date and c.start_date > now
    )
    completed = sum(1 for c in campaigns if c.status == "completed")
    paused = sum(1 for c in campaigns if c.status == "paused")

    return {
        "total_campaigns": total,
        "active_campaigns": active,
        "scheduled_campaigns": scheduled,
        "completed_campaigns": completed,
        "paused_campaigns": paused,
    }
