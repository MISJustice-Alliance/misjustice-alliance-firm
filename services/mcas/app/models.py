import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    LargeBinary,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MatterClassification(enum.StrEnum):
    T0_PUBLIC = "T0_PUBLIC"
    T1_PRIVILEGED = "T1_PRIVILEGED"
    T2_INTERNAL = "T2_INTERNAL"
    T3_ADMIN = "T3_ADMIN"


class MatterStatus(enum.StrEnum):
    INTAKE = "INTAKE"
    RESEARCH = "RESEARCH"
    DRAFTING = "DRAFTING"
    REVIEW = "REVIEW"
    ADVOCACY = "ADVOCACY"
    CLOSED = "CLOSED"


class ActorType(enum.StrEnum):
    CLIENT = "CLIENT"
    ATTORNEY = "ATTORNEY"
    WITNESS = "WITNESS"
    OFFICER = "OFFICER"
    JUDGE = "JUDGE"
    ORGANIZATION = "ORGANIZATION"


class DocumentClassification(enum.StrEnum):
    T0 = "T0"
    T1 = "T1"
    T2 = "T2"
    T3 = "T3"


class EventType(enum.StrEnum):
    INTAKE = "INTAKE"
    RESEARCH = "RESEARCH"
    DRAFT = "DRAFT"
    REVIEW = "REVIEW"
    PUBLICATION = "PUBLICATION"
    ESCALATION = "ESCALATION"


class Matter(Base):
    __tablename__ = "matters"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    display_id = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    classification = Column(String, nullable=False)
    status = Column(String, nullable=False, default=MatterStatus.INTAKE.value)
    jurisdiction = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    actors = relationship("Actor", back_populates="matter", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="matter", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="matter", cascade="all, delete-orphan")
    audit_log = relationship("AuditEntry", back_populates="matter", cascade="all, delete-orphan")


class Actor(Base):
    __tablename__ = "actors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id = Column(UUID(as_uuid=True), ForeignKey("matters.id"), nullable=False, index=True)
    actor_type = Column(String, nullable=False)
    pseudonym = Column(String, nullable=False)
    real_name_encrypted = Column(LargeBinary, nullable=False)
    role_in_matter = Column(String, nullable=False)
    conflict_flags = Column(ARRAY(String), default=list)

    matter = relationship("Matter", back_populates="actors")


class Document(Base):
    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id = Column(UUID(as_uuid=True), ForeignKey("matters.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)
    checksum_sha256 = Column(String, nullable=False)
    classification = Column(String, nullable=False)
    ocr_text = Column(Text, default="")
    extracted_entities = Column(JSONB, default=dict)
    redacted_version_key = Column(String, nullable=True)
    uploaded_by = Column(UUID(as_uuid=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    matter = relationship("Matter", back_populates="documents")


class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id = Column(UUID(as_uuid=True), ForeignKey("matters.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    actor_id = Column(UUID(as_uuid=True), nullable=True)
    agent_id = Column(String, nullable=True)
    description = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB, default=dict)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    matter = relationship("Matter", back_populates="events")


class AuditEntry(Base):
    __tablename__ = "audit_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    matter_id = Column(UUID(as_uuid=True), ForeignKey("matters.id"), nullable=False, index=True)
    action = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    diff = Column(JSONB, nullable=True)

    matter = relationship("Matter", back_populates="audit_log")
