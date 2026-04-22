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

// In-memory mock store
let matters: Matter[] = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    display_id: 'MA-2026-0001',
    title: 'Missoula County Detention Conditions Review',
    classification: 'T1_PRIVILEGED',
    status: 'RESEARCH',
    jurisdiction: 'MT',
    created_at: '2026-04-10T08:30:00Z',
    updated_at: '2026-04-20T14:22:00Z',
    actors: [
      {
        id: 'actor-1',
        matter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        actor_type: 'CLIENT',
        pseudonym: 'Complainant-Alpha',
        role_in_matter: 'Detainee',
        conflict_flags: [],
      },
    ],
    events: [
      {
        id: 'evt-1',
        matter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        event_type: 'INTAKE',
        actor_id: null,
        agent_id: 'Avery',
        description: 'Intake completed via encrypted channel',
        metadata: { channel: 'Proton' },
        timestamp: '2026-04-10T08:30:00Z',
      },
      {
        id: 'evt-2',
        matter_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        event_type: 'RESEARCH',
        actor_id: null,
        agent_id: 'Rae',
        description: 'Statute and case law research initiated',
        metadata: {},
        timestamp: '2026-04-12T09:15:00Z',
      },
    ],
    documents: [],
    audit_log: [],
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    display_id: 'MA-2026-0002',
    title: 'Flathead Valley Pattern-of-Practice Inquiry',
    classification: 'T2_INTERNAL',
    status: 'INTAKE',
    jurisdiction: 'MT',
    created_at: '2026-04-15T11:00:00Z',
    updated_at: '2026-04-15T11:00:00Z',
    actors: [
      {
        id: 'actor-2',
        matter_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        actor_type: 'WITNESS',
        pseudonym: 'Witness-Bravo',
        role_in_matter: 'Former corrections officer',
        conflict_flags: [],
      },
    ],
    events: [
      {
        id: 'evt-3',
        matter_id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
        event_type: 'INTAKE',
        actor_id: null,
        agent_id: 'Avery',
        description: 'Anonymous intake form submitted',
        metadata: { source: 'web_portal' },
        timestamp: '2026-04-15T11:00:00Z',
      },
    ],
    documents: [],
    audit_log: [],
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    display_id: 'MA-2026-0003',
    title: 'Federal PREA Compliance Audit — District 9',
    classification: 'T0_PUBLIC',
    status: 'ADVOCACY',
    jurisdiction: 'FEDERAL',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-04-18T16:45:00Z',
    actors: [
      {
        id: 'actor-3',
        matter_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        actor_type: 'ORGANIZATION',
        pseudonym: 'Org-Charlie',
        role_in_matter: 'Oversight body',
        conflict_flags: [],
      },
    ],
    events: [
      {
        id: 'evt-4',
        matter_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        event_type: 'INTAKE',
        actor_id: null,
        agent_id: 'Avery',
        description: 'Public records request filed',
        metadata: {},
        timestamp: '2026-03-01T10:00:00Z',
      },
      {
        id: 'evt-5',
        matter_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        event_type: 'RESEARCH',
        actor_id: null,
        agent_id: 'Rae',
        description: 'Case law and regulatory research completed',
        metadata: {},
        timestamp: '2026-03-05T14:20:00Z',
      },
      {
        id: 'evt-6',
        matter_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
        event_type: 'PUBLICATION',
        actor_id: null,
        agent_id: 'Webmaster',
        description: 'Findings staged for publication',
        metadata: {},
        timestamp: '2026-04-18T16:45:00Z',
      },
    ],
    documents: [],
    audit_log: [],
  },
  {
    id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
    display_id: 'MA-2026-0004',
    title: 'Lewis & Clark County Use-of-Force Review',
    classification: 'T1_PRIVILEGED',
    status: 'DRAFTING',
    jurisdiction: 'MT',
    created_at: '2026-04-05T09:20:00Z',
    updated_at: '2026-04-19T13:10:00Z',
    actors: [
      {
        id: 'actor-4',
        matter_id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        actor_type: 'CLIENT',
        pseudonym: 'Complainant-Delta',
        role_in_matter: 'Plaintiff',
        conflict_flags: [],
      },
    ],
    events: [
      {
        id: 'evt-7',
        matter_id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        event_type: 'INTAKE',
        actor_id: null,
        agent_id: 'Avery',
        description: 'Telephonic intake transcribed by Mira',
        metadata: {},
        timestamp: '2026-04-05T09:20:00Z',
      },
      {
        id: 'evt-8',
        matter_id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
        event_type: 'DRAFT',
        actor_id: null,
        agent_id: 'Quill',
        description: 'Motion for summary judgment drafted',
        metadata: { version: 'v1' },
        timestamp: '2026-04-19T13:10:00Z',
      },
    ],
    documents: [],
    audit_log: [],
  },
  {
    id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
    display_id: 'MA-2026-0005',
    title: 'Infrastructure Security Policy Review',
    classification: 'T3_ADMIN',
    status: 'REVIEW',
    jurisdiction: 'FEDERAL',
    created_at: '2026-04-20T08:00:00Z',
    updated_at: '2026-04-20T08:00:00Z',
    actors: [],
    events: [
      {
        id: 'evt-9',
        matter_id: 'e5f6a7b8-c9d0-1234-efab-345678901234',
        event_type: 'INTAKE',
        actor_id: null,
        agent_id: 'Sol',
        description: 'Annual policy review initiated',
        metadata: {},
        timestamp: '2026-04-20T08:00:00Z',
      },
    ],
    documents: [],
    audit_log: [],
  },
];

let approvals: ApprovalItem[] = [
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

let nextMatterSeq = 6;
// nextApprovalSeq reserved for future mock expansion

function generateDisplayId(): string {
  const seq = String(nextMatterSeq++).padStart(4, '0');
  return `MA-2026-${seq}`;
}

function generateUUID(): string {
  return crypto.randomUUID();
}

// Simulated network delay
const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

export const mcasApi = {
  async listMatters(): Promise<Matter[]> {
    await delay();
    return matters.map((m) => ({
      ...m,
      actors: [...m.actors],
      events: [...m.events],
      documents: [...m.documents],
      audit_log: [...m.audit_log],
    }));
  },

  async getMatter(id: string): Promise<Matter | null> {
    await delay();
    const m = matters.find((x) => x.id === id);
    return m ? { ...m } : null;
  },

  async createMatter(req: CreateMatterRequest): Promise<CreateMatterResponse> {
    await delay(500);
    const matter: Matter = {
      id: generateUUID(),
      display_id: generateDisplayId(),
      title: req.title,
      classification: req.classification,
      status: 'INTAKE',
      jurisdiction: req.jurisdiction,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      actors: [],
      events: [
        {
          id: `evt-${generateUUID()}`,
          matter_id: '',
          event_type: 'INTAKE',
          actor_id: null,
          agent_id: 'Avery',
          description: 'Matter created via anonymous intake portal',
          metadata: { source: 'portal' },
          timestamp: new Date().toISOString(),
        },
      ],
      documents: [],
      audit_log: [],
    };
    matter.events[0].matter_id = matter.id;
    matters.unshift(matter);
    return { matter_id: matter.id, display_id: matter.display_id };
  },

  async createEvent(matterId: string, req: CreateEventRequest): Promise<CreateEventResponse> {
    await delay();
    const matter = matters.find((m) => m.id === matterId);
    if (!matter) throw new Error('Matter not found');
    const event = {
      id: `evt-${generateUUID()}`,
      matter_id: matterId,
      event_type: req.event_type,
      actor_id: null,
      agent_id: 'Operator',
      description: req.description,
      metadata: req.metadata ?? {},
      timestamp: new Date().toISOString(),
    };
    matter.events.push(event);
    matter.updated_at = new Date().toISOString();
    return { event_id: event.id };
  },

  async getAuditLog(matterId: string): Promise<AuditEntry[]> {
    await delay();
    const matter = matters.find((m) => m.id === matterId);
    return matter ? [...matter.audit_log] : [];
  },

  async search(req: SearchRequest): Promise<SearchResponse> {
    await delay(600);
    return {
      results: [
        { title: `Mock result for "${req.query}"`, snippet: 'Lorem ipsum dolor sit amet.' },
      ],
      sources: ['CourtListener', 'CAP'],
      confidence: 0.87,
    };
  },

  // Approval inbox (HITL)
  async listApprovals(): Promise<ApprovalItem[]> {
    await delay();
    return [...approvals];
  },

  async approveApproval(id: string): Promise<void> {
    await delay(300);
    const item = approvals.find((a) => a.id === id);
    if (item) item.status = 'APPROVED';
  },

  async rejectApproval(id: string): Promise<void> {
    await delay(300);
    const item = approvals.find((a) => a.id === id);
    if (item) item.status = 'REJECTED';
  },
};
