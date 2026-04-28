import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import type { Case } from '../types/Case';
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '../types/Case';
import { caseService } from '../services/caseService';
import { documentService } from '../services/documentService';
import { formatDate } from '../utils/dateUtils';
import { DocumentViewer } from '../components/DocumentViewer';
import { EvidenceTab } from '../components/EvidenceTab';
import type { Document } from '../types/Document';
import { useSEO } from '../hooks/useSEO';

interface CaseError {
  type: 'not-found' | 'network' | 'unknown';
  message: string;
}

type DocumentTab = 'case-filings' | 'evidence';

export const CaseDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<CaseError | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeTab, setActiveTab] = useState<DocumentTab>('case-filings');

  // Dynamic SEO based on case data
  const caseTitle = caseData ? `${caseData.plaintiff} v. ${caseData.defendant}` : 'Case Details';
  const caseType = caseData?.causesOfAction?.join(', ') || 'Legal case';

  useSEO({
    title: caseTitle,
    description: caseData
      ? `${caseTitle} - ${caseType} in ${caseData.jurisdiction || 'Unknown jurisdiction'}. View documented evidence and case details on MISJustice Alliance.`
      : 'View documented legal case details, evidence, and case filings on MISJustice Alliance.',
    keywords: caseData
      ? `${caseData.plaintiff}, ${caseData.defendant}, ${caseType}, ${caseData.jurisdiction || ''}, legal case, civil rights, documented evidence`.replace(/, ,/g, ',')
      : 'legal case, case details, documented evidence, civil rights violation',
    canonicalUrl: id ? `https://misjusticealliance.org/cases/${id}` : undefined,
    structuredData: caseData
      ? {
          '@context': 'https://schema.org',
          '@type': 'Article',
          name: caseTitle,
          headline: caseTitle,
          description: caseData.caseFacts || `Legal case documentation for ${caseTitle}`,
          url: `https://misjusticealliance.org/cases/${id}`,
          datePublished: caseData.filedDate || caseData.createdAt,
          dateModified: caseData.updatedAt,
          author: {
            '@type': 'Organization',
            name: 'MISJustice Alliance',
          },
          publisher: {
            '@type': 'Organization',
            name: 'MISJustice Alliance',
            logo: {
              '@type': 'ImageObject',
              url: 'https://misjusticealliance.org/favicon.png',
            },
          },
        }
      : undefined,
  });

  useEffect(() => {
    if (!id) return;

    const loadCase = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await caseService.getCaseById(id);

        if (!data) {
          setError({
            type: 'not-found',
            message: 'Case not found',
          });
          return;
        }

        setCaseData(data);
      } catch (err) {
        if (err instanceof Error) {
          // Check if it's a 404 from API
          if (err.message.includes('404') || err.message.includes('not found')) {
            setError({
              type: 'not-found',
              message: `Case with ID "${id}" does not exist.`,
            });
          } else {
            setError({
              type: 'network',
              message: err.message,
            });
          }
        } else {
          setError({
            type: 'unknown',
            message: 'An unexpected error occurred',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    loadCase();
  }, [id]);

  // Load documents for the case
  useEffect(() => {
    if (!id) return;

    const loadDocuments = async () => {
      try {
        const docs = await documentService.getDocumentsByCaseId(id);
        setDocuments(docs);
      } catch (err) {
        console.error('Error loading documents:', err);
        // Don't set error state - allow page to render without documents
      }
    };

    loadDocuments();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600">Loading case details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Special UI for 404 errors
    if (error.type === 'not-found') {
      return (
        <div className="max-w-7xl mx-auto px-6">
          <Link
            to="/cases"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Cases
          </Link>

          <div className="bg-white rounded-xl border border-neutral-200 p-12 text-center">
            <ScaleIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Case Not Found</h1>
            <p className="text-neutral-600 mb-6">{error.message}</p>
            <Link
              to="/cases"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition-colors cursor-pointer"
            >
              Browse All Cases
            </Link>
          </div>
        </div>
      );
    }

    // Generic error UI for network/unknown errors
    return (
      <div className="max-w-7xl mx-auto px-6">
        <Link
          to="/cases"
          className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Cases
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-bold mb-2">Error Loading Case</h3>
          <p className="text-red-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Back Button */}
      <Link
        to="/cases"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-6 font-medium"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2" />
        Back to Cases
      </Link>

      {/* Case Header */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-primary-700 font-serif mb-2">
              {caseData.caseNumber}
            </h1>
            <p className="text-xl text-neutral-700 font-medium">
              {caseData.plaintiffAnon || caseData.plaintiff} v. {caseData.defendant}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              CASE_STATUS_COLORS[caseData.status]
            }`}
          >
            {CASE_STATUS_LABELS[caseData.status]}
          </span>
        </div>

        {/* Case Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-neutral-200 pt-6">
          <div className="flex items-start space-x-3">
            <MapPinIcon className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-500">Jurisdiction</p>
              <p className="text-neutral-900">{caseData.jurisdiction}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <CalendarIcon className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-500">Filed Date</p>
              <p className="text-neutral-900">{formatDate(caseData.filedDate)}</p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <UserIcon className="h-5 w-5 text-neutral-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-neutral-500">Parties</p>
              <p className="text-neutral-900 text-sm">
                {caseData.plaintiffAnon || caseData.plaintiff} (Plaintiff)
                <br />
                {caseData.defendant} (Defendant)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Causes of Action */}
      {caseData.causesOfAction && caseData.causesOfAction.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-primary-700 mb-4">Causes of Action</h2>
          <div className="flex flex-wrap gap-3">
            {caseData.causesOfAction.map((cause, index) => (
              <span
                key={index}
                className="bg-primary-50 text-primary-700 px-4 py-2 rounded-lg text-sm font-medium"
              >
                {cause}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Case Facts */}
      {caseData.caseFacts && (
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-primary-700 mb-4 flex items-center">
            <DocumentTextIcon className="h-6 w-6 mr-2" />
            Case Facts
          </h2>
          <div className="prose prose-neutral max-w-none">
            <p className="text-neutral-700 leading-relaxed whitespace-pre-line">
              {caseData.caseFacts}
            </p>
          </div>
        </div>
      )}

      {/* Arweave Archive */}
      {caseData.arweaveTxIds && caseData.arweaveTxIds.length > 0 && (
        <div className="bg-gradient-to-br from-gold-50 to-gold-100 rounded-xl border border-gold-200 p-8 mb-6">
          <h2 className="text-xl font-bold text-primary-700 mb-4 flex items-center">
            <GlobeAltIcon className="h-6 w-6 mr-2" />
            Permanent Archive (Arweave)
          </h2>
          <p className="text-neutral-700 mb-4">
            This case has been permanently archived on the Arweave permaweb and cannot be
            censored or deleted.
          </p>
          <div className="space-y-2">
            {caseData.arweaveTxIds.map((txId, index) => (
              <a
                key={index}
                href={`https://arweave.net/${txId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-lg p-4 hover:shadow-md transition-shadow duration-200 border border-gold-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-neutral-500">Transaction #{index + 1}</p>
                    <p className="font-mono text-sm text-neutral-900">{txId}</p>
                  </div>
                  <svg
                    className="h-5 w-5 text-gold-600"
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
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section with Tabs */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-primary-700 mb-4">Case Documentation</h2>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mb-6">
          <div className="flex border-b border-neutral-200" role="tablist" aria-label="Case documentation tabs">
            <button
              onClick={() => setActiveTab('case-filings')}
              className={`
                flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
                cursor-pointer
                ${
                  activeTab === 'case-filings'
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }
              `}
              role="tab"
              aria-selected={activeTab === 'case-filings'}
              aria-controls="case-filings-panel"
              id="case-filings-tab"
              type="button"
            >
              <div className="flex items-center justify-center gap-2">
                <ScaleIcon className="h-5 w-5" aria-hidden="true" />
                <span>Case Filings</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                  {documents.filter((doc) => !doc.evidenceCategory).length}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('evidence')}
              className={`
                flex-1 px-6 py-4 text-sm font-medium transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset
                cursor-pointer
                ${
                  activeTab === 'evidence'
                    ? 'bg-primary-50 text-primary-700 border-b-2 border-primary-600'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }
              `}
              role="tab"
              aria-selected={activeTab === 'evidence'}
              aria-controls="evidence-panel"
              id="evidence-tab"
              type="button"
            >
              <div className="flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                <span>Evidence</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
                  {documents.filter((doc) => doc.evidenceCategory).length}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Tab Panels */}
        {activeTab === 'case-filings' && (
          <div
            role="tabpanel"
            id="case-filings-panel"
            aria-labelledby="case-filings-tab"
          >
            <DocumentViewer
              documents={documents.filter((doc) => !doc.evidenceCategory)}
              caseId={id}
              emptyMessage="No case filings have been uploaded yet. Case filings include complaints, briefs, motions, and other legal procedural documents."
            />
          </div>
        )}

        {activeTab === 'evidence' && (
          <div
            role="tabpanel"
            id="evidence-panel"
            aria-labelledby="evidence-tab"
          >
            <EvidenceTab
              documents={documents.filter((doc) => doc.evidenceCategory)}
              caseId={id}
            />
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neutral-600">
          <div>
            <span className="font-medium">Created:</span>{' '}
            {formatDate(caseData.createdAt)}
          </div>
          <div>
            <span className="font-medium">Last Updated:</span>{' '}
            {formatDate(caseData.updatedAt)}
          </div>
        </div>
      </div>
    </div>
  );
};
