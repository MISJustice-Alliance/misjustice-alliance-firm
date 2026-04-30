from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models import (
    ActorType,
    DocumentClassification,
    EventType,
    MatterClassification,
    MatterStatus,
)

# ---------- Actor ----------


class ActorBase(BaseModel):
    actor_type: ActorType
    pseudonym: str
    real_name_encrypted: bytes
    role_in_matter: str
    conflict_flags: list[str] = Field(default_factory=list)


class ActorCreate(ActorBase):
    pass


class ActorResponse(ActorBase):
    id: UUID
    matter_id: UUID

    class Config:
        from_attributes = True


# ---------- Document ----------


class DocumentBase(BaseModel):
    filename: str
    storage_key: str
    checksum_sha256: str
    classification: DocumentClassification
    ocr_text: str | None = ""
    extracted_entities: dict | None = Field(default_factory=lambda: {})
    redacted_version_key: str | None = None
    uploaded_by: UUID


class DocumentCreate(BaseModel):
    filename: str
    classification: DocumentClassification
    # file upload handled separately via multipart


class DocumentResponse(DocumentBase):
    id: UUID
    matter_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Event ----------


class EventBase(BaseModel):
    event_type: EventType
    actor_id: UUID | None = None
    agent_id: str | None = None
    description: str
    metadata: dict | None = Field(default_factory=lambda: {})


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: UUID
    matter_id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# ---------- AuditEntry ----------


class AuditEntryBase(BaseModel):
    action: str
    actor: str
    ip_address: str | None = None
    user_agent: str | None = None
    diff: dict | None = None


class AuditEntryResponse(AuditEntryBase):
    id: UUID
    matter_id: UUID
    timestamp: datetime

    class Config:
        from_attributes = True


# ---------- Matter ----------


class MatterBase(BaseModel):
    title: str
    classification: MatterClassification
    jurisdiction: str


class MatterCreate(MatterBase):
    pass


class MatterResponse(MatterBase):
    id: UUID
    display_id: str
    status: MatterStatus
    created_at: datetime
    updated_at: datetime
    actors: list[ActorResponse] = Field(default_factory=list)
    events: list[EventResponse] = Field(default_factory=list)
    documents: list[DocumentResponse] = Field(default_factory=list)
    audit_log: list[AuditEntryResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class MatterSummaryResponse(BaseModel):
    matter_id: UUID
    display_id: str

    class Config:
        from_attributes = True


# ---------- Search ----------


class SearchRequest(BaseModel):
    query: str
    backends: list[str] | None = Field(
        default=None,
        description="Backends to query: postgres, elasticsearch, qdrant, neo4j. Defaults to all configured.",
    )
    limit: int = Field(default=20, ge=1, le=100)
    # Legacy fields retained for backward compatibility
    tier: str | None = None
    matter_id: UUID | None = None
    filters: dict | None = Field(default_factory=lambda: {})


class SearchResultItem(BaseModel):
    type: str  # matter, document, event
    id: UUID
    title: str | None = None
    snippet: str | None = None
    score: float | None = None
    backend: str | None = None


class BackendMetadata(BaseModel):
    backend: str
    status: str  # ok, unavailable, error
    count: int = 0
    error: str | None = None
    latency_ms: float | None = None


class SearchResponse(BaseModel):
    results: list[SearchResultItem] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)
    confidence: float | None = None
    backends: list[BackendMetadata] = Field(default_factory=list)
    total: int = 0
