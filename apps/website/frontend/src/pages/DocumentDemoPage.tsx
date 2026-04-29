import { useState } from 'react';
import { DocumentUploader } from '../components/DocumentUploader';
import { DocumentViewer } from '../components/DocumentViewer';
import { createArweaveTxId } from '../types/arweave';
import type { UploadedFile, Document } from '../types/Document';

/**
 * Demo page showing DocumentUploader and DocumentViewer components
 * This page demonstrates the complete document upload and viewing workflow
 */
export const DocumentDemoPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle successful uploads
  const handleUploadComplete = (uploadedFiles: UploadedFile[]) => {
    console.log('Upload complete:', uploadedFiles);

    // Convert uploaded files to documents
    const newDocuments = uploadedFiles
      .filter((f) => f.status === 'success' && f.arweaveId)
      .map((f): Document | null => {
        const validatedArweaveId = createArweaveTxId(f.arweaveId!);
        if (!validatedArweaveId) {
          console.error(`Invalid Arweave transaction ID: ${f.arweaveId}`);
          return null;
        }
        return {
          id: f.id,
          name: f.file.name,
          type: f.file.type,
          size: f.file.size,
          arweaveId: validatedArweaveId,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Demo User',
          verified: true,
          description: `Uploaded via DocumentUploader demo`,
        };
      })
      .filter((doc): doc is Document => doc !== null);

    setDocuments((prev) => [...prev, ...newDocuments]);
    setUploadError(null);
  };

  // Handle upload errors
  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
    setUploadError(error);
  };

  // Handle document click
  const handleDocumentClick = (document: Document) => {
    console.log('Document clicked:', document);
  };

  // Handle document download
  const handleDocumentDownload = (document: Document) => {
    console.log('Document download:', document);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-700 font-serif mb-2">
          Document Management Demo
        </h1>
        <p className="text-neutral-600">
          Upload legal documents to Arweave and view them in a permanent, censorship-resistant
          archive.
        </p>
      </div>

      {/* Upload Error Display */}
      {uploadError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-bold mb-2">Upload Error</h3>
          <p className="text-red-600 whitespace-pre-line">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Document Uploader */}
      <div className="mb-8">
        <DocumentUploader
          caseId="demo-case-123"
          maxFileSize={10}
          maxFiles={5}
          onUploadComplete={handleUploadComplete}
          onUploadError={handleUploadError}
        />
      </div>

      {/* Document Viewer */}
      <div>
        <DocumentViewer
          documents={documents}
          caseId="demo-case-123"
          onDocumentClick={handleDocumentClick}
          onDocumentDownload={handleDocumentDownload}
          emptyMessage="Upload some documents above to see them appear here."
        />
      </div>

      {/* Developer Info */}
      <div className="mt-8 bg-neutral-50 rounded-xl border border-neutral-200 p-6">
        <h3 className="text-lg font-bold text-neutral-700 mb-3">Developer Notes</h3>
        <div className="space-y-2 text-sm text-neutral-600">
          <p>
            <strong>Mock Upload:</strong> Currently using mock Arweave uploads. In production,
            replace with actual Turbo.io integration in{' '}
            <code className="bg-neutral-200 px-1 rounded">documentService.ts</code>
          </p>
          <p>
            <strong>Accepted Files:</strong> PDF, Images (JPEG/PNG/GIF), Word Documents, Text
            Files
          </p>
          <p>
            <strong>Max File Size:</strong> 10 MB per file
          </p>
          <p>
            <strong>Max Files:</strong> 5 files per upload batch
          </p>
          <p>
            <strong>Progress Tracking:</strong> Real-time progress updates during upload
          </p>
          <p>
            <strong>Permanent Storage:</strong> All documents stored on Arweave permaweb (cannot
            be deleted or censored)
          </p>
        </div>
      </div>
    </div>
  );
};
