export interface Case {
  id: string;
  caseNumber: string;
  plaintiff: string;
  plaintiffAnon?: string | null;
  defendant: string;
  jurisdiction: string;
  filedDate?: string | null;
  status: CaseStatus;
  causesOfAction?: string[] | null;
  caseFacts?: string | null;
  arweaveTxIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus =
  | 'intake'
  | 'research'
  | 'pleadings'
  | 'discovery'
  | 'motions'
  | 'trial'
  | 'appeal'
  | 'settled'
  | 'closed';

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  intake: 'Initial Intake',
  research: 'Research Phase',
  pleadings: 'Pleadings',
  discovery: 'Discovery',
  motions: 'Motion Practice',
  trial: 'Trial',
  appeal: 'Appeal',
  settled: 'Settled',
  closed: 'Closed',
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  intake: 'bg-blue-100 text-blue-800',
  research: 'bg-purple-100 text-purple-800',
  pleadings: 'bg-yellow-100 text-yellow-800',
  discovery: 'bg-orange-100 text-orange-800',
  motions: 'bg-pink-100 text-pink-800',
  trial: 'bg-red-100 text-red-800',
  appeal: 'bg-indigo-100 text-indigo-800',
  settled: 'bg-green-100 text-green-800',
  closed: 'bg-neutral-100 text-neutral-800',
};
