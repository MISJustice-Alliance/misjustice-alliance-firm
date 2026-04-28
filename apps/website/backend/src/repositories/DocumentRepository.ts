/**
 * Document Repository
 * Database access layer for case documents
 */

import { Pool, QueryResult } from 'pg';
import {
  Document,
  DocumentDbRow,
  CreateDocumentDTO,
  UpdateDocumentDTO,
  mapDbRowToDocument,
} from '../models/Document';

export class DocumentRepository {
  constructor(private pool: Pool) {}

  /**
   * Get all documents for a case
   */
  async findByCaseId(caseId: string): Promise<Document[]> {
    const query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE case_id = $1
      ORDER BY created_at DESC
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [caseId]);
    return result.rows.map(mapDbRowToDocument);
  }

  /**
   * Get a single document by ID
   */
  async findById(id: string): Promise<Document | null> {
    const query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE id = $1
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToDocument(result.rows[0]);
  }

  /**
   * Get all documents awaiting Arweave archival (where arweave_tx_id IS NULL)
   */
  async findPendingArchival(): Promise<Document[]> {
    const query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE arweave_tx_id IS NULL
      ORDER BY created_at ASC
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query);
    return result.rows.map(mapDbRowToDocument);
  }

  /**
   * Get all documents awaiting analysis (where synopsis IS NULL)
   */
  async findPendingAnalysis(caseId?: string): Promise<Document[]> {
    let query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE synopsis IS NULL
    `;

    const params: string[] = [];
    if (caseId) {
      params.push(caseId);
      query += ` AND case_id = $1`;
    }

    query += ` ORDER BY created_at ASC`;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, params);
    return result.rows.map(mapDbRowToDocument);
  }

  /**
   * Create a new document
   */
  async create(dto: CreateDocumentDTO): Promise<Document> {
    const query = `
      INSERT INTO case_documents (
        id, case_id, document_name, document_type, file_path, document_hash, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [
      dto.caseId,
      dto.documentName,
      dto.documentType,
      dto.filePath || null,
      dto.documentHash || null,
    ]);

    return mapDbRowToDocument(result.rows[0]);
  }

  /**
   * Update document (typically to add Arweave TX ID after archival)
   */
  async update(id: string, dto: UpdateDocumentDTO): Promise<Document | null> {
    // Build dynamic UPDATE query based on provided fields
    const updates: string[] = [];
    const values: (string | string[] | null)[] = [];
    let paramIndex = 1;

    if (dto.documentName !== undefined) {
      updates.push(`document_name = $${paramIndex++}`);
      values.push(dto.documentName);
    }

    if (dto.filePath !== undefined) {
      updates.push(`file_path = $${paramIndex++}`);
      values.push(dto.filePath);
    }

    if (dto.arweaveTxId !== undefined) {
      updates.push(`arweave_tx_id = $${paramIndex++}`);
      values.push(dto.arweaveTxId);
    }

    if (dto.documentHash !== undefined) {
      updates.push(`document_hash = $${paramIndex++}`);
      values.push(dto.documentHash);
    }

    // ArNS fields
    if (dto.arnsUndername !== undefined) {
      updates.push(`arns_undername = $${paramIndex++}`);
      values.push(dto.arnsUndername);
    }

    if (dto.arnsStatus !== undefined) {
      updates.push(`arns_status = $${paramIndex++}`);
      values.push(dto.arnsStatus);
    }

    if (dto.arnsRegisteredAt !== undefined) {
      updates.push(`arns_registered_at = $${paramIndex++}`);
      values.push(dto.arnsRegisteredAt instanceof Date ? dto.arnsRegisteredAt.toISOString() : dto.arnsRegisteredAt as string);
    }

    if (dto.arnsUrl !== undefined) {
      updates.push(`arns_url = $${paramIndex++}`);
      values.push(dto.arnsUrl);
    }

    // File size and md5 hash fields
    if (dto.fileSize !== undefined) {
      updates.push(`file_size = $${paramIndex++}`);
      values.push(dto.fileSize as unknown as string);
    }

    if (dto.md5Hash !== undefined) {
      updates.push(`md5_hash = $${paramIndex++}`);
      values.push(dto.md5Hash);
    }

    // Synopsis and tags fields
    if (dto.synopsis !== undefined) {
      updates.push(`synopsis = $${paramIndex++}`);
      values.push(dto.synopsis);
    }

    if (dto.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(dto.tags);
    }

    if (updates.length === 0) {
      // No fields to update, return existing document
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE case_documents
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToDocument(result.rows[0]);
  }

  /**
   * Update synopsis and tags for a document (dedicated method for analysis)
   */
  async updateSynopsisAndTags(
    id: string,
    synopsis: string,
    tags: string[]
  ): Promise<Document | null> {
    const query = `
      UPDATE case_documents
      SET synopsis = $1, tags = $2
      WHERE id = $3
      RETURNING
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [synopsis, tags, id]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToDocument(result.rows[0]);
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM case_documents WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rowCount !== null && result.rowCount > 0;
  }

  /**
   * Get document statistics for a case
   */
  async getStatsByCaseId(caseId: string): Promise<{
    totalDocuments: number;
    archivedDocuments: number;
    pendingArchival: number;
    totalSizeBytes: number;
  }> {
    const query = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(arweave_tx_id) as archived_documents,
        COUNT(*) - COUNT(arweave_tx_id) as pending_archival,
        COALESCE(SUM(file_size), 0) as total_size_bytes
      FROM case_documents
      WHERE case_id = $1
    `;

    const result = await this.pool.query(query, [caseId]);
    const row = result.rows[0];

    return {
      totalDocuments: parseInt(row.total_documents, 10),
      archivedDocuments: parseInt(row.archived_documents, 10),
      pendingArchival: parseInt(row.pending_archival, 10),
      totalSizeBytes: parseInt(row.total_size_bytes, 10) || 0,
    };
  }

  /**
   * Find document by ArNS undername
   */
  async findByArnsUndername(undername: string): Promise<Document | null> {
    const query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE arns_undername = $1
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [undername]);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToDocument(result.rows[0]);
  }

  /**
   * Find all documents by case ID and document type
   */
  async findByCaseAndType(caseId: string, documentType: string): Promise<Document[]> {
    const query = `
      SELECT
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
      FROM case_documents
      WHERE case_id = $1 AND document_type = $2
      ORDER BY created_at ASC
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, [caseId, documentType]);
    return result.rows.map(mapDbRowToDocument);
  }

  /**
   * Get case by ID (for ArNS service to retrieve case number)
   */
  async getCaseById(caseId: string): Promise<{ id: string; caseNumber: string } | null> {
    const query = `
      SELECT id, case_number
      FROM legal_cases
      WHERE id = $1
    `;

    const result = await this.pool.query(query, [caseId]);

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      caseNumber: result.rows[0].case_number,
    };
  }

  /**
   * Update ArNS information for a document (dedicated method for ArNS service)
   */
  async updateArnsInfo(
    id: string,
    arnsInfo: {
      arnsUndername?: string;
      arnsStatus?: string;
      arnsRegisteredAt?: Date;
      arnsUrl?: string;
    }
  ): Promise<Document | null> {
    const updates: string[] = [];
    const values: (string | Date | null)[] = [];
    let paramIndex = 1;

    if (arnsInfo.arnsUndername !== undefined) {
      updates.push(`arns_undername = $${paramIndex++}`);
      values.push(arnsInfo.arnsUndername);
    }

    if (arnsInfo.arnsStatus !== undefined) {
      updates.push(`arns_status = $${paramIndex++}`);
      values.push(arnsInfo.arnsStatus);
    }

    if (arnsInfo.arnsRegisteredAt !== undefined) {
      updates.push(`arns_registered_at = $${paramIndex++}`);
      values.push(
        arnsInfo.arnsRegisteredAt === null || arnsInfo.arnsRegisteredAt === undefined
          ? null
          : arnsInfo.arnsRegisteredAt instanceof Date
            ? arnsInfo.arnsRegisteredAt.toISOString()
            : arnsInfo.arnsRegisteredAt
      );
    }

    if (arnsInfo.arnsUrl !== undefined) {
      updates.push(`arns_url = $${paramIndex++}`);
      values.push(arnsInfo.arnsUrl);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);

    const query = `
      UPDATE case_documents
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING
        id, case_id, document_name, document_type, evidence_category,
        file_path, arweave_tx_id, document_hash,
        file_size, md5_hash,
        created_at,
        arns_undername, arns_status, arns_registered_at, arns_url,
        synopsis, tags
    `;

    const result: QueryResult<DocumentDbRow> = await this.pool.query(query, values);

    if (result.rows.length === 0) {
      return null;
    }

    return mapDbRowToDocument(result.rows[0]);
  }
}
