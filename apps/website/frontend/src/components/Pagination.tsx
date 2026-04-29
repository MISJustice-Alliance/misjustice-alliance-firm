import { useEffect, useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}: PaginationProps) => {
  const [announcement, setAnnouncement] = useState('');

  // Calculate item range
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Memoize page numbers calculation
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, last page, current page, and pages around current
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  // Update ARIA announcement when page changes
  useEffect(() => {
    setAnnouncement(
      `Page ${currentPage} of ${totalPages}. Showing ${startItem} to ${endItem} of ${totalItems} results.`
    );
  }, [currentPage, totalPages, startItem, endItem, totalItems]);

  // Don't render if there's only one page or no items
  if (totalPages <= 1 || totalItems === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
      {/* Screen reader announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Results info */}
        <div className="text-sm text-neutral-600">
          Showing <span className="font-medium text-neutral-900">{startItem}</span> to{' '}
          <span className="font-medium text-neutral-900">{endItem}</span> of{' '}
          <span className="font-medium text-neutral-900">{totalItems}</span> results
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          {/* Previous button */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`p-2 rounded-lg border transition-colors duration-200 ${
              currentPage === 1
                ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer'
            }`}
            aria-label="Previous page"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${index}`} className="px-3 py-2 text-neutral-400">
                    ...
                  </span>
                );
              }

              const pageNum = page as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-lg border transition-colors duration-200 ${
              currentPage === totalPages
                ? 'border-neutral-200 text-neutral-400 cursor-not-allowed'
                : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 cursor-pointer'
            }`}
            aria-label="Next page"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
