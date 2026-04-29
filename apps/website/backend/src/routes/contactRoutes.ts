/**
 * Contact Routes
 * Routes for contact form submission
 */

import { Router, Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { submitContactForm } from '../controllers/contactController';

const router = Router();

// Configure multer for file uploads
// Store in memory (buffer) for direct attachment to email
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1, // Only allow 1 file
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Supported: PDF, images, Word documents, text files.'));
    }
  },
});

/**
 * POST /api/contact
 * Submit a contact form message
 *
 * Body (multipart/form-data):
 * - message: string (required, max 2000 chars)
 * - email: string (optional) - sender's email for confirmation
 * - permissionToShare: boolean (required)
 * - attachment: file (optional, max 10MB)
 */
router.post('/', upload.single('attachment'), submitContactForm);

export default router;
