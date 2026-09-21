"""Add advertiser role columns and campaigns table

Revision ID: 002
Revises: 001
Create Date: 2026-09-20
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── users table additions ───────────────────────────────────────────────
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("role", sa.String(length=20), nullable=False, server_default="ADMIN"))
        batch_op.add_column(sa.Column("company_name", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("phone", sa.String(length=50), nullable=True))

    # ── campaigns table ─────────────────────────────────────────────────────
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("owner_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("media_url", sa.String(length=500), nullable=True),
        sa.Column("zone_ids", sa.Text(), nullable=True),
        sa.Column("start_date", sa.DateTime(), nullable=True),
        sa.Column("end_date", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("campaigns")
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_column("role")
        batch_op.drop_column("company_name")
        batch_op.drop_column("phone")
