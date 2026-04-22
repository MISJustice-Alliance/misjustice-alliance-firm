from datetime import datetime
from typing import List, Optional, Any
from uuid import UUID
from pydantic import BaseModel, Field

from app.models import (
    MatterClassification,
    MatterStatus,
    ActorType,
    DocumentClassification,
    EventType,
)


# ---------- Actor ----------

class ActorBase(BaseModel):
    actor_type: ActorType
    pseudonym: str
    real_name_encrypted: bytes
    role_in_matter: str
    conflict_flags: List[str] = Field(default_factory=list)


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
    ocr_text: Optional[str] = ""
    extracted_entities: Optional[dict] = Field(default_factory=dict)
    redacted_version_key: Optional[str] = None
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
    actor_id: Optional[UUID] = None
    agent_id: Optional[str] = None
    description: str
    metadata: Optional[dict] = Field(default_factory=dict)


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
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    diff: Optional[dict] = None


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
    actors: List[ActorResponse] = Field(default_factory=list)
    events: List[EventResponse] = Field(default_factory=list)
    documents: List[DocumentResponse] = Field(default_factory=list)
    audit_log: List[AuditEntryResponse] = Field(default_factory=list)

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
    tier: Optional[str] = None
    matter_id: Optional[UUID] = None
    filters: Optional[dict] = Field(default_factory=dict)


class SearchResultItem(BaseModel):
    type: str  # matter, document, event
    id: UUID
    title: Optional[str] = None
    snippet: Optional[str] = None
    score: Optional[float] = None


class SearchResponse(BaseModel):
    results: List[SearchResultItem] = Field(default_factory=list)
    sources: List[str] = Field(default_factory=list)
    confidence: Optional[float] = None
