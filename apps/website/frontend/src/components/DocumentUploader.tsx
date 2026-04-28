import { useState, useRef, useCallback } from 'react';
import {
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { documentService } from '../services/documentService';
import { formatFileSize } from '../utils/fileUtils';
import { validateAndCheckFileType } from '../utils/fileTypeValidation';
import { getShortFileTypeLabel } from '../utils/fileTypeLabels';
import type { UploadedFile } from '../types/Document';

interface DocumentUploaderProps {
  caseId?: string;
  maxFileSize?: number; // in MB
  maxFiles?: number;
  acceptedFileTypes?: string[];
  onUploadComplete?: (files: UploadedFile[]) => void;
  onUploadError?: (error: string) => void;
}

// Default accepted file types for legal documents
const DEFAULT_ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const DocumentUploader = ({
  caseId,
  maxFileSize = 10, // 10 MB default
  maxFiles = 5,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  onUploadComplete,
  onUploadError,
}: DocumentUploaderProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate unique ID for uploaded files
  const generateFileId = () => `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Validate file size
  const validateFileSize = useCallback(
    (file: File): boolean => {
      const maxBytes = maxFileSize * 1024 * 1024;
      return file.size <= maxBytes;
    },
    [maxFileSize]
  );

  // Handle file selection with async magic number validation
  const handleFiles = useCallback(async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Check if adding these files exceeds max files limit
    if (files.length + selectedFiles.length > maxFiles) {
      const errorMsg = `Cannot upload more than ${maxFiles} files. Currently have ${files.length} file(s).`;
      onUploadError?.(errorMsg);
      return;
    }

    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    // Validate each file asynchronously
    for (const file of Array.from(selectedFiles)) {
      // Validate file size first (quick check)
      if (!validateFileSize(file)) {
        errors.push(`${file.name}: File size exceeds ${maxFileSize} MB limit.`);
        continue;
      }

      // Validate file type using magic number (security check)
      const validation = await validateAndCheckFileType(file, acceptedFileTypes);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.reason || 'Invalid file type'}`);
        continue;
      }

      newFiles.push({
        file,
        id: generateFileId(),
        status: 'pending',
        progress: 0,
      });
    }

    if (errors.length > 0) {
      onUploadError?.(errors.join('\n'));
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
    }
  }, [files.length, maxFiles, maxFileSize, acceptedFileTypes, onUploadError, validateFileSize]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle drag and drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  // Upload files to Arweave using document service
  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');

    if (pendingFiles.length === 0) {
      onUploadError?.('No files to upload');
      return;
    }

    // Update all pending files to uploading status
    setFiles((prev) =>
      prev.map((f) =>
        f.status === 'pending' ? { ...f, status: 'uploading', progress: 0 } : f
      )
    );

    // Upload each file to Arweave
    for (const uploadedFile of pendingFiles) {
      try {
        // Track upload completion to prevent race conditions
        let uploadComplete = false;

        // Upload to Arweave with progress tracking
        const result = await documentService.uploadDocument(
          uploadedFile.file,
          {
            name: uploadedFile.file.name,
            type: uploadedFile.file.type,
            size: uploadedFile.file.size,
            caseId,
          },
          (progress) => {
            // Only update progress if upload hasn't completed yet
            if (!uploadComplete) {
              setFiles((prev) =>
                prev.map((f) =>
                  // Double-check status is still 'uploading' to prevent race conditions
                  f.id === uploadedFile.id && f.status === 'uploading'
                    ? { ...f, progress }
                    : f
                )
              );
            }
          }
        );

        // Mark upload as complete
        uploadComplete = true;

        // Mark as success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: 'success', progress: 100, arweaveId: result.arweaveId }
              : f
          )
        );
      } catch (error) {
        // Mark upload as complete (error case)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Upload failed',
                }
              : f
          )
        );
      }
    }

    // Callback when all uploads complete
    const uploadedFiles = files.filter((f) => f.status === 'success');
    onUploadComplete?.(uploadedFiles);
  };

  // Get status icon
  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'error':
        return <ExclamationCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      <h3 className="text-lg font-bold text-primary-700 mb-4">Upload Documents</h3>

      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-neutral-300 bg-neutral-50 hover:border-primary-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="region"
        aria-label="File upload drop zone"
        aria-describedby="upload-instructions"
      >
        <DocumentArrowUpIcon
          className="h-12 w-12 text-neutral-400 mx-auto mb-4"
          aria-hidden="true"
        />
        <p className="text-neutral-700 font-medium mb-2" id="upload-instructions">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-neutral-500 mb-4">
          Accepted: PDF, Images, Word Documents, Text Files (Max {maxFileSize} MB each)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedFileTypes.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
          aria-label="Upload documents"
          id="file-upload-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors cursor-pointer"
          aria-label="Browse files to upload"
          aria-controls="file-upload-input"
        >
          Browse Files
        </button>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-neutral-700 mb-3">
            Selected Files ({files.length}/{maxFiles})
          </h4>
          <div className="space-y-3">
            {files.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getStatusIcon(uploadedFile.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900 truncate">
                        {uploadedFile.file.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {formatFileSize(uploadedFile.file.size)} •{' '}
                        {getShortFileTypeLabel(uploadedFile.file.type)}
                      </p>
                      {uploadedFile.status === 'error' && uploadedFile.error && (
                        <p className="text-xs text-red-600 mt-1">{uploadedFile.error}</p>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {uploadedFile.status === 'uploading' && (
                    <div className="mt-2">
                      <div
                        className="w-full bg-neutral-200 rounded-full h-2"
                        role="progressbar"
                        aria-valuenow={uploadedFile.progress}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Uploading ${uploadedFile.file.name}`}
                      >
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadedFile.progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-neutral-500 mt-1" aria-live="polite">
                        Uploading... {uploadedFile.progress}%
                      </p>
                    </div>
                  )}

                  {uploadedFile.status === 'success' && uploadedFile.arweaveId && (
                    <p className="text-xs text-green-600 mt-1">
                      ✓ Uploaded to Arweave: {uploadedFile.arweaveId}
                    </p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadedFile.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="ml-4 p-1 text-neutral-400 hover:text-red-600 transition-colors"
                    aria-label={`Remove ${uploadedFile.file.name}`}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={uploadFiles}
            disabled={files.every((f) => f.status !== 'pending')}
            className="mt-4 w-full bg-gold-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gold-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
            aria-label={`Upload ${files.filter((f) => f.status === 'pending').length} file(s) to Arweave`}
            aria-disabled={files.every((f) => f.status !== 'pending')}
          >
            Upload to Arweave
          </button>
        </div>
      )}
    </div>
  );
};
