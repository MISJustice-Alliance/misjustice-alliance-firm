import { useEffect, useState, useRef, useMemo } from 'react';
import {
  ScaleIcon,
  CalendarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { Case } from '../types/Case';
import { caseService } from '../services/caseService';
import {
  CaseSearchFiltersComponent,
  type CaseSearchFilters,
} from '../components/CaseSearch';
import { CaseCard } from '../components/CaseCard';
import { CaseCardSkeleton } from '../components/CaseCardSkeleton';
import { Pagination } from '../components/Pagination';
import { useSEO } from '../hooks/useSEO';
import { generateCollectionPage, generateBreadcrumbList, generateDataset } from '../utils/structuredData';
import { Breadcrumbs } from '../components/Breadcrumbs';

export const CaseListPage = () => {
  const [cases, setCases] = useState<Case[]>([]);

  // Enhanced structured data with breadcrumbs and Dataset schema for Google Dataset Search
  const structuredData = [
    generateCollectionPage({
      name: 'Legal Cases Database - MISJustice Alliance',
      description:
        'Searchable database of documented legal misconduct and civil rights violation cases with permanent Arweave archive.',
      url: 'https://misjusticealliance.org/cases',
      itemCount: cases.length,
    }),
    generateDataset(cases.length),
    generateBreadcrumbList([
      { name: 'Home', url: 'https://misjusticealliance.org' },
      { name: 'Cases' },
    ]),
  ];

  const caseListRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // SEO hook with enhanced structured data
  useSEO({
    title: 'Legal Cases Database',
    description:
      'Browse documented cases of legal misconduct, civil rights violations, police misconduct, prosecutorial abuse, and institutional corruption. Searchable database with permanent Arweave archive.',
    keywords:
      'legal cases, civil rights violations, police misconduct, prosecutorial misconduct, legal database, case search, documented misconduct, institutional abuse',
    canonicalUrl: 'https://misjusticealliance.org/cases',
    structuredData,
  });

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await caseService.getAllCases();
      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (filters: CaseSearchFilters) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentPage(1); // Reset to first page on new search

      // If no filters applied, load all cases
      const hasFilters = Object.keys(filters).length > 0;
      const data = hasFilters
        ? await caseService.searchCases(filters)
        : await caseService.getAllCases();

      setCases(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search cases');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to case list, not absolute top (keeps header visible)
    caseListRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  // Calculate pagination values (memoized for performance)
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(cases.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedCases = cases.slice(startIndex, endIndex);

    return { totalPages, displayedCases };
  }, [cases, currentPage, itemsPerPage]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-primary-700 font-serif mb-2">
            Legal Cases
          </h1>
          <p className="text-neutral-600">
            Browse documented cases of misconduct and civil rights violations
          </p>
        </div>

        {/* Loading skeletons */}
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, index) => (
            <CaseCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-bold mb-2">Error Loading Cases</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={loadCases}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Breadcrumbs */}
      <Breadcrumbs className="mb-4" />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-700 font-serif mb-2">
          Legal Cases
        </h1>
        <p className="text-neutral-600">
          Browse documented cases of misconduct and civil rights violations
        </p>
      </div>

      {/* Search Filters */}
      <CaseSearchFiltersComponent
        onSearch={handleSearch}
        loading={loading}
        resultCount={cases.length}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-primary-100 p-3 rounded-lg">
              <ScaleIcon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-700">{cases.length}</p>
              <p className="text-sm text-neutral-600">Total Cases</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-gold-100 p-3 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-gold-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gold-700">
                {cases.filter((c) => c.arweaveTxIds && c.arweaveTxIds.length > 0).length}
              </p>
              <p className="text-sm text-neutral-600">Archived on Arweave</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">
                {cases.filter((c) => c.status !== 'closed' && c.status !== 'settled').length}
              </p>
              <p className="text-sm text-neutral-600">Active Cases</p>
            </div>
          </div>
        </div>
      </div>

      {/* Case List */}
      <div ref={caseListRef}>
        {cases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-12 text-center">
            <ScaleIcon className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-neutral-700 mb-2">No Cases Found</h3>
            <p className="text-neutral-600">No legal cases have been documented yet.</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {paginationData.displayedCases.map((caseItem) => (
                <CaseCard key={caseItem.id} caseData={caseItem} />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={paginationData.totalPages}
                totalItems={cases.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
