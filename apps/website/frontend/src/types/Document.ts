import type { ArweaveTxId } from './arweave';

/**
 * Represents a file being uploaded with progress tracking
 * Used during the upload process to track status and progress
 */
export interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  arweaveId?: string;
}

/**
 * ArNS (Arweave Name System) registration status
 */
export type ArnsStatus = 'none' | 'pending' | 'registering' | 'active' | 'failed' | 'expired';

/**
 * Evidence category for evidentiary documentation
 * Used to organize supporting evidence separate from legal filings
 */
export type EvidenceCategory =
  | 'court-documents'
  | 'formal-complaints'
  | 'police-reports'
  | 'attorney-correspondence'
  | 'email-communications'
  | 'global-casefiles'
  | 'public-documents'
  | 'documented-harassment'
  | 'documentation'
  | 'case-narrative'
  | 'ywca-missoula'
  | 'victim-statements';

/**
 * Represents a document stored on Arweave
 * This is the permanent record of a document after successful upload
 */
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  arweaveId: ArweaveTxId | null; // Null for documents not yet archived to Arweave
  uploadedAt: string;
  uploadedBy?: string;
  verified: boolean;
  description?: string;

  // Evidence categorization (null for standard case filings)
  evidenceCategory?: EvidenceCategory | null;

  // ArNS (Arweave Name System) fields for human-readable URLs
  arnsUndername?: string;
  arnsStatus?: ArnsStatus;
  arnsRegisteredAt?: string;
  arnsUrl?: string;

  // Local file path for documents not yet on Arweave
  filePath?: string;

  // AI-generated document analysis
  synopsis?: string | null;
  tags?: string[] | null;

  // File integrity verification - MD5 hash for verifying downloaded files
  md5Hash?: string | null;
}
