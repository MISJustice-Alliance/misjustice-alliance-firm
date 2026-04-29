/**
 * Shared file type label mappings for consistent display across the application
 */

// MIME type to human-readable label mapping
export const FILE_TYPE_LABELS: Record<string, string> = {
  'application/pdf': 'PDF Document',
  'image/jpeg': 'JPEG Image',
  'image/png': 'PNG Image',
  'image/gif': 'GIF Image',
  'application/msword': 'Word Document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'text/plain': 'Text File',
  'application/zip': 'ZIP Archive',
};

/**
 * Get human-readable label for a MIME type
 * @param mimeType - MIME type string (e.g., 'application/pdf')
 * @returns Human-readable label (e.g., 'PDF Document'), or 'Document' if unknown
 */
export function getFileTypeLabel(mimeType: string): string {
  return FILE_TYPE_LABELS[mimeType] || 'Document';
}

/**
 * Get shortened label for file type (for compact displays)
 * @param mimeType - MIME type string
 * @returns Shortened label (e.g., 'PDF' instead of 'PDF Document')
 */
export function getShortFileTypeLabel(mimeType: string): string {
  const fullLabel = getFileTypeLabel(mimeType);
  // Remove "Document", "Image", "File" suffixes for compact display
  return fullLabel
    .replace(/ Document$/, '')
    .replace(/ Image$/, '')
    .replace(/ File$/, '')
    .replace(/ Archive$/, '');
}
