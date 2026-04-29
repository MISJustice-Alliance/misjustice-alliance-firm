/**
 * Migration 008: Add Evidence Categories to Case Documents
 *
 * Adds evidence_category field to support separation of legal filings
 * from evidentiary documentation (47 files in content-archive).
 *
 * Categories:
 * - court-documents (9 files)
 * - formal-complaints (14 files)
 * - other-victims (4 files)
 * - police-reports (1 file)
 * - tyleen-root-harassment (18 files)
 * - ywca-missoula (1 file)
 */

-- Add evidence_category column (nullable to support existing records)
ALTER TABLE case_documents
ADD COLUMN IF NOT EXISTS evidence_category VARCHAR(50) NULL;

-- Add check constraint for valid categories (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_evidence_category'
  ) THEN
    ALTER TABLE case_documents
    ADD CONSTRAINT check_evidence_category
    CHECK (
      evidence_category IS NULL OR
      evidence_category IN (
        'court-documents',
        'formal-complaints',
        'other-victims',
        'police-reports',
        'tyleen-root-harassment',
        'ywca-missoula'
      )
    );
  END IF;
END $$;

-- Add index for filtering by evidence category
CREATE INDEX IF NOT EXISTS idx_case_documents_evidence_category
ON case_documents(evidence_category)
WHERE evidence_category IS NOT NULL;

-- Add composite index for case_id + evidence_category queries
CREATE INDEX IF NOT EXISTS idx_case_documents_case_evidence
ON case_documents(case_id, evidence_category)
WHERE evidence_category IS NOT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN case_documents.evidence_category IS
  'Subcategory for evidentiary documentation. NULL for standard case filings (complaints, briefs, motions). Set for supporting evidence materials. Used to organize evidence in separate accordion UI sections.';

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 008 complete: Evidence categories added';
  RAISE NOTICE 'evidence_category field supports UI separation of filings vs evidence';
  RAISE NOTICE 'Indexes created for efficient category filtering';
END $$;
