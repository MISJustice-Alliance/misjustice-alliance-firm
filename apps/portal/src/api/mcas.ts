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

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1/mcas';

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

// --- Documents ---

export async function uploadDocument(matterId: string, file: File): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  form.append('classification', 'T2_INTERNAL');
  const res = await fetch(`${API_BASE}/matters/${matterId}/documents`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json() as Promise<Document>;
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

export async function listApprovals(): Promise<ApprovalItem[]> {
  return fetchJson<ApprovalItem[]>('/approvals');
}

export async function approveApproval(id: string): Promise<void> {
  await fetchJson<{ status: string; approval_id: string }>(`/approvals/${id}/approve`, {
    method: 'POST',
  });
}

export async function rejectApproval(id: string): Promise<void> {
  await fetchJson<{ status: string; approval_id: string }>(`/approvals/${id}/reject`, {
    method: 'POST',
  });
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
