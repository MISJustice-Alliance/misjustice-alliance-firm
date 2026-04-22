import { useEffect, useState } from 'react';
import { mcasApi } from '../api/mcas';
import type { ApprovalItem } from '../types';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Inbox,
  Filter,
} from 'lucide-react';

const gateConfig: Record<
  ApprovalItem['gate_type'],
  { label: string; color: string }
> = {
  INTAKE: { label: 'Intake', color: 'bg-slate-100 text-slate-700' },
  RESEARCH: { label: 'Research', color: 'bg-sky-100 text-sky-700' },
  DRAFT: { label: 'Draft', color: 'bg-indigo-100 text-indigo-700' },
  PUBLICATION: { label: 'Publication', color: 'bg-emerald-100 text-emerald-700' },
  REFERRAL: { label: 'Referral', color: 'bg-amber-100 text-amber-700' },
  SOCIAL: { label: 'Social', color: 'bg-violet-100 text-violet-700' },
};

export default function ApprovalInbox() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await mcasApi.listApprovals();
      setApprovals(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await mcasApi.approveApproval(id);
      await load();
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      await mcasApi.rejectApproval(id);
      await load();
    } finally {
      setActingId(null);
    }
  };

  const filtered = approvals.filter((a) => (filter === 'ALL' ? true : a.status === filter));
  const pendingCount = approvals.filter((a) => a.status === 'PENDING').length;

  if (loading && approvals.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-500" aria-hidden="true" />
        <span className="ml-2 text-slate-600 text-sm">Loading approvals…</span>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">HITL Approval Inbox</h1>
          <p className="text-slate-600 mt-1">
            {pendingCount} pending approval{pendingCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              aria-pressed={filter === f}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3" role="alert">
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-rose-700">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox className="w-10 h-10 mb-3" aria-hidden="true" />
          <p className="text-sm">No approvals match the selected filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const gate = gateConfig[item.gate_type];
            const isActing = actingId === item.id;
            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border shadow-sm p-5 transition-opacity ${
                  item.status === 'PENDING' ? 'border-slate-200' : 'border-slate-100 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-slate-500">
                        {item.matter_display_id}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${gate.color}`}
                      >
                        {gate.label}
                      </span>
                      {item.status !== 'PENDING' && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.status === 'APPROVED' ? (
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                          )}
                          {item.status === 'APPROVED' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-medium text-slate-900 mt-1">
                      {item.matter_title}
                    </h2>
                    <p className="text-sm text-slate-600 mt-1">{item.summary}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span>Requested by <span className="font-medium text-slate-700">{item.requested_by}</span></span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                      {item.deadline && (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          Due {new Date(item.deadline).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.status === 'PENDING' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isActing ? (
                          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <CheckCircle className="w-4 h-4" aria-hidden="true" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={isActing}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <XCircle className="w-4 h-4" aria-hidden="true" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
