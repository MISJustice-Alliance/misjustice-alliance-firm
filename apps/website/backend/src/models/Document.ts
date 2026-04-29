/**
 * Document Model
 * TypeScript interfaces and types for case documents
 */

/**
 * Document type enumeration
 */
export enum DocumentType {
  COMPLAINT = 'complaint',
  MOTION = 'motion',
  BRIEF = 'brief',
  MEMO = 'memo',
  DISCOVERY = 'discovery',
  EVIDENCE = 'evidence',
  RULING = 'ruling',
  SETTLEMENT = 'settlement',
  OTHER = 'other',
}

/**
 * ArNS registration status
 */
export enum ArnsStatus {
  NONE = 'none',
  PENDING = 'pending',
  REGISTERING = 'registering',
  ACTIVE = 'active',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

/**
 * Evidence category for evidentiary documentation
 * Used to organize supporting evidence separate from legal filings
 */
export enum EvidenceCategory {
  COURT_DOCUMENTS = 'court-documents',
  FORMAL_COMPLAINTS = 'formal-complaints',
  GLOBAL_CASEFILES = 'global-casefiles',
  OTHER_VICTIMS = 'other-victims',
  POLICE_REPORTS = 'police-reports',
  TYLEEN_ROOT_HARASSMENT = 'tyleen-root-harassment',
  YWCA_MISSOULA = 'ywca-missoula',
}

/**
 * Main Document interface
 */
export interface Document {
  id: string;
  caseId: string;
  documentType: DocumentType;
  documentName: string;
  filePath: string | null;
  arweaveTxId: string | null;
  documentHash: string | null;
  createdAt: Date;

  // File size and integrity verification
  fileSize: number | null;
  md5Hash: string | null;

  // Evidence categorization (null for standard case filings)
  evidenceCategory?: EvidenceCategory | null;

  // ArNS (Arweave Name System) fields for human-readable URLs
  arnsUndername?: string;
  arnsStatus: ArnsStatus;
  arnsRegisteredAt?: Date;
  arnsUrl?: string;

  // AI-generated document analysis
  synopsis?: string | null;
  tags?: string[] | null;
}

/**
 * DTO for creating a new document
 */
export interface CreateDocumentDTO {
  caseId: string;
  documentType: DocumentType;
  documentName: string;
  filePath?: string;
  documentHash?: string;
}

/**
 * DTO for updating a document
 */
export interface UpdateDocumentDTO {
  documentName?: string;
  filePath?: string;
  arweaveTxId?: string;
  documentHash?: string;
  fileSize?: number;
  md5Hash?: string;
  arnsUndername?: string;
  arnsStatus?: ArnsStatus;
  arnsRegisteredAt?: Date;
  arnsUrl?: string;
  synopsis?: string;
  tags?: string[];
}

/**
 * Database row interface for case_documents table
 */
export interface DocumentDbRow {
  id: string;
  case_id: string;
  document_type: string;
  document_name: string;
  file_path: string | null;
  arweave_tx_id: string | null;
  document_hash: string | null;
  created_at: Date;

  // File size and integrity verification
  file_size: number | null;
  md5_hash: string | null;

  // Evidence categorization (null for standard case filings)
  evidence_category?: string | null;

  // ArNS fields
  arns_undername?: string;
  arns_status: string;
  arns_registered_at?: Date;
  arns_url?: string;

  // AI-generated document analysis
  synopsis?: string | null;
  tags?: string[] | null;
}

/**
 * Type guard to check if value is a valid DocumentType
 */
export function isValidDocumentType(value: string): value is DocumentType {
  return Object.values(DocumentType).includes(value as DocumentType);
}

/**
 * Helper to convert database row to Document object
 */
export function mapDbRowToDocument(row: DocumentDbRow): Document {
  return {
    id: row.id,
    caseId: row.case_id,
    documentType: row.document_type as DocumentType,
    documentName: row.document_name,
    filePath: row.file_path,
    arweaveTxId: row.arweave_tx_id,
    documentHash: row.document_hash,
    createdAt: new Date(row.created_at),

    // File size and integrity verification
    fileSize: row.file_size,
    md5Hash: row.md5_hash,

    // Evidence categorization
    evidenceCategory: row.evidence_category as EvidenceCategory | null | undefined,

    // ArNS fields
    arnsUndername: row.arns_undername,
    arnsStatus: (row.arns_status as ArnsStatus) || ArnsStatus.NONE,
    arnsRegisteredAt: row.arns_registered_at ? new Date(row.arns_registered_at) : undefined,
    arnsUrl: row.arns_url,

    // AI-generated document analysis
    synopsis: row.synopsis,
    tags: row.tags,
  };
}
