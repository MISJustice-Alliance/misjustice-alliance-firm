/**
 * Loading skeleton for CaseCard component
 * Provides visual feedback during data loading
 */
export const CaseCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            {/* Case number skeleton */}
            <div className="h-7 bg-neutral-200 rounded w-32"></div>
            {/* Status badge skeleton */}
            <div className="h-6 bg-neutral-200 rounded-full w-24"></div>
          </div>
          {/* Case parties skeleton */}
          <div className="h-5 bg-neutral-200 rounded w-64"></div>
        </div>
      </div>

      {/* Metadata grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="h-4 bg-neutral-200 rounded w-40"></div>
        <div className="h-4 bg-neutral-200 rounded w-40"></div>
      </div>

      {/* Causes of action skeleton */}
      <div className="mb-4">
        <div className="h-4 bg-neutral-200 rounded w-32 mb-2"></div>
        <div className="flex flex-wrap gap-2">
          <div className="h-6 bg-neutral-200 rounded-full w-24"></div>
          <div className="h-6 bg-neutral-200 rounded-full w-32"></div>
          <div className="h-6 bg-neutral-200 rounded-full w-28"></div>
        </div>
      </div>

      {/* Case facts skeleton */}
      <div className="space-y-2">
        <div className="h-4 bg-neutral-200 rounded w-full"></div>
        <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
        <div className="h-4 bg-neutral-200 rounded w-4/6"></div>
      </div>
    </div>
  );
};
