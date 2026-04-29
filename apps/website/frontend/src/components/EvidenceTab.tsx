import { useState } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  ScaleIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  FolderOpenIcon,
  GlobeAltIcon,
  BriefcaseIcon,
  ClipboardDocumentListIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import type { Document, EvidenceCategory } from '../types/Document';
import { DocumentViewer } from './DocumentViewer';

interface EvidenceTabProps {
  documents: Document[];
  caseId?: string;
}

/**
 * Category metadata for evidence organization
 */
interface CategoryMetadata {
  id: EvidenceCategory;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  colorClass: string;
}

const EVIDENCE_CATEGORIES: CategoryMetadata[] = [
  {
    id: 'court-documents',
    label: 'Court Documents',
    description: 'Official court filings, orders, and legal proceedings',
    icon: ScaleIcon,
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
  },
  {
    id: 'formal-complaints',
    label: 'Formal Complaints',
    description: 'Official complaints filed with authorities or organizations',
    icon: DocumentTextIcon,
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  },
  {
    id: 'police-reports',
    label: 'Police Reports',
    description: 'Law enforcement incident reports and documentation',
    icon: ShieldExclamationIcon,
    colorClass: 'text-red-700 bg-red-50 border-red-200',
  },
  {
    id: 'attorney-correspondence',
    label: 'Attorney Correspondence',
    description: 'Communications and documents from legal counsel',
    icon: BriefcaseIcon,
    colorClass: 'text-slate-700 bg-slate-50 border-slate-200',
  },
  {
    id: 'email-communications',
    label: 'E-Mail Communications',
    description: 'Email correspondence relevant to the case',
    icon: EnvelopeIcon,
    colorClass: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  },
  {
    id: 'global-casefiles',
    label: 'Global Casefiles',
    description: 'Case timelines, narratives, and summary documentation',
    icon: GlobeAltIcon,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  },
  {
    id: 'public-documents',
    label: 'Public Documents',
    description: 'Publicly available records and financial statements',
    icon: FolderOpenIcon,
    colorClass: 'text-orange-700 bg-orange-50 border-orange-200',
  },
  {
    id: 'documented-harassment',
    label: 'Documented Harassment',
    description: 'Evidence of harassment incidents and patterns',
    icon: ExclamationTriangleIcon,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Case studies, narratives, timelines, and supporting materials',
    icon: ClipboardDocumentListIcon,
    colorClass: 'text-violet-700 bg-violet-50 border-violet-200',
  },
  {
    id: 'case-narrative',
    label: 'Case Narrative',
    description: 'Detailed case narratives and analytical reports',
    icon: BookOpenIcon,
    colorClass: 'text-rose-700 bg-rose-50 border-rose-200',
  },
  {
    id: 'ywca-missoula',
    label: 'YWCA Missoula',
    description: 'Documentation related to YWCA Missoula organization',
    icon: BuildingOfficeIcon,
    colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
  },
  {
    id: 'victim-statements',
    label: 'Victim Statements',
    description: 'Testimonies and evidence from affected individuals',
    icon: UserGroupIcon,
    colorClass: 'text-purple-700 bg-purple-50 border-purple-200',
  },
];

/**
 * EvidenceTab Component
 *
 * Displays evidentiary documentation organized by category with accordion UI.
 * Follows WCAG AAA accessibility standards with keyboard navigation and screen reader support.
 */
export const EvidenceTab = ({ documents, caseId }: EvidenceTabProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<EvidenceCategory>>(
    new Set()
  );

  // Group documents by evidence category
  const documentsByCategory = EVIDENCE_CATEGORIES.reduce((acc, category) => {
    acc[category.id] = documents.filter((doc) => doc.evidenceCategory === category.id);
    return acc;
  }, {} as Record<EvidenceCategory, Document[]>);

  // Toggle accordion category
  const toggleCategory = (categoryId: EvidenceCategory) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Check if any evidence exists
  const totalEvidenceCount = Object.values(documentsByCategory).reduce(
    (sum, docs) => sum + docs.length,
    0
  );

  if (totalEvidenceCount === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
        <DocumentTextIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-neutral-700 mb-2">No Evidence Documents</h3>
        <p className="text-neutral-600">
          No evidentiary documentation has been uploaded for this case yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Evidence Overview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-primary-700 mb-2">Evidentiary Documentation</h3>
        <p className="text-neutral-700 text-sm">
          Supporting evidence organized by category. All documents are permanently archived on
          Arweave and cannot be censored or deleted.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm text-neutral-600">
          <span className="font-medium">Total Evidence: {totalEvidenceCount} documents</span>
          <span>•</span>
          <span>{expandedCategories.size} of {EVIDENCE_CATEGORIES.length} categories expanded</span>
        </div>
      </div>

      {/* Accordion Categories */}
      <div className="space-y-3">
        {EVIDENCE_CATEGORIES.map((category) => {
          const categoryDocs = documentsByCategory[category.id];
          const isExpanded = expandedCategories.has(category.id);
          const Icon = category.icon;

          if (categoryDocs.length === 0) {
            // Don't render empty categories
            return null;
          }

          return (
            <div
              key={category.id}
              className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden"
            >
              {/* Accordion Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={`
                  w-full px-6 py-4 flex items-center justify-between
                  hover:bg-neutral-50 transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
                  cursor-pointer
                `}
                aria-expanded={isExpanded}
                aria-controls={`evidence-category-${category.id}`}
                type="button"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div
                    className={`
                      p-3 rounded-lg border
                      ${category.colorClass}
                    `}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </div>

                  {/* Category Info */}
                  <div className="text-left flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="text-lg font-bold text-primary-700">
                        {category.label}
                      </h4>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {categoryDocs.length} {categoryDocs.length === 1 ? 'document' : 'documents'}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {category.description}
                    </p>
                  </div>
                </div>

                {/* Expand/Collapse Icon */}
                {isExpanded ? (
                  <ChevronDownIcon
                    className="h-6 w-6 text-neutral-400 flex-shrink-0 ml-4"
                    aria-hidden="true"
                  />
                ) : (
                  <ChevronRightIcon
                    className="h-6 w-6 text-neutral-400 flex-shrink-0 ml-4"
                    aria-hidden="true"
                  />
                )}
              </button>

              {/* Accordion Content */}
              {isExpanded && (
                <div
                  id={`evidence-category-${category.id}`}
                  className="border-t border-neutral-200"
                  role="region"
                  aria-labelledby={`evidence-category-header-${category.id}`}
                >
                  <div className="p-6 bg-neutral-50">
                    {/* Use existing DocumentViewer for consistent document display */}
                    <DocumentViewer
                      documents={categoryDocs}
                      caseId={caseId}
                      emptyMessage={`No ${category.label.toLowerCase()} have been uploaded yet.`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expand/Collapse All Controls */}
      <div className="flex justify-end gap-2">
        <button
          onClick={() => setExpandedCategories(new Set(EVIDENCE_CATEGORIES.map((c) => c.id)))}
          className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors cursor-pointer"
          type="button"
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedCategories(new Set())}
          className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          type="button"
        >
          Collapse All
        </button>
      </div>
    </div>
  );
};
