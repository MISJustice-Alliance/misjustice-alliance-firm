import { useEffect, useState } from 'react';
import { mcasApi } from '../api/mcas';
import type { Matter } from '../types';
import TierBadge from '../components/TierBadge';
import { Loader2, AlertCircle, Calendar, MapPin, FileText, Users } from 'lucide-react';

const statusConfig: Record<
  Matter['status'],
  { label: string; color: string }
> = {
  INTAKE: { label: 'Intake', color: 'bg-slate-100 text-slate-700' },
  RESEARCH: { label: 'Research', color: 'bg-sky-100 text-sky-700' },
  DRAFTING: { label: 'Drafting', color: 'bg-indigo-100 text-indigo-700' },
  REVIEW: { label: 'Review', color: 'bg-amber-100 text-amber-700' },
  ADVOCACY: { label: 'Advocacy', color: 'bg-emerald-100 text-emerald-700' },
  CLOSED: { label: 'Closed', color: 'bg-slate-100 text-slate-500' },
};

export default function MatterDashboard() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    mcasApi
      .listMatters()
      .then((data) => {
        setMatters(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load matters');
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" aria-hidden="true" />
        <span className="ml-2 text-slate-600 text-sm">Loading matters…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3" role="alert">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-rose-700">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Matter Dashboard</h1>
          <p className="text-slate-600 mt-1">
            {matters.length} matter{matters.length !== 1 ? 's' : ''} tracked
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {matters.map((matter) => {
          const status = statusConfig[matter.status];
          const isExpanded = expanded === matter.id;
          return (
            <div
              key={matter.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : matter.id)}
                className="w-full text-left px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 hover:bg-slate-50 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-slate-500">{matter.display_id}</span>
                    <TierBadge classification={matter.classification} />
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <h2 className="text-base font-medium text-slate-900 mt-1 truncate">
                    {matter.title}
                  </h2>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {matter.jurisdiction}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                    {new Date(matter.created_at).toLocaleDateString()}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-slate-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                        <Users className="w-3.5 h-3.5" aria-hidden="true" />
                        Actors
                      </div>
                      <p className="text-2xl font-semibold text-slate-900 mt-1">
                        {matter.actors.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                        <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                        Documents
                      </div>
                      <p className="text-2xl font-semibold text-slate-900 mt-1">
                        {matter.documents.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium uppercase tracking-wide">
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        Events
                      </div>
                      <p className="text-2xl font-semibold text-slate-900 mt-1">
                        {matter.events.length}
                      </p>
                    </div>
                  </div>

                  {matter.events.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-slate-700 mb-2">Recent Events</h3>
                      <ul className="space-y-2">
                        {matter.events.slice(-3).map((evt) => (
                          <li
                            key={evt.id}
                            className="text-sm text-slate-600 bg-slate-50 rounded-md px-3 py-2 border border-slate-100"
                          >
                            <span className="font-medium text-slate-700">{evt.event_type}</span>
                            {' — '}
                            {evt.description}
                            <span className="text-slate-400 text-xs ml-2">
                              {new Date(evt.timestamp).toLocaleString()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
