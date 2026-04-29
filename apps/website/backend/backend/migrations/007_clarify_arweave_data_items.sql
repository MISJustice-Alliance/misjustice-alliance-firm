/**
 * Migration 007: Clarify Arweave Data Item Storage
 *
 * Updates schema documentation to clarify that arweave_tx_id stores
 * ANS-104 data item IDs (not bundle IDs). Each document gets its own
 * unique data item ID from Turbo SDK uploads.
 *
 * No schema changes needed - existing arweave_tx_id column already
 * stores data item IDs correctly. This migration adds documentation.
 */

-- Add comment to clarify what arweave_tx_id stores
COMMENT ON COLUMN case_documents.arweave_tx_id IS
  'ANS-104 data item ID from Arweave (unique per document). ' ||
  'Access document at: https://arweave.net/{arweave_tx_id} or ' ||
  'via ArNS undername for human-readable URLs.';

-- Add comment about document_hash usage
COMMENT ON COLUMN case_documents.document_hash IS
  'SHA-256 hash of the document content for integrity verification. ' ||
  'Used to verify downloads match uploaded content.';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 007 complete: Schema documentation updated';
  RAISE NOTICE 'arweave_tx_id now clearly documented as ANS-104 data item ID';
  RAISE NOTICE 'Each document has unique permanent Arweave storage';
END $$;
