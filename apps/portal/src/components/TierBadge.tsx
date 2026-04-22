import type { Classification } from '../types';

interface TierBadgeProps {
  classification: Classification;
}

const config: Record<
  Classification,
  { label: string; color: string; icon: string; description: string }
> = {
  T0_PUBLIC: {
    label: 'T0 — Public',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: '🌐',
    description: 'Can leave network, publish to web',
  },
  T1_PRIVILEGED: {
    label: 'T1 — Privileged',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: '🔒',
    description: 'Internal network only, no cloud LLM, encrypted at rest',
  },
  T2_INTERNAL: {
    label: 'T2 — Internal',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: '🏢',
    description: 'Internal network, cloud LLM allowed with logging disabled',
  },
  T3_ADMIN: {
    label: 'T3 — Admin',
    color: 'bg-violet-100 text-violet-700 border-violet-200',
    icon: '⚙️',
    description: 'Infrastructure configs, no case data',
  },
};

export default function TierBadge({ classification }: TierBadgeProps) {
  const c = config[classification];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${c.color}`}
      title={`${c.label}: ${c.description}`}
      aria-label={c.label}
    >
      <span aria-hidden="true">{c.icon}</span>
      <span>{c.label}</span>
    </span>
  );
}
