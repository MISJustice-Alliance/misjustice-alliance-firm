import type {
  Matter,
  CreateMatterRequest,
  CreateMatterResponse,
  CreateEventRequest,
  CreateEventResponse,
  AuditEntry,
  SearchRequest,
  SearchResponse,
  ApprovalItem,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// --- Matters ---

export async function listMatters(): Promise<Matter[]> {
  // The backend currently returns summaries for list; fetch full details per matter.
  const summaries = await fetchJson<Array<{ matter_id: string; display_id: string }>>('/matters');
  // Parallel fetch full matter details for the dashboard
  const matters = await Promise.all(
    summaries.map((s) => fetchJson<Matter>(`/matters/${s.matter_id}`))
  );
  return matters;
}

export async function getMatter(id: string): Promise<Matter | null> {
  try {
    return await fetchJson<Matter>(`/matters/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('HTTP 404')) return null;
    throw err;
  }
}

export async function createMatter(req: CreateMatterRequest): Promise<CreateMatterResponse> {
  return fetchJson<CreateMatterResponse>('/matters', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// --- Events ---

export async function createEvent(matterId: string, req: CreateEventRequest): Promise<CreateEventResponse> {
  return fetchJson<CreateEventResponse>(`/matters/${matterId}/events`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// --- Audit ---

export async function getAuditLog(matterId: string): Promise<AuditEntry[]> {
  return fetchJson<AuditEntry[]>(`/matters/${matterId}/audit`);
}

// --- Search ---

export async function search(req: SearchRequest): Promise<SearchResponse> {
  return fetchJson<SearchResponse>('/search', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// --- Approval inbox (HITL) ---
// TODO: backend HITL endpoints not yet implemented; keep mock data for now.

const mockApprovals: ApprovalItem[] = [
  {
    id: 'app-1',
    matter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    matter_display_id: 'MA-2026-0001',
    matter_title: 'Missoula County Detention Conditions Review',
    gate_type: 'RESEARCH',
    summary: 'Rae requests authorization to expand research scope to include federal § 1983 precedents.',
    requested_by: 'Rae',
    created_at: '2026-04-20T10:00:00Z',
    deadline: '2026-04-22T17:00:00Z',
    status: 'PENDING',
  },
  {
    id: 'app-2',
    matter_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    matter_display_id: 'MA-2026-0002',
    matter_title: 'Flathead Valley Pattern-of-Practice Inquiry',
    gate_type: 'INTAKE',
    summary: 'Avery proposes Tier-2 classification. Review evidence hash and confirm intake acceptance.',
    requested_by: 'Avery',
    created_at: '2026-04-19T14:30:00Z',
    status: 'PENDING',
  },
  {
    id: 'app-3',
    matter_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    matter_display_id: 'MA-2026-0003',
    matter_title: 'Federal PREA Compliance Audit — District 9',
    gate_type: 'PUBLICATION',
    summary: 'Webmaster has staged findings for publication. Approve final text, redaction, and indexing.',
    requested_by: 'Webmaster',
    created_at: '2026-04-18T16:45:00Z',
    deadline: '2026-04-21T12:00:00Z',
    status: 'PENDING',
  },
  {
    id: 'app-4',
    matter_id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    matter_display_id: 'MA-2026-0004',
    matter_title: 'Lewis & Clark County Use-of-Force Review',
    gate_type: 'DRAFT',
    summary: 'Quill has completed motion draft v1. Lex flags pattern-of-practice for senior review.',
    requested_by: 'Lex',
    created_at: '2026-04-19T15:00:00Z',
    status: 'PENDING',
  },
  {
    id: 'app-5',
    matter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    matter_display_id: 'MA-2026-0001',
    matter_title: 'Missoula County Detention Conditions Review',
    gate_type: 'REFERRAL',
    summary: 'Casey has assembled referral packet for external counsel review. Authorize transmission?',
    requested_by: 'Casey',
    created_at: '2026-04-17T09:00:00Z',
    deadline: '2026-04-23T17:00:00Z',
    status: 'APPROVED',
  },
];

export async function listApprovals(): Promise<ApprovalItem[]> {
  // Simulate network delay
  await new Promise((r) => setTimeout(r, 300));
  return [...mockApprovals];
}

export async function approveApproval(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  const item = mockApprovals.find((a) => a.id === id);
  if (item) item.status = 'APPROVED';
}

export async function rejectApproval(id: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));
  const item = mockApprovals.find((a) => a.id === id);
  if (item) item.status = 'REJECTED';
}

// Backwards-compatible namespace export used by pages
export const mcasApi = {
  listMatters,
  getMatter,
  createMatter,
  createEvent,
  getAuditLog,
  search,
  listApprovals,
  approveApproval,
  rejectApproval,
};
