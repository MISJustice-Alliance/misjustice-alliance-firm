/**
 * Archive Model
 * TypeScript interfaces and types for case archive records (Arweave integration)
 */

/**
 * Archive stage enumeration
 * Represents when in the case lifecycle the archive was created
 */
export enum ArchiveStage {
  INTAKE = 'intake',
  RESEARCH = 'research',
  PLEADINGS = 'pleadings',
  DISCOVERY = 'discovery',
  TRIAL = 'trial',
  FINAL = 'final',
}

/**
 * Main Archive interface
 */
export interface Archive {
  id: string;
  caseId: string;
  stage: ArchiveStage;
  arweaveTxId: string;
  documentHash: string;
  archivedAt: Date;
  verified: boolean;
  verifiedAt: Date | null;
  bundleMetadata: Record<string, unknown>;
}

/**
 * DTO for creating a new archive record
 */
export interface CreateArchiveDTO {
  caseId: string;
  stage: ArchiveStage;
  arweaveTxId: string;
  documentHash: string;
  bundleMetadata?: Record<string, unknown>;
}

/**
 * DTO for updating archive verification status
 */
export interface UpdateArchiveVerificationDTO {
  verified: boolean;
  verifiedAt?: Date;
}

/**
 * Database row interface for case_archives table
 */
export interface ArchiveDbRow {
  id: string;
  case_id: string;
  stage: string;
  arweave_tx_id: string;
  document_hash: string;
  archived_at: Date;
  verified: boolean;
  verified_at: Date | null;
  bundle_metadata: Record<string, unknown>;
}

/**
 * Type guard to check if value is a valid ArchiveStage
 */
export function isValidArchiveStage(value: string): value is ArchiveStage {
  return Object.values(ArchiveStage).includes(value as ArchiveStage);
}

/**
 * Helper to convert database row to Archive object
 */
export function mapDbRowToArchive(row: ArchiveDbRow): Archive {
  return {
    id: row.id,
    caseId: row.case_id,
    stage: row.stage as ArchiveStage,
    arweaveTxId: row.arweave_tx_id,
    documentHash: row.document_hash,
    archivedAt: new Date(row.archived_at),
    verified: row.verified,
    verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
    bundleMetadata: row.bundle_metadata || {},
  };
}
