/**
 * ContentScanner
 * Scans content-archive directory for case files and documents
 *
 * Following Clean Architecture: Pure infrastructure utility
 */

import fs from 'fs/promises';
import path from 'path';

export interface DocumentFile {
  fileName: string;
  filePath: string;
  fileSize: number;
  fileExtension: string;
  mimeType: string;
}

export interface CaseDirectory {
  name: string;
  path: string;
  documents: DocumentFile[];
  images: DocumentFile[];
}

export class ContentScanner {
  private readonly contentArchivePath: string;

  constructor(contentArchivePath?: string) {
    this.contentArchivePath =
      contentArchivePath ||
      path.join(__dirname, '../../../content-archive/cases-pending');
  }

  /**
   * Scan all case directories and return structured data
   */
  async scanCasesDirectory(): Promise<CaseDirectory[]> {
    try {
      const directories = await fs.readdir(this.contentArchivePath);

      const caseDirectories = await Promise.all(
        directories
          .filter((dirName) => !dirName.startsWith('.')) // Skip hidden files
          .map(async (dirName) => this.scanCaseDirectory(dirName))
      );

      return caseDirectories.filter((dir) => dir !== null) as CaseDirectory[];
    } catch (error) {
      console.error('Error scanning cases directory:', error);
      throw new Error(
        `Failed to scan cases directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Scan a single case directory
   */
  private async scanCaseDirectory(
    dirName: string
  ): Promise<CaseDirectory | null> {
    const dirPath = path.join(this.contentArchivePath, dirName);

    try {
      const stat = await fs.stat(dirPath);

      if (!stat.isDirectory()) {
        return null;
      }

      const files = await fs.readdir(dirPath);

      const fileDetails = await Promise.all(
        files
          .filter((fileName) => !fileName.startsWith('.')) // Skip hidden files
          .map(async (fileName) => this.getFileDetails(dirPath, fileName))
      );

      // Filter out null values and separate documents from images
      const validFiles = fileDetails.filter((f) => f !== null) as DocumentFile[];

      return {
        name: dirName,
        path: dirPath,
        documents: validFiles.filter((f) => f.fileExtension === 'pdf'),
        images: validFiles.filter((f) =>
          ['png', 'jpg', 'jpeg', 'gif'].includes(f.fileExtension)
        ),
      };
    } catch (error) {
      console.error(`Error scanning directory ${dirName}:`, error);
      return null;
    }
  }

  /**
   * Get file details including size and type
   */
  private async getFileDetails(
    dirPath: string,
    fileName: string
  ): Promise<DocumentFile | null> {
    const filePath = path.join(dirPath, fileName);

    try {
      const stat = await fs.stat(filePath);

      if (!stat.isFile()) {
        return null;
      }

      const fileExtension = path.extname(fileName).slice(1).toLowerCase();
      const mimeType = this.getMimeType(fileExtension);

      return {
        fileName,
        filePath,
        fileSize: stat.size,
        fileExtension,
        mimeType,
      };
    } catch (error) {
      console.error(`Error getting file details for ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      txt: 'text/plain',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };

    return mimeTypes[extension] || 'application/octet-stream';
  }
}
