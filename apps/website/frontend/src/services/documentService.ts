import type { ArweaveTxId } from '../types/arweave';
import { createArweaveTxId, getArweaveUrl } from '../types/arweave';
import type { Document } from '../types/Document';
import type { ApiResponse } from '../types/ApiResponse';
import { config } from '../config/env';

/**
 * Turbo SDK window extension for production uploads
 */
interface TurboWindow extends Window {
  TurboFactory?: {
    authenticated: (config: { privateKey: string }) => unknown;
  };
}

declare const window: TurboWindow;

/**
 * Document metadata stored alongside the file on Arweave
 */
interface DocumentMetadata {
  name: string;
  type: string;
  size: number;
  caseId?: string;
  uploadedAt: string;
  uploadedBy?: string;
  description?: string;
  tags?: string[];
}

/**
 * Document upload progress callback
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * Document upload result
 */
interface UploadResult {
  arweaveId: ArweaveTxId;
  url: string;
  metadata: DocumentMetadata;
}

/**
 * Document retrieval result
 */
interface RetrieveResult {
  data: ArrayBuffer;
  metadata: DocumentMetadata;
}

/**
 * Service for managing document uploads and retrieval from Arweave
 *
 * Environment Variables:
 * - VITE_TURBO_UPLOAD_URL: Turbo upload endpoint (default: https://upload.ardrive.io)
 * - VITE_USE_MOCK_ARWEAVE: Use mock uploads ('true'|'false', default: development mode)
 *
 * IMPORTANT: Set VITE_USE_MOCK_ARWEAVE=false in production
 * Mock mode is automatically enabled in development, explicitly disabled in production
 */
class DocumentService {
  // @ts-expect-error - Reserved for production Arweave integration
  private readonly _ARWEAVE_GATEWAY = 'https://arweave.net';
  // @ts-expect-error - Reserved for production Turbo upload integration
  private readonly _TURBO_UPLOAD_ENDPOINT = import.meta.env.VITE_TURBO_UPLOAD_URL || 'https://upload.ardrive.io';
  private readonly USE_MOCK =
    import.meta.env.MODE === 'development' ||
    import.meta.env.VITE_USE_MOCK_ARWEAVE === 'true';

  /**
   * Upload a document to Arweave with metadata
   *
   * @param file - File to upload
   * @param metadata - Document metadata
   * @param onProgress - Optional progress callback (0-100)
   * @returns Upload result with Arweave transaction ID
   *
   * @example
   * ```typescript
   * const result = await documentService.uploadDocument(
   *   file,
   *   { name: 'evidence.pdf', type: 'application/pdf', size: 12345, caseId: 'case-123' },
   *   (progress) => console.log(`Upload progress: ${progress}%`)
   * );
   * console.log(`Document uploaded: ${result.url}`);
   * ```
   */
  async uploadDocument(
    file: File,
    metadata: Partial<DocumentMetadata>,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResult> {
    try {
      // Prepare metadata
      const fullMetadata: DocumentMetadata = {
        name: metadata.name || file.name,
        type: metadata.type || file.type,
        size: metadata.size || file.size,
        caseId: metadata.caseId,
        uploadedAt: new Date().toISOString(),
        uploadedBy: metadata.uploadedBy,
        description: metadata.description,
        tags: metadata.tags,
      };

      // Read file as ArrayBuffer
      const fileBuffer = await this.readFileAsArrayBuffer(file);

      // Use mock or production upload based on environment
      const arweaveId = this.USE_MOCK
        ? await this.mockUpload(fileBuffer, fullMetadata, onProgress)
        : await this.turboUpload(fileBuffer, fullMetadata, onProgress);

      // Validate and create ArweaveTxId
      const validatedId = createArweaveTxId(arweaveId);
      if (!validatedId) {
        throw new Error('Invalid Arweave transaction ID received');
      }

      return {
        arweaveId: validatedId,
        url: getArweaveUrl(validatedId),
        metadata: fullMetadata,
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Retrieve a document from Arweave by transaction ID
   *
   * @param arweaveId - Arweave transaction ID
   * @returns Document data and metadata
   *
   * @example
   * ```typescript
   * const { data, metadata } = await documentService.retrieveDocument(txId);
   * const blob = new Blob([data], { type: metadata.type });
   * const url = URL.createObjectURL(blob);
   * // Use url to display or download the document
   * ```
   */
  async retrieveDocument(arweaveId: ArweaveTxId): Promise<RetrieveResult> {
    try {
      const url = getArweaveUrl(arweaveId);

      // Fetch document from Arweave
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }

      // Get document data
      const data = await response.arrayBuffer();

      // TODO: Fetch metadata from Arweave tags
      // For now, return minimal metadata
      const metadata: DocumentMetadata = {
        name: 'document',
        type: response.headers.get('Content-Type') || 'application/octet-stream',
        size: data.byteLength,
        uploadedAt: new Date().toISOString(),
      };

      return { data, metadata };
    } catch (error) {
      console.error('Error retrieving document:', error);
      throw error;
    }
  }

  /**
   * Verify a document exists on Arweave and is accessible
   *
   * @param arweaveId - Arweave transaction ID
   * @returns True if document exists and is accessible
   */
  async verifyDocument(arweaveId: ArweaveTxId): Promise<boolean> {
    try {
      const url = getArweaveUrl(arweaveId);
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get document metadata without downloading the full file
   *
   * @param arweaveId - Arweave transaction ID
   * @returns Document metadata
   */
  async getDocumentMetadata(arweaveId: ArweaveTxId): Promise<DocumentMetadata> {
    try {
      const url = getArweaveUrl(arweaveId);
      const response = await fetch(url, { method: 'HEAD' });

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }

      // TODO: Parse Arweave tags for full metadata
      // For now, return basic info from headers
      return {
        name: 'document',
        type: response.headers.get('Content-Type') || 'application/octet-stream',
        size: parseInt(response.headers.get('Content-Length') || '0', 10),
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error fetching document metadata:', error);
      throw error;
    }
  }

  /**
   * Read file as ArrayBuffer (helper method)
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Production Turbo.io upload implementation
   *
   * IMPORTANT: Requires Turbo SDK to be available
   * Add to index.html: <script src="https://unpkg.com/@ardrive/turbo-sdk"></script>
   *
   * @param _fileBuffer - File data as ArrayBuffer (unused until production implementation)
   * @param _metadata - Document metadata (unused until production implementation)
   * @param _onProgress - Progress callback (unused until production implementation)
   * @returns Arweave transaction ID
   * @throws Error if Turbo SDK not loaded or upload fails
   */
  private async turboUpload(
    _fileBuffer: ArrayBuffer,
    _metadata: DocumentMetadata,
    _onProgress?: UploadProgressCallback
  ): Promise<string> {
    // Check if Turbo SDK is available
    if (typeof window === 'undefined' || !window.TurboFactory) {
      throw new Error(
        'Production upload failed: Turbo SDK not loaded. ' +
        'Either set VITE_USE_MOCK_ARWEAVE=true for development, or add Turbo SDK script tag to index.html'
      );
    }

    // Production implementation placeholder
    // When ready to implement, rename parameters (remove _ prefix) and uncomment:
    /*
    const turbo = window.TurboFactory.authenticated({ privateKey: wallet });

    const tags = [
      { name: 'Content-Type', value: _metadata.type },
      { name: 'File-Name', value: _metadata.name },
      { name: 'Case-ID', value: _metadata.caseId || '' },
      { name: 'Upload-Date', value: _metadata.uploadedAt },
    ];

    const result = await turbo.uploadFile({
      fileStreamFactory: () => new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(_fileBuffer));
          controller.close();
        }
      }),
      fileSizeFactory: () => _fileBuffer.byteLength,
      dataItemOpts: { tags },
    });

    return result.id;
    */

    throw new Error(
      'Turbo upload not yet implemented. ' +
      'Set VITE_USE_MOCK_ARWEAVE=true for development. ' +
      'See documentService.ts turboUpload() method for implementation details.'
    );
  }

  /**
   * Mock upload function for development
   *
   * Simulates Arweave upload with realistic progress and delay
   * Generates valid 43-character transaction IDs for testing
   *
   * @param fileBuffer - File data as ArrayBuffer
   * @param metadata - Document metadata
   * @param onProgress - Progress callback
   * @returns Mock Arweave transaction ID
   */
  private async mockUpload(
    fileBuffer: ArrayBuffer,
    metadata: DocumentMetadata,
    onProgress?: UploadProgressCallback
  ): Promise<string> {
    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      onProgress?.(progress);
    }

    // Generate mock Arweave transaction ID (43 characters, base64url)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let txId = '';
    for (let i = 0; i < 43; i++) {
      txId += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    console.log('Mock upload complete:', {
      txId,
      metadata,
      size: fileBuffer.byteLength,
    });

    return txId;
  }

  /**
   * Fetch documents for a specific case from the backend API
   *
   * @param caseId - Case ID to fetch documents for
   * @returns Array of documents for the case
   */
  async getDocumentsByCaseId(caseId: string): Promise<Document[]> {
    try {
      const response = await fetch(`${config.apiBaseUrl}/cases/${caseId}/documents`);

      if (!response.ok) {
        throw new Error(`Failed to fetch documents: ${response.statusText}`);
      }

      // Backend returns documents with different field names
      interface BackendDocument {
        id: string;
        caseId: string;
        documentType: string;
        documentName: string;
        filePath: string;
        arweaveTxId: string | null;
        documentHash: string | null;
        createdAt: string;
        evidenceCategory?: string | null;
        arnsUndername?: string;
        arnsStatus?: string;
        arnsRegisteredAt?: string;
        arnsUrl?: string;
        synopsis?: string | null;
        tags?: string[] | null;
        // File integrity verification fields
        fileSize?: number | null;
        md5Hash?: string | null;
      }

      const result: ApiResponse<BackendDocument[]> = await response.json();

      // Validate response structure
      if (!result.success || !result.data) {
        throw new Error(
          result.success === false
            ? result.error.message
            : 'Invalid response format from server'
        );
      }

      // Map backend documents to frontend Document type
      const mappedDocs: Document[] = [];

      for (const doc of result.data) {
        // Create ArweaveTxId if available (optional for local-only documents)
        let arweaveId: ArweaveTxId | null = null;
        if (doc.arweaveTxId) {
          arweaveId = createArweaveTxId(doc.arweaveTxId);
          if (!arweaveId) {
            console.warn(`Invalid Arweave TX ID for document ${doc.id}: ${doc.arweaveTxId}`);
          }
        }

        // Use explicit evidenceCategory from API - no fallback logic
        // The backend determines the correct category during file processing
        mappedDocs.push({
          id: doc.id,
          name: doc.documentName,
          type: doc.documentType,
          size: doc.fileSize || 0, // Use fileSize from backend for accurate display
          arweaveId: arweaveId as ArweaveTxId, // May be null for local-only docs
          uploadedAt: doc.createdAt,
          verified: !!arweaveId, // Only verified if on Arweave
          description: `Case document: ${doc.documentName}`,
          evidenceCategory: doc.evidenceCategory
            ? (doc.evidenceCategory as import('../types/Document').EvidenceCategory)
            : null,
          arnsUndername: doc.arnsUndername,
          arnsStatus: doc.arnsStatus as import('../types/Document').ArnsStatus | undefined,
          arnsRegisteredAt: doc.arnsRegisteredAt,
          arnsUrl: doc.arnsUrl,
          filePath: doc.filePath, // Include file path for local document access
          synopsis: doc.synopsis ?? undefined,
          tags: doc.tags ?? undefined,
          md5Hash: doc.md5Hash ?? undefined, // MD5 hash for integrity verification
        });
      }

      return mappedDocs;
    } catch (error) {
      console.error(`Error fetching documents for case ${caseId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document (mark as deleted, since Arweave is immutable)
   *
   * Note: Arweave is permanent storage - files cannot be truly deleted.
   * This method would mark the document as deleted in our database,
   * but the data remains on Arweave.
   */
  async markDocumentAsDeleted(arweaveId: ArweaveTxId): Promise<void> {
    // TODO: Implement database update to mark document as deleted
    console.warn(`Document ${arweaveId} marked as deleted (data remains on Arweave)`);
  }
}

// Export singleton instance
export const documentService = new DocumentService();
