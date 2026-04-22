export type Classification = 'T0_PUBLIC' | 'T1_PRIVILEGED' | 'T2_INTERNAL' | 'T3_ADMIN';
export type MatterStatus = 'INTAKE' | 'RESEARCH' | 'DRAFTING' | 'REVIEW' | 'ADVOCACY' | 'CLOSED';
export type ActorType = 'CLIENT' | 'ATTORNEY' | 'WITNESS' | 'OFFICER' | 'JUDGE' | 'ORGANIZATION';
export type EventType = 'INTAKE' | 'RESEARCH' | 'DRAFT' | 'REVIEW' | 'PUBLICATION' | 'ESCALATION';

export interface Actor {
  id: string;
  matter_id: string;
  actor_type: ActorType;
  pseudonym: string;
  role_in_matter: string;
  conflict_flags: string[];
}

export interface Document {
  id: string;
  matter_id: string;
  filename: string;
  storage_key: string;
  checksum_sha256: string;
  classification: Classification;
  ocr_text: string;
  extracted_entities: Record<string, unknown>;
  redacted_version_key: string | null;
  uploaded_by: string;
  created_at: string;
}

export interface Event {
  id: string;
  matter_id: string;
  event_type: EventType;
  actor_id: string | null;
  agent_id: string | null;
  description: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  matter_id: string;
  action: string;
  actor: string;
  ip_address: string | null;
  user_agent: string | null;
  timestamp: string;
  diff: Record<string, unknown> | null;
}

export interface Matter {
  id: string;
  display_id: string;
  title: string;
  classification: Classification;
  status: MatterStatus;
  jurisdiction: string;
  created_at: string;
  updated_at: string;
  actors: Actor[];
  events: Event[];
  documents: Document[];
  audit_log: AuditEntry[];
}

export interface CreateMatterRequest {
  title: string;
  classification: Classification;
  jurisdiction: string;
}

export interface CreateMatterResponse {
  matter_id: string;
  display_id: string;
}

export interface CreateEventRequest {
  event_type: EventType;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface CreateEventResponse {
  event_id: string;
}

export interface SearchRequest {
  query: string;
  tier: Classification;
  matter_id?: string;
  filters?: Record<string, unknown>;
}

export interface SearchResponse {
  results: Array<Record<string, unknown>>;
  sources: string[];
  confidence: number;
}

export interface ApprovalItem {
  id: string;
  matter_id: string;
  matter_display_id: string;
  matter_title: string;
  gate_type: 'INTAKE' | 'RESEARCH' | 'DRAFT' | 'PUBLICATION' | 'REFERRAL' | 'SOCIAL';
  summary: string;
  requested_by: string;
  created_at: string;
  deadline?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}
