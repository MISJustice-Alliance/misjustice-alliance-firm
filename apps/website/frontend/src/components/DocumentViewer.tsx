import { useState } from 'react';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  CheckBadgeIcon,
  ClockIcon,
  GlobeAltIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';
import { getArweaveUrl } from '../types/arweave';
import { formatDate } from '../utils/dateUtils';
import { formatFileSize } from '../utils/fileUtils';
import { getFileTypeLabel } from '../utils/fileTypeLabels';
import type { Document } from '../types/Document';
import { config } from '../config/env';

interface DocumentViewerProps {
  documents: Document[];
  caseId?: string;
  onDocumentClick?: (document: Document) => void;
  onDocumentDownload?: (document: Document) => void;
  emptyMessage?: string;
}

// Document type icons
const getDocumentIcon = (type: string) => {
  if (type.includes('pdf')) {
    return '📄';
  } else if (type.includes('image')) {
    return '🖼️';
  } else if (type.includes('word') || type.includes('document')) {
    return '📝';
  } else if (type.includes('text')) {
    return '📃';
  } else {
    return '📎';
  }
};

export const DocumentViewer = ({
  documents,
  caseId,
  onDocumentClick,
  onDocumentDownload,
  emptyMessage = 'No documents have been uploaded for this case yet.',
}: DocumentViewerProps) => {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Get document URL (Arweave or local API endpoint)
  const getDocumentUrl = (document: Document): string => {
    if (document.arnsUrl) {
      return document.arnsUrl;
    }
    if (document.arweaveId) {
      return getArweaveUrl(document.arweaveId);
    }
    // Local document - use backend API
    return `${config.apiBaseUrl}/documents/${document.id}/download`;
  };

  // Handle document preview
  const handlePreview = (document: Document) => {
    const previewUrl = getDocumentUrl(document);
    window.open(previewUrl, '_blank', 'noopener,noreferrer');
    onDocumentClick?.(document);
  };

  // Handle document download
  const handleDownload = async (document: Document) => {
    try {
      const downloadUrl = getDocumentUrl(document);

      // Create temporary anchor element for download
      const link = window.document.createElement('a');
      link.href = downloadUrl;
      link.download = document.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';

      // Trigger download
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);

      onDocumentDownload?.(document);
      setDownloadError(null); // Clear any previous errors
    } catch (error) {
      console.error('Download failed:', error);
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Failed to download document. Please try again.'
      );
    }
  };

  // Toggle document details
  const toggleExpanded = (docId: string) => {
    setExpandedDocId((prev) => (prev === docId ? null : docId));
  };

  if (documents.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
        <DocumentTextIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-neutral-700 mb-2">No Documents</h3>
        <p className="text-neutral-600">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-primary-700">
          Case Documents ({documents.length})
        </h3>
        {caseId && (
          <p className="text-sm text-neutral-500">
            All documents permanently archived on Arweave
          </p>
        )}
      </div>

      {/* Download Error Display */}
      {downloadError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-bold mb-2">Download Error</h3>
          <p className="text-red-600">{downloadError}</p>
          <button
            onClick={() => setDownloadError(null)}
            className="mt-2 text-sm text-red-700 hover:text-red-800 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-3">
        {documents.map((document) => {
          const isExpanded = expandedDocId === document.id;

          return (
            <article
              key={document.id}
              className="border border-neutral-200 rounded-lg overflow-hidden hover:border-primary-300 transition-colors"
            >
              {/* Document Header */}
              <div className="p-4 bg-neutral-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="text-2xl flex-shrink-0">
                      {getDocumentIcon(document.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-neutral-900 truncate">
                          {document.name}
                        </h4>
                        {document.verified ? (
                          <CheckBadgeIcon
                            className="h-4 w-4 text-green-600 flex-shrink-0"
                            aria-label="Verified on Arweave"
                          />
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium flex-shrink-0">
                            <ServerIcon className="h-3 w-3" />
                            <span>Local</span>
                          </div>
                        )}
                        {document.arnsStatus === 'active' && document.arnsUndername && (
                          <div className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium flex-shrink-0">
                            <GlobeAltIcon className="h-3 w-3" />
                            <span>ArNS</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-neutral-500">
                        <span>{getFileTypeLabel(document.type)}</span>
                        <span>•</span>
                        <span>{formatFileSize(document.size)}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatDate(document.uploadedAt)}</span>
                        </span>
                      </div>
                      {document.description && (
                        <p className="text-sm text-neutral-600 mt-2">
                          {document.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handlePreview(document)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      aria-label={`Preview ${document.name}`}
                      title="Preview"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDownload(document)}
                      className="p-2 text-gold-600 hover:bg-gold-50 rounded-lg transition-colors"
                      aria-label={`Download ${document.name}`}
                      title="Download"
                    >
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => toggleExpanded(document.id)}
                      className="px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Hide details' : 'Show details'}
                    >
                      {isExpanded ? 'Less' : 'More'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-4 bg-white border-t border-neutral-200">
                  {/* Synopsis Section */}
                  {document.synopsis && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                        Synopsis
                      </h5>
                      <p className="text-sm text-neutral-700 leading-relaxed">
                        {document.synopsis}
                      </p>
                    </div>
                  )}

                  {/* Tags Section */}
                  {document.tags && document.tags.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                        Tags
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {document.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-primary-50 text-primary-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Archive Info Section */}
                  {(document.synopsis || (document.tags && document.tags.length > 0)) && (
                    <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 mt-4 pt-4 border-t border-neutral-100">
                      Archive Info
                    </h5>
                  )}

                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {document.arweaveId ? (
                      <div>
                        <dt className="font-medium text-neutral-500 mb-1">
                          Arweave Transaction ID
                        </dt>
                        <dd className="font-mono text-xs text-neutral-900 break-all">
                          {document.arweaveId}
                        </dd>
                      </div>
                    ) : (
                      <div>
                        <dt className="font-medium text-neutral-500 mb-1">
                          Storage Status
                        </dt>
                        <dd className="text-amber-700">
                          Stored locally - pending Arweave archival
                        </dd>
                      </div>
                    )}
                    {document.arnsUndername && (
                      <div>
                        <dt className="font-medium text-neutral-500 mb-1">
                          ArNS Undername
                        </dt>
                        <dd className="font-mono text-xs text-blue-700 break-all">
                          {document.arnsUndername}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-neutral-500 mb-1">Uploaded By</dt>
                      <dd className="text-neutral-900">
                        {document.uploadedBy || 'Anonymous'}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium text-neutral-500 mb-1">Upload Date</dt>
                      <dd className="text-neutral-900">{formatDate(document.uploadedAt)}</dd>
                    </div>
                    {document.md5Hash && (
                      <div>
                        <dt className="font-medium text-neutral-500 mb-1">
                          MD5 Checksum
                        </dt>
                        <dd className="font-mono text-xs text-neutral-900 break-all">
                          {document.md5Hash}
                        </dd>
                        <dd className="text-xs text-neutral-500 mt-1">
                          Verify with: <code className="bg-neutral-100 px-1 rounded">md5sum &lt;file&gt;</code>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium text-neutral-500 mb-1">
                        Archive Status
                      </dt>
                      <dd>
                        {document.verified ? (
                          <span className="inline-flex items-center space-x-1 text-green-700">
                            <CheckBadgeIcon className="h-4 w-4" />
                            <span>Archived on Arweave</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-amber-700">
                            <ServerIcon className="h-4 w-4" />
                            <span>Local storage (pending archival)</span>
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 pt-4 border-t border-neutral-200 flex flex-col sm:flex-row gap-3">
                    {/* ArNS URL (if available) */}
                    {document.arnsUrl && (
                      <a
                        href={document.arnsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        <GlobeAltIcon className="h-4 w-4" />
                        <span>View via ArNS (Human-Readable)</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}

                    {/* Direct Arweave URL or Local Download */}
                    {document.arweaveId ? (
                      <a
                        href={getArweaveUrl(document.arweaveId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <span>View on Arweave Permaweb</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    ) : (
                      <a
                        href={`${config.apiBaseUrl}/documents/${document.id}/download`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <ServerIcon className="h-4 w-4" />
                        <span>View Document</span>
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="mt-6 pt-6 border-t border-neutral-200">
        <div className="flex items-start space-x-2 text-sm text-neutral-600">
          <CheckBadgeIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
          <p>
            Documents marked with <CheckBadgeIcon className="h-4 w-4 text-green-600 inline" /> are permanently stored on the Arweave permaweb and cannot be
            censored or deleted. Documents marked <span className="text-amber-700 font-medium">Local</span> are pending archival to Arweave.
          </p>
        </div>
      </div>
    </div>
  );
};
