"""Initial migration for MCAS v0.1

Revision ID: 0001_initial
Revises: 
Create Date: 2026-04-22 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE SEQUENCE IF NOT EXISTS matter_display_id_seq START 1")

    op.create_table(
        "matters",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("display_id", sa.String(), nullable=False, unique=True),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("jurisdiction", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_matters_display_id", "matters", ["display_id"])

    op.create_table(
        "actors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("actor_type", sa.String(), nullable=False),
        sa.Column("pseudonym", sa.String(), nullable=False),
        sa.Column("real_name_encrypted", sa.LargeBinary(), nullable=False),
        sa.Column("role_in_matter", sa.String(), nullable=False),
        sa.Column("conflict_flags", postgresql.ARRAY(sa.String()), server_default="{}"),
    )
    op.create_index("ix_actors_matter_id", "actors", ["matter_id"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("storage_key", sa.String(), nullable=False),
        sa.Column("checksum_sha256", sa.String(), nullable=False),
        sa.Column("classification", sa.String(), nullable=False),
        sa.Column("ocr_text", sa.Text(), server_default=""),
        sa.Column("extracted_entities", postgresql.JSONB(), server_default="{}"),
        sa.Column("redacted_version_key", sa.String(), nullable=True),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_documents_matter_id", "documents", ["matter_id"])

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("event_type", sa.String(), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("agent_id", sa.String(), nullable=True),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), server_default="{}"),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
    )
    op.create_index("ix_events_matter_id", "events", ["matter_id"])

    op.create_table(
        "audit_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("matter_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("action", sa.String(), nullable=False),
        sa.Column("actor", sa.String(), nullable=False),
        sa.Column("ip_address", sa.String(), nullable=True),
        sa.Column("user_agent", sa.String(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        sa.Column("diff", postgresql.JSONB(), nullable=True),
    )
    op.create_index("ix_audit_entries_matter_id", "audit_entries", ["matter_id"])


def downgrade() -> None:
    op.drop_table("audit_entries")
    op.drop_table("events")
    op.drop_table("documents")
    op.drop_table("actors")
    op.drop_table("matters")
    op.execute("DROP SEQUENCE IF EXISTS matter_display_id_seq")
