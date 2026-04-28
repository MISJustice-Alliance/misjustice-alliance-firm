/**
 * DocumentAnalyzer
 * Analyzes documents and generates metadata
 *
 * Following Clean Architecture: Pure domain logic for document analysis
 */

import type { DocumentFile } from './ContentScanner';

export interface DocumentMetadata {
  pageCount?: number;
  fileSize: number;
  mimeType: string;
  fileExtension: string;
  documentDate?: string;
}

export interface SEOMetadata {
  keywords: string[];
  tags: string[];
  entities?: {
    people?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
  };
}

/**
 * Document mapping from caseMappings.json
 */
export interface DocumentMapping {
  documentType?: string;
  category?: string;
  subcategory?: string;
  summary?: string;
  description?: string;
  keywords?: string[];
  tags?: string[];
  entities?: {
    people?: string[];
    organizations?: string[];
    locations?: string[];
    dates?: string[];
  };
}

/**
 * Case mapping from caseMappings.json
 */
export interface CaseMapping {
  caseNumber: string;
  plaintiff: string;
  plaintiffAnon?: string;
  defendant: string;
  jurisdiction: string;
  status: string;
  filedDate?: string | null;
  caseSummary?: string;
  causesOfAction?: string[];
  keywords?: string[];
  documents?: Record<string, DocumentMapping>;
}

export interface EnrichedDocument {
  fileName: string;
  filePath: string;
  documentType: string;
  category: string;
  subcategory?: string;
  summary: string;
  description: string;
  metadata: DocumentMetadata;
  seo: SEOMetadata;
}

/**
 * Stop words to filter out from keyword extraction
 */
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'these',
  'those',
  'final',
  'qr',
  'code',
  'pdf',
]);

export class DocumentAnalyzer {
  /**
   * Analyze a document file and generate enriched metadata
   */
  async analyzeDocument(
    docFile: DocumentFile,
    caseMappings: CaseMapping | undefined
  ): Promise<EnrichedDocument> {
    // Get document metadata from case mappings if available
    const docMapping = caseMappings?.documents?.[docFile.fileName];

    // Generate metadata
    const metadata: DocumentMetadata = {
      fileSize: docFile.fileSize,
      mimeType: docFile.mimeType,
      fileExtension: docFile.fileExtension,
      // pageCount would require PDF parsing library (pdf-parse)
      // For now, we'll omit it unless we add that dependency
    };

    // Extract or use provided SEO metadata
    const seo: SEOMetadata = {
      keywords: docMapping?.keywords || this.extractKeywords(docFile.fileName),
      tags: docMapping?.tags || this.inferTags(docFile.fileName),
      entities: docMapping?.entities || {},
    };

    // Use provided metadata or generate from filename
    const enrichedDoc: EnrichedDocument = {
      fileName: docFile.fileName,
      filePath: docFile.filePath,
      documentType: docMapping?.documentType || this.inferDocumentType(docFile.fileName),
      category: docMapping?.category || 'other',
      subcategory: docMapping?.subcategory,
      summary: docMapping?.summary || this.generateSummary(docFile.fileName),
      description:
        docMapping?.description || this.generateDescription(docFile.fileName),
      metadata,
      seo,
    };

    return enrichedDoc;
  }

  /**
   * Generate human-readable summary from filename
   */
  private generateSummary(fileName: string): string {
    const cleanName = fileName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace('.pdf', '')
      .replace(/\d{2,}_/, '') // Remove number prefixes like "01_"
      .replace(/-Final-QR_code/g, '')
      .replace(/-Final/g, '');

    return `Legal document: ${cleanName}`;
  }

  /**
   * Generate description from filename
   */
  private generateDescription(fileName: string): string {
    return `${this.generateSummary(fileName)}. This document is part of the case evidence and documentation package.`;
  }

  /**
   * Extract keywords from filename and summary
   */
  private extractKeywords(fileName: string): string[] {
    const words = fileName
      .replace(/\.pdf$/i, '')
      .split(/[_\-\s]+/)
      .map((w) => w.toLowerCase())
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
      .filter((w) => !/^\d+$/.test(w)); // Remove pure numbers

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Infer document tags from filename
   */
  private inferTags(fileName: string): string[] {
    const tags: string[] = [];
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.includes('cover')) tags.push('cover-letter');
    if (lowerFileName.includes('letter')) tags.push('letter');
    if (lowerFileName.includes('evidence')) tags.push('evidence');
    if (lowerFileName.includes('declaration')) tags.push('declaration');
    if (lowerFileName.includes('sworn')) tags.push('sworn-statement');
    if (lowerFileName.includes('criminal')) tags.push('criminal');
    if (lowerFileName.includes('report')) tags.push('report');
    if (lowerFileName.includes('summary')) tags.push('summary');
    if (lowerFileName.includes('fbi')) tags.push('FBI');
    if (lowerFileName.includes('doj')) tags.push('DOJ');
    if (lowerFileName.includes('ag')) tags.push('attorney-general');
    if (lowerFileName.includes('usao')) tags.push('USAO');
    if (lowerFileName.includes('comprehensive')) tags.push('comprehensive');
    if (lowerFileName.includes('supplemental')) tags.push('supplemental');

    return tags;
  }

  /**
   * Infer document type from filename and content
   */
  private inferDocumentType(fileName: string): string {
    const lowerFileName = fileName.toLowerCase();

    if (lowerFileName.includes('brief')) return 'brief';
    if (lowerFileName.includes('motion')) return 'motion';
    if (lowerFileName.includes('complaint') || lowerFileName.includes('cover'))
      return 'complaint';
    if (lowerFileName.includes('evidence') || lowerFileName.includes('declaration'))
      return 'evidence';
    if (lowerFileName.includes('ruling')) return 'ruling';
    if (lowerFileName.includes('memo')) return 'memo';
    if (lowerFileName.includes('discovery')) return 'discovery';

    return 'other';
  }
}
