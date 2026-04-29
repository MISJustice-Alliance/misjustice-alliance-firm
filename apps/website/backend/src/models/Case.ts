/**
 * Case Model
 * TypeScript interfaces and types for legal case records
 */

/**
 * Case status enumeration
 * Represents the current stage of a legal case
 */
export enum CaseStatus {
  INTAKE = 'intake',
  RESEARCH = 'research',
  PLEADINGS = 'pleadings',
  FILED = 'filed',
  DISCOVERY = 'discovery',
  MOTIONS = 'motions',
  TRIAL = 'trial',
  APPEAL = 'appeal',
  SETTLED = 'settled',
  CLOSED = 'closed',
}

/**
 * Main Case interface
 * Represents a legal case in the system
 */
export interface Case {
  id: string;
  caseNumber: string;
  plaintiff: string;
  plaintiffAnon: string | null;
  defendant: string;
  jurisdiction: string;
  filedDate: Date | null;
  status: CaseStatus;
  causesOfAction: string[];
  caseFacts: string | null;
  arweaveTxIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for creating a new case
 */
export interface CreateCaseDTO {
  caseNumber: string;
  plaintiff: string;
  plaintiffAnon?: string;
  defendant: string;
  jurisdiction: string;
  filedDate?: Date;
  status?: CaseStatus;
  causesOfAction?: string[];
  caseFacts?: string;
}

/**
 * DTO for updating an existing case
 */
export interface UpdateCaseDTO {
  plaintiff?: string;
  plaintiffAnon?: string;
  defendant?: string;
  jurisdiction?: string;
  filedDate?: Date;
  status?: CaseStatus;
  causesOfAction?: string[];
  caseFacts?: string;
}

/**
 * Case filters for search and list queries
 */
export interface CaseFilters {
  status?: CaseStatus | CaseStatus[];
  jurisdiction?: string;
  filedDateFrom?: Date;
  filedDateTo?: Date;
  searchQuery?: string; // Full-text search
}

/**
 * Pagination parameters
 */
export interface Pagination {
  page: number;
  pageSize: number;
}

/**
 * Paginated case list response
 */
export interface PaginatedCases {
  cases: Case[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Database row interface for legal_cases table
 * Matches the PostgreSQL schema structure
 */
export interface CaseDbRow {
  id: string;
  case_number: string;
  plaintiff: string;
  plaintiff_anon: string | null;
  defendant: string;
  jurisdiction: string;
  filed_date: Date | null;
  status: string;
  causes_of_action: string[] | null;
  case_facts: string | null;
  arweave_tx_ids: string[] | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Type guard to check if value is a valid CaseStatus
 */
export function isValidCaseStatus(value: string): value is CaseStatus {
  return Object.values(CaseStatus).includes(value as CaseStatus);
}

/**
 * Helper to convert database row to Case object
 */
export function mapDbRowToCase(row: CaseDbRow): Case {
  return {
    id: row.id,
    caseNumber: row.case_number,
    plaintiff: row.plaintiff,
    plaintiffAnon: row.plaintiff_anon,
    defendant: row.defendant,
    jurisdiction: row.jurisdiction,
    filedDate: row.filed_date ? new Date(row.filed_date) : null,
    status: row.status as CaseStatus,
    causesOfAction: row.causes_of_action || [],
    caseFacts: row.case_facts,
    arweaveTxIds: row.arweave_tx_ids || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}
