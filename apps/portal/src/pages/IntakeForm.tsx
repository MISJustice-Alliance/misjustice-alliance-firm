import { useState } from 'react';
import { mcasApi } from '../api/mcas';
import type { Classification } from '../types';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const classifications: { value: Classification; label: string }[] = [
  { value: 'T0_PUBLIC', label: 'T0 — Public (no sensitive data)' },
  { value: 'T1_PRIVILEGED', label: 'T1 — Privileged (client-attorney, encrypted)' },
  { value: 'T2_INTERNAL', label: 'T2 — Internal (de-identified case data)' },
  { value: 'T3_ADMIN', label: 'T3 — Admin (infrastructure only)' },
];

const jurisdictions = ['MT', 'WA', 'FEDERAL', 'OTHER'];

export default function IntakeForm() {
  const [title, setTitle] = useState('');
  const [classification, setClassification] = useState<Classification>('T2_INTERNAL');
  const [jurisdiction, setJurisdiction] = useState('MT');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ id: string; displayId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await mcasApi.createMatter({
        title: title.trim(),
        classification,
        jurisdiction,
      });
      if (description.trim()) {
        await mcasApi.createEvent(res.matter_id, {
          event_type: 'INTAKE',
          description: description.trim(),
        });
      }
      setResult({ id: res.matter_id, displayId: res.display_id });
      setTitle('');
      setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create matter');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Anonymous Intake</h1>
        <p className="text-slate-600 mt-1">
          Create a new matter without collecting personally identifiable information.
        </p>
      </div>

      {result && (
        <div
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3"
          role="status"
          aria-live="polite"
        >
          <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-emerald-800">Matter created successfully</p>
            <p className="text-emerald-700 text-sm mt-0.5">
              Display ID: <span className="font-mono font-semibold">{result.displayId}</span>
            </p>
            <p className="text-emerald-600 text-xs mt-1">
              Save this ID — it is the only way to reference this matter without revealing identity.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div
          className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-4 flex items-start gap-3"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
          <p className="text-rose-700">{error}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5"
      >
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700">
            Matter Title
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., County Detention Conditions Review"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-1">
            Use a descriptive but anonymous title. Do not include real names.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="classification" className="block text-sm font-medium text-slate-700">
              Data Classification
            </label>
            <select
              id="classification"
              value={classification}
              onChange={(e) => setClassification(e.target.value as Classification)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              {classifications.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="jurisdiction" className="block text-sm font-medium text-slate-700">
              Jurisdiction
            </label>
            <select
              id="jurisdiction"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
            >
              {jurisdictions.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-700">
            Intake Summary
          </label>
          <textarea
            id="description"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the nature of the matter. Avoid names, dates of birth, addresses, or other PII."
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
          />
          <p className="text-xs text-slate-500 mt-1">
            This field is optional. If provided, it will be logged as the initial intake event.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Create Matter
          </button>
        </div>
      </form>

      <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          Anonymity Notice
        </p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-amber-700">
          <li>No cookies or persistent identifiers are stored.</li>
          <li>No analytics or third-party scripts are loaded.</li>
          <li>IP addresses are not logged by this portal.</li>
          <li>Use Tor or a VPN for additional protection.</li>
        </ul>
      </div>
    </div>
  );
}
