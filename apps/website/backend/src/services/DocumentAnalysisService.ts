/**
 * Document Analysis Service
 * Extracts text from documents and generates AI-powered synopsis and tags
 *
 * Uses Venice.ai API for document analysis:
 * - qwen3-235b for PDF text analysis (successor to llama-3.1-405b)
 * - mistral-31-24b for image vision/OCR
 */

import * as fs from 'fs/promises';
import * as path from 'path';
// @ts-ignore - pdf-parse lacks type definitions but works at runtime
import pdfParse from 'pdf-parse';
import { createWorker, Worker } from 'tesseract.js';
import { logger } from '../utils/logger';

/**
 * Venice.ai API Configuration
 * Model names are configured via Bitwarden secrets (TEXT_MODEL, VISION_MODEL)
 * with fallbacks to known working models.
 */
const VENICE_CONFIG = {
  baseUrl: 'https://api.venice.ai/api/v1',
  // Model for text analysis (PDFs with extractable text)
  // Configured via TEXT_MODEL environment variable from Bitwarden secrets
  // Fallback: qwen3-235b-a22b-instruct-2507 (Jan 2026)
  textModel: process.env.TEXT_MODEL || 'qwen3-235b-a22b-instruct-2507',
  // Model for vision/OCR (images and scanned documents)
  // Configured via VISION_MODEL environment variable from Bitwarden secrets
  // Fallback: mistral-31-24b
  visionModel: process.env.VISION_MODEL || 'mistral-31-24b',
  // Increased from 500 to 2000 to accommodate thinking models
  maxTokens: 2000,
  temperature: 0.3,
};

/**
 * Token usage from Venice API
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Result of document analysis
 */
export interface AnalysisResult {
  synopsis: string;
  tags: string[];
  extractedTextLength: number;
  tokenUsage?: TokenUsage;
  model?: string;
}

/**
 * Venice.ai API Response types
 */
interface VeniceMessage {
  role: string;
  content: string;
}

interface VeniceChoice {
  index: number;
  message: VeniceMessage;
  finish_reason: string;
}

interface VeniceUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

interface VeniceResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: VeniceChoice[];
  usage: VeniceUsage;
}

/**
 * Supported file types for analysis
 */
const SUPPORTED_PDF_TYPES = ['.pdf'];
const SUPPORTED_IMAGE_TYPES = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.webp'];

export class DocumentAnalysisService {
  private apiKey: string;
  private tesseractWorker: Worker | null = null;

  constructor() {
    const apiKey = process.env.VENICE_API_KEY;
    if (!apiKey) {
      throw new Error('VENICE_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Initialize Tesseract worker for OCR fallback (lazy initialization)
   */
  private async getTesseractWorker(): Promise<Worker> {
    if (!this.tesseractWorker) {
      logger.info('Initializing Tesseract OCR worker...');
      this.tesseractWorker = await createWorker('eng');
      logger.info('Tesseract OCR worker initialized');
    }
    return this.tesseractWorker;
  }

  /**
   * Clean up Tesseract worker
   */
  async cleanup(): Promise<void> {
    if (this.tesseractWorker) {
      await this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  /**
   * Analyze a document and generate synopsis and tags
   */
  async analyzeDocument(filePath: string, documentName: string): Promise<AnalysisResult> {
    logger.info('Starting document analysis', { filePath, documentName });

    const ext = path.extname(filePath).toLowerCase();
    const isImage = SUPPORTED_IMAGE_TYPES.includes(ext);

    // For images, use Venice vision model directly
    if (isImage) {
      return this.analyzeImageWithVision(filePath, documentName);
    }

    // For PDFs, extract text first
    const extractedText = await this.extractText(filePath);

    // If PDF has insufficient extractable text, use vision model for OCR
    if (!extractedText || extractedText.trim().length < 50) {
      logger.warn('Insufficient text extracted from PDF, attempting vision OCR analysis', {
        filePath,
        extractedLength: extractedText?.length || 0
      });

      // Use vision model to analyze scanned PDF (converted to image)
      return this.analyzePdfWithVision(filePath, documentName);
    }

    // Generate synopsis and tags using Venice text model
    const analysis = await this.generateTextAnalysis(extractedText, documentName);

    logger.info('Document analysis complete', {
      documentName,
      synopsisLength: analysis.synopsis.length,
      tagCount: analysis.tags.length,
      model: VENICE_CONFIG.textModel
    });

    return {
      ...analysis,
      extractedTextLength: extractedText.length,
    };
  }

  /**
   * Extract text from a document based on file type
   */
  private async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (SUPPORTED_PDF_TYPES.includes(ext)) {
      return this.extractTextFromPdf(filePath);
    } else if (SUPPORTED_IMAGE_TYPES.includes(ext)) {
      // Use Tesseract for text extraction from images as fallback
      return this.extractTextFromImage(filePath);
    } else {
      logger.warn('Unsupported file type for text extraction', { filePath, ext });
      return '';
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractTextFromPdf(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      logger.info('PDF text extracted', {
        filePath,
        pages: data.numpages,
        textLength: data.text.length
      });
      return data.text;
    } catch (error) {
      logger.error('Failed to extract text from PDF', { filePath, error });
      return '';
    }
  }

  /**
   * Extract text from image using Tesseract OCR (fallback method)
   */
  private async extractTextFromImage(filePath: string): Promise<string> {
    try {
      const worker = await this.getTesseractWorker();
      const { data: { text } } = await worker.recognize(filePath);
      logger.info('Image OCR complete (Tesseract)', { filePath, textLength: text.length });
      return text;
    } catch (error) {
      logger.error('Failed to OCR image with Tesseract', { filePath, error });
      return '';
    }
  }

  /**
   * Analyze image using Venice vision model (mistral-31-24b)
   */
  private async analyzeImageWithVision(filePath: string, documentName: string): Promise<AnalysisResult> {
    try {
      // Read image and convert to base64
      const imageBuffer = await fs.readFile(filePath);
      const base64Image = imageBuffer.toString('base64');
      const ext = path.extname(filePath).toLowerCase().slice(1);
      const mimeType = this.getMimeType(ext);
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      logger.info('Analyzing image with Venice vision model', {
        filePath,
        documentName,
        model: VENICE_CONFIG.visionModel,
        imageSize: imageBuffer.length
      });

      const prompt = `You are analyzing a legal document image for a case management system.
First, extract and read any text visible in this image (perform OCR).
Then, based on the visible content, provide:

1. A concise synopsis (1-2 sentences) describing the document's purpose and key contents.
2. A list of 3-7 metadata tags from these categories:
   - Document type: complaint, motion, brief, evidence, declaration, affidavit, report, correspondence, order, ruling
   - Filing type: court-filing, agency-complaint, police-report, medical-record, witness-statement, financial-record
   - Subject matter: misconduct, negligence, harassment, fraud, civil-rights, discrimination, abuse, malpractice
   - Status: redacted, certified, draft, final, exhibit

Document name: ${documentName}

Respond in JSON format only:
{
  "synopsis": "Your 1-2 sentence synopsis here",
  "tags": ["tag1", "tag2", "tag3"]
}`;

      const response = await this.callVeniceAPI(
        VENICE_CONFIG.visionModel,
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } }
            ]
          }
        ]
      );

      const result = this.parseAnalysisResponse(response, VENICE_CONFIG.visionModel);
      return {
        ...result,
        extractedTextLength: imageBuffer.length, // Use image size as proxy
      };
    } catch (error) {
      logger.error('Failed to analyze image with Venice vision', { error, filePath, documentName });

      // Fallback to Tesseract OCR + text analysis
      logger.info('Falling back to Tesseract OCR for image analysis');
      const extractedText = await this.extractTextFromImage(filePath);

      if (extractedText && extractedText.trim().length >= 50) {
        const analysis = await this.generateTextAnalysis(extractedText, documentName);
        return {
          ...analysis,
          extractedTextLength: extractedText.length,
        };
      }

      return {
        synopsis: `Document: ${documentName}. Vision analysis failed.`,
        tags: ['analysis-failed'],
        extractedTextLength: extractedText?.length || 0,
        model: 'fallback-tesseract',
      };
    }
  }

  /**
   * Analyze scanned PDF using Venice vision model (mistral-31-24b) for OCR
   * Converts PDF pages to images and extracts text via vision model
   */
  private async analyzePdfWithVision(filePath: string, documentName: string): Promise<AnalysisResult> {
    try {
      logger.info('Scanned PDF detected - converting pages to images for Venice OCR', {
        filePath,
        documentName,
        model: VENICE_CONFIG.visionModel
      });

      // Import pdf2pic dynamically
      const { fromPath } = await import('pdf2pic');

      // Convert PDF pages to images
      const convert = fromPath(filePath, {
        density: 200,           // DPI for image quality
        saveFilename: 'page',
        savePath: '/tmp',
        format: 'png',
        width: 2000,
        height: 2000,
      });

      // Get total pages (convert first page to check)
      const firstPage = await convert(1, { responseType: 'base64' });

      if (!firstPage.base64) {
        throw new Error('Failed to convert PDF page to image');
      }

      logger.info('PDF converted to images, starting OCR with Venice vision model', {
        documentName,
        model: VENICE_CONFIG.visionModel
      });

      // Extract text from first page using Venice vision model
      const prompt = `Extract all text from this page, preserving reading order and formatting.
Return only the extracted text, nothing else.`;

      const response = await this.callVeniceAPI(
        VENICE_CONFIG.visionModel,
        [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${firstPage.base64}`
                }
              }
            ]
          }
        ]
      );

      const extractedText = response.choices[0]?.message?.content || '';

      if (extractedText && extractedText.trim().length >= 50) {
        logger.info('Venice OCR successful, analyzing with text model', {
          textLength: extractedText.length,
          model: VENICE_CONFIG.textModel
        });

        // Use Venice text model to analyze the OCR'd text
        const analysis = await this.generateTextAnalysis(extractedText, documentName);
        return {
          ...analysis,
          extractedTextLength: extractedText.length,
          model: `${VENICE_CONFIG.visionModel}-ocr + ${VENICE_CONFIG.textModel}`,
        };
      }

      logger.warn('Insufficient text extracted via Venice OCR', {
        textLength: extractedText?.length || 0
      });

      // Fallback to filename-based inference
      const tags = this.inferTagsFromFilename(documentName);
      return {
        synopsis: this.generateSynopsisFromFilename(documentName, tags),
        tags,
        extractedTextLength: extractedText?.length || 0,
        model: 'venice-ocr-fallback',
      };

    } catch (error) {
      logger.error('Failed to analyze scanned PDF with Venice OCR', {
        error: error instanceof Error ? error.message : String(error),
        filePath,
        documentName
      });

      // Ultimate fallback: filename-based inference
      const tags = this.inferTagsFromFilename(documentName);
      return {
        synopsis: this.generateSynopsisFromFilename(documentName, tags),
        tags,
        extractedTextLength: 0,
        model: 'filename-inference',
      };
    }
  }

  /**
   * Generate a basic synopsis from filename and inferred tags
   */
  private generateSynopsisFromFilename(filename: string, tags: string[]): string {
    // Build synopsis from tags
    const docType = tags.find(t => ['complaint', 'brief', 'motion', 'evidence', 'ruling', 'report', 'correspondence'].includes(t));
    const subject = tags.find(t => ['misconduct', 'malpractice', 'harassment', 'civil-rights'].includes(t));

    let synopsis = `Document: ${filename}.`;

    if (docType) {
      synopsis += ` This appears to be a legal ${docType}`;
    }

    if (subject) {
      synopsis += ` related to ${subject}`;
    }

    synopsis += '. Scanned document with insufficient extractable text.';

    return synopsis;
  }

  /**
   * Infer document tags from filename patterns
   */
  private inferTagsFromFilename(filename: string): string[] {
    const tags: string[] = [];
    const lower = filename.toLowerCase();

    // Document types
    if (lower.includes('complaint')) tags.push('complaint');
    if (lower.includes('motion')) tags.push('motion');
    if (lower.includes('brief')) tags.push('brief');
    if (lower.includes('evidence')) tags.push('evidence');
    if (lower.includes('declaration')) tags.push('declaration');
    if (lower.includes('affidavit')) tags.push('affidavit');
    if (lower.includes('report')) tags.push('report');
    if (lower.includes('letter') || lower.includes('correspondence')) tags.push('correspondence');
    if (lower.includes('order') || lower.includes('ruling')) tags.push('ruling');
    if (lower.includes('cover')) tags.push('cover-letter');

    // Filing types
    if (lower.includes('court')) tags.push('court-filing');
    if (lower.includes('police')) tags.push('police-report');
    if (lower.includes('medical')) tags.push('medical-record');

    // Subject matter
    if (lower.includes('misconduct')) tags.push('misconduct');
    if (lower.includes('malpractice')) tags.push('malpractice');
    if (lower.includes('harassment')) tags.push('harassment');
    if (lower.includes('civil-rights') || lower.includes('civilrights')) tags.push('civil-rights');

    // Status
    if (lower.includes('redacted')) tags.push('redacted');
    if (lower.includes('final')) tags.push('final');
    if (lower.includes('draft')) tags.push('draft');

    // Default tag if none found
    if (tags.length === 0) {
      tags.push('legal-document');
    }

    return tags;
  }

  /**
   * Generate synopsis and tags using Venice text model (Llama 3.1 405B)
   */
  private async generateTextAnalysis(
    extractedText: string,
    documentName: string
  ): Promise<{ synopsis: string; tags: string[]; tokenUsage?: TokenUsage; model?: string }> {
    // Truncate text to fit within context (use ~10k chars for safety)
    const truncatedText = extractedText.slice(0, 10000);

    const prompt = `You are analyzing a legal document for a case management system. Based on the document content below, provide:

1. A concise synopsis (1-2 sentences) describing the document's purpose and key contents. Be specific about what the document is and what it contains.

2. A list of 3-7 metadata tags that categorize this document. Choose from these categories:
   - Document type: complaint, motion, brief, evidence, declaration, affidavit, report, correspondence, order, ruling
   - Filing type: court-filing, agency-complaint, police-report, medical-record, witness-statement, financial-record
   - Subject matter: misconduct, negligence, harassment, fraud, civil-rights, discrimination, abuse, malpractice
   - Status: redacted, certified, draft, final, exhibit

Respond in JSON format only:
{
  "synopsis": "Your 1-2 sentence synopsis here",
  "tags": ["tag1", "tag2", "tag3"]
}

Document name: ${documentName}

Document content:
${truncatedText}`;

    try {
      const response = await this.callVeniceAPI(
        VENICE_CONFIG.textModel,
        [{ role: 'user', content: prompt }]
      );

      return this.parseAnalysisResponse(response, VENICE_CONFIG.textModel);
    } catch (error) {
      logger.error('Failed to generate analysis with Venice API', { error, documentName });
      return {
        synopsis: `Document: ${documentName}. Analysis failed.`,
        tags: ['analysis-failed'],
        model: VENICE_CONFIG.textModel,
      };
    }
  }

  /**
   * Call Venice.ai API
   */
  private async callVeniceAPI(
    model: string,
    messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image_url?: { url: string } }> }>
  ): Promise<VeniceResponse> {
    const url = `${VENICE_CONFIG.baseUrl}/chat/completions`;

    const requestBody = {
      model,
      messages,
      max_tokens: VENICE_CONFIG.maxTokens,
      temperature: VENICE_CONFIG.temperature,
    };

    logger.debug('Calling Venice API', { model, url });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Venice API request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Venice API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as VeniceResponse;

    logger.debug('Venice API response received', {
      model: data.model,
      usage: data.usage,
      finishReason: data.choices[0]?.finish_reason
    });

    return data;
  }

  /**
   * Parse Venice API response and extract synopsis/tags
   */
  private parseAnalysisResponse(
    response: VeniceResponse,
    model: string
  ): { synopsis: string; tags: string[]; tokenUsage?: TokenUsage; model?: string } {
    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content in Venice API response');
    }

    logger.debug('Venice API response content', {
      contentLength: content.length,
      finishReason: response.choices[0]?.finish_reason,
      contentPreview: content.slice(0, 500),
    });

    // Parse JSON response - handle thinking models that may include reasoning before JSON
    const jsonMatch = content.match(/\{[\s\S]*"synopsis"[\s\S]*"tags"[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn('No JSON with synopsis/tags found in response', {
        contentPreview: content.slice(0, 1000),
      });
      throw new Error('No JSON found in Venice API response');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        synopsis: parsed.synopsis || 'Unable to generate synopsis.',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        tokenUsage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
        },
        model,
      };
    } catch (parseError) {
      logger.error('Failed to parse JSON from Venice response', {
        jsonAttempt: jsonMatch[0].slice(0, 500),
        error: parseError,
      });
      throw parseError;
    }
  }

  /**
   * Get MIME type for image extension
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'tiff': 'image/tiff',
      'webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/png';
  }
}

// Singleton instance
let documentAnalysisService: DocumentAnalysisService | null = null;

export function getDocumentAnalysisService(): DocumentAnalysisService {
  if (!documentAnalysisService) {
    documentAnalysisService = new DocumentAnalysisService();
  }
  return documentAnalysisService;
}
