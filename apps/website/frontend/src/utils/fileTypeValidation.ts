/**
 * File type validation using magic numbers (binary signatures)
 *
 * This validates file types by checking the actual file content rather than
 * relying on MIME types which can be spoofed. Magic numbers are the first
 * few bytes of a file that identify its format.
 */

interface MagicNumber {
  signature: number[];
  offset: number;
  mimeType: string;
  extension: string;
}

// Common file type magic numbers
const MAGIC_NUMBERS: MagicNumber[] = [
  // PDF
  {
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
    offset: 0,
    mimeType: 'application/pdf',
    extension: 'pdf',
  },
  // PNG
  {
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    offset: 0,
    mimeType: 'image/png',
    extension: 'png',
  },
  // JPEG/JPG
  {
    signature: [0xFF, 0xD8, 0xFF],
    offset: 0,
    mimeType: 'image/jpeg',
    extension: 'jpg',
  },
  // GIF87a
  {
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    offset: 0,
    mimeType: 'image/gif',
    extension: 'gif',
  },
  // GIF89a
  {
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    offset: 0,
    mimeType: 'image/gif',
    extension: 'gif',
  },
  // ZIP (also used by .docx, .xlsx, etc.)
  {
    signature: [0x50, 0x4B, 0x03, 0x04], // PK..
    offset: 0,
    mimeType: 'application/zip',
    extension: 'zip',
  },
  // DOCX (ZIP-based, check for specific internal structure)
  {
    signature: [0x50, 0x4B, 0x03, 0x04],
    offset: 0,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: 'docx',
  },
];

/**
 * Read magic number from file
 * @param file - File to read
 * @param maxBytes - Maximum number of bytes to read (default: 16)
 * @returns Array of bytes from the beginning of the file
 */
async function readMagicNumber(file: File, maxBytes = 16): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const blob = file.slice(0, maxBytes);

    reader.onload = () => {
      const arrayBuffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(arrayBuffer);
      resolve(Array.from(bytes));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Check if bytes match a magic number signature
 */
function matchesSignature(bytes: number[], signature: number[], offset: number): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Validate file type using magic number
 * @param file - File to validate
 * @returns Detected MIME type, or null if unrecognized
 */
export async function validateFileType(file: File): Promise<string | null> {
  try {
    const bytes = await readMagicNumber(file);

    // Check against known magic numbers
    for (const magic of MAGIC_NUMBERS) {
      if (matchesSignature(bytes, magic.signature, magic.offset)) {
        // Special case for DOCX: verify it's not just a ZIP
        if (magic.extension === 'docx') {
          // DOCX files contain specific internal structure
          // For now, if filename ends with .docx, trust the magic number
          if (file.name.toLowerCase().endsWith('.docx')) {
            return magic.mimeType;
          }
          // Otherwise, it's just a ZIP
          continue;
        }

        return magic.mimeType;
      }
    }

    // Check for plain text (no magic number, all printable ASCII/UTF-8)
    if (isProbablyText(bytes)) {
      return 'text/plain';
    }

    return null;
  } catch (error) {
    console.error('Error validating file type:', error);
    return null;
  }
}

/**
 * Check if bytes are probably plain text
 */
function isProbablyText(bytes: number[]): boolean {
  // Check if first 100 bytes (or less) are printable ASCII/common UTF-8
  const checkBytes = bytes.slice(0, Math.min(100, bytes.length));

  for (const byte of checkBytes) {
    // Allow common text characters:
    // - ASCII printable (32-126)
    // - Newline (10), Carriage return (13), Tab (9)
    // - UTF-8 continuation bytes (128-255)
    if (
      !(byte >= 32 && byte <= 126) && // Printable ASCII
      byte !== 9 && // Tab
      byte !== 10 && // LF
      byte !== 13 && // CR
      !(byte >= 128 && byte <= 255) // UTF-8 continuation
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that detected file type matches claimed type
 * @param file - File to validate
 * @param allowedMimeTypes - Array of allowed MIME types
 * @returns True if file type is valid and allowed
 */
export async function validateAndCheckFileType(
  file: File,
  allowedMimeTypes: string[]
): Promise<{ valid: boolean; detectedType: string | null; reason?: string }> {
  const detectedType = await validateFileType(file);

  if (!detectedType) {
    return {
      valid: false,
      detectedType: null,
      reason: 'Unknown or unsupported file type',
    };
  }

  // Check if detected type is in allowed list
  if (!allowedMimeTypes.includes(detectedType)) {
    return {
      valid: false,
      detectedType,
      reason: `File type ${detectedType} is not allowed`,
    };
  }

  // Warn if browser MIME type doesn't match detected type
  if (file.type && file.type !== detectedType) {
    console.warn(
      `MIME type mismatch: Browser reported "${file.type}", but detected "${detectedType}"`
    );
  }

  return { valid: true, detectedType };
}
