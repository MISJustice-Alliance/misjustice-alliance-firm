import { useState } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { CaseStatus } from '../../types/Case';
import { CASE_STATUS_LABELS } from '../../types/Case';

export interface CaseSearchFilters {
  searchQuery?: string;
  status?: CaseStatus;
  jurisdiction?: string;
  filedDateFrom?: string;
  filedDateTo?: string;
}

interface CaseSearchFiltersProps {
  onSearch: (filters: CaseSearchFilters) => void;
  loading?: boolean;
  resultCount?: number;
}

export const CaseSearchFiltersComponent = ({
  onSearch,
  loading = false,
  resultCount,
}: CaseSearchFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<CaseSearchFilters>({});

  const handleSearch = () => {
    // Remove empty filters
    const activeFilters: CaseSearchFilters = {};
    if (filters.searchQuery?.trim()) activeFilters.searchQuery = filters.searchQuery.trim();
    if (filters.status) activeFilters.status = filters.status;
    if (filters.jurisdiction?.trim()) activeFilters.jurisdiction = filters.jurisdiction.trim();
    if (filters.filedDateFrom) activeFilters.filedDateFrom = filters.filedDateFrom;
    if (filters.filedDateTo) activeFilters.filedDateTo = filters.filedDateTo;

    onSearch(activeFilters);
  };

  const handleReset = () => {
    setFilters({});
    onSearch({});
  };

  const hasActiveFilters = Object.keys(filters).some((key) => {
    const value = filters[key as keyof CaseSearchFilters];
    return value !== undefined && value !== '' && value !== null;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 mb-8">
      {/* Search Bar */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            type="text"
            placeholder="Search cases by keywords, facts, or case number..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="block w-full pl-10 pr-3 py-2.5 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900 placeholder-neutral-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="px-4 py-2.5 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 transition-colors duration-200 font-medium flex items-center gap-2"
        >
          <FunnelIcon className="h-5 w-5" />
          Filters
        </button>
      </div>

      {/* Result Count */}
      {resultCount !== undefined && (
        <div className="mb-4 text-sm text-neutral-600">
          {resultCount === 0 ? (
            <span>No cases found</span>
          ) : resultCount === 1 ? (
            <span>Found 1 case</span>
          ) : (
            <span>Found {resultCount} cases</span>
          )}
        </div>
      )}

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="border-t border-neutral-200 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Status
              </label>
              <select
                id="status"
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    status: e.target.value ? (e.target.value as CaseStatus) : undefined,
                  })
                }
                className="block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900"
              >
                <option value="">All Statuses</option>
                {Object.entries(CASE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Jurisdiction Filter */}
            <div>
              <label
                htmlFor="jurisdiction"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Jurisdiction
              </label>
              <input
                type="text"
                id="jurisdiction"
                placeholder="e.g., U.S. District Court"
                value={filters.jurisdiction || ''}
                onChange={(e) => setFilters({ ...filters, jurisdiction: e.target.value })}
                className="block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900 placeholder-neutral-400"
              />
            </div>

            {/* Filed Date From */}
            <div>
              <label
                htmlFor="filedDateFrom"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Filed Date From
              </label>
              <input
                type="date"
                id="filedDateFrom"
                value={filters.filedDateFrom || ''}
                onChange={(e) => setFilters({ ...filters, filedDateFrom: e.target.value })}
                className="block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900"
              />
            </div>

            {/* Filed Date To */}
            <div>
              <label
                htmlFor="filedDateTo"
                className="block text-sm font-medium text-neutral-700 mb-2"
              >
                Filed Date To
              </label>
              <input
                type="date"
                id="filedDateTo"
                value={filters.filedDateTo || ''}
                onChange={(e) => setFilters({ ...filters, filedDateTo: e.target.value })}
                className="block w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-neutral-900"
              />
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-end gap-3 mt-4">
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-neutral-600 hover:text-neutral-800 flex items-center gap-2 transition-colors duration-200"
              >
                <XMarkIcon className="h-5 w-5" />
                Clear Filters
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
