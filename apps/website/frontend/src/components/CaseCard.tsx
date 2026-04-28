import { Link } from 'react-router-dom';
import { CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import type { Case } from '../types/Case';
import { CASE_STATUS_LABELS, CASE_STATUS_COLORS } from '../types/Case';
import { formatDate } from '../utils/dateUtils';

interface CaseCardProps {
  caseData: Case;
}

export const CaseCard = ({ caseData }: CaseCardProps) => {

  return (
    <article className="bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow duration-200">
      <Link
        to={`/cases/${caseData.id}`}
        className="block p-6"
        aria-label={`View details for case ${caseData.caseNumber}: ${caseData.plaintiffAnon || caseData.plaintiff} v. ${caseData.defendant}`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-xl font-bold text-primary-700 font-serif">
                {caseData.caseNumber}
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  CASE_STATUS_COLORS[caseData.status]
                }`}
                role="status"
                aria-label={`Case status: ${CASE_STATUS_LABELS[caseData.status]}`}
              >
                {CASE_STATUS_LABELS[caseData.status]}
              </span>
            </div>
            <p className="text-neutral-700 font-medium">
              {caseData.plaintiffAnon || caseData.plaintiff} v. {caseData.defendant}
            </p>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm text-neutral-600">
          <MapPinIcon className="h-4 w-4" />
          <span>{caseData.jurisdiction}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-neutral-600">
          <CalendarIcon className="h-4 w-4" />
          <span>Filed: {formatDate(caseData.filedDate)}</span>
        </div>
      </div>

      {caseData.causesOfAction && caseData.causesOfAction.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-neutral-700 mb-2">
            Causes of Action:
          </p>
          <div className="flex flex-wrap gap-2">
            {caseData.causesOfAction.map((cause, index) => (
              <span
                key={index}
                className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-medium"
              >
                {cause}
              </span>
            ))}
          </div>
        </div>
      )}

      {caseData.caseFacts && (
        <p className="text-neutral-600 text-sm line-clamp-3">
          {caseData.caseFacts}
        </p>
      )}
      </Link>
    </article>
  );
};
