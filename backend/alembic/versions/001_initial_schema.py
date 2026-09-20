"""Initial schema for GEOCAST

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.core.config import settings

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # 1. Users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('email', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('is_superuser', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 2. Contents table
    op.create_table(
        'contents',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('title', sa.String(length=255), nullable=False, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('file_url', sa.String(length=1024), nullable=False),
        sa.Column('storage_key', sa.String(length=512), nullable=True),
        sa.Column('media_type', sa.String(length=50), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('duration', sa.Float(), default=10.0),
        sa.Column('tags', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 3. Zones table
    op.create_table(
        'zones',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('zone_type', sa.String(length=50), default='circle', nullable=False),
        sa.Column('center_lat', sa.Float(), nullable=True),
        sa.Column('center_lon', sa.Float(), nullable=True),
        sa.Column('radius_meters', sa.Float(), nullable=True),
        sa.Column('coordinates_json', sa.Text(), nullable=True),
        sa.Column('geom', sa.Text(), nullable=True),
        sa.Column('assigned_content_id', sa.Integer(), sa.ForeignKey('contents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('color', sa.String(length=50), default='#3b82f6'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 4. Devices table
    op.create_table(
        'devices',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('device_id', sa.String(length=100), nullable=False, unique=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False, unique=True, index=True),
        sa.Column('current_lat', sa.Float(), nullable=True),
        sa.Column('current_lon', sa.Float(), nullable=True),
        sa.Column('current_zone_id', sa.Integer(), sa.ForeignKey('zones.id', ondelete='SET NULL'), nullable=True),
        sa.Column('override_content_id', sa.Integer(), sa.ForeignKey('contents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('default_content_id', sa.Integer(), sa.ForeignKey('contents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('active_content_id', sa.Integer(), sa.ForeignKey('contents.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(length=50), default='OFFLINE', index=True),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('refresh_interval', sa.Integer(), default=10),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 5. Schedules table
    op.create_table(
        'schedules',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('zone_id', sa.Integer(), sa.ForeignKey('zones.id', ondelete='CASCADE'), nullable=True),
        sa.Column('device_id', sa.Integer(), sa.ForeignKey('devices.id', ondelete='CASCADE'), nullable=True),
        sa.Column('content_id', sa.Integer(), sa.ForeignKey('contents.id', ondelete='CASCADE'), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.Column('priority', sa.Integer(), default=1),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now())
    )

    # 6. Logs table
    op.create_table(
        'logs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('device_id', sa.String(length=100), nullable=True, index=True),
        sa.Column('event_type', sa.String(length=100), nullable=False, index=True),
        sa.Column('details_json', sa.Text(), nullable=True),
        sa.Column('message', sa.String(length=500), nullable=True),
        sa.Column('timestamp', sa.DateTime(), server_default=sa.func.now(), index=True)
    )

def downgrade():
    op.drop_table('logs')
    op.drop_table('schedules')
    op.drop_table('devices')
    op.drop_table('zones')
    op.drop_table('contents')
    op.drop_table('users')
