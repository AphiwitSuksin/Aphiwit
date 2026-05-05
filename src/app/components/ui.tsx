import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/90 p-4 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
}) {
  const tones = {
    blue: 'from-blue-50 to-blue-100/80 border-blue-200/60 text-blue-900',
    green: 'from-emerald-50 to-emerald-100/80 border-emerald-200/60 text-emerald-900',
    amber: 'from-amber-50 to-amber-100/80 border-amber-200/60 text-amber-900',
    red: 'from-red-50 to-red-100/80 border-red-200/60 text-red-900',
    purple: 'from-violet-50 to-violet-100/80 border-violet-200/60 text-violet-900',
    teal: 'from-teal-50 to-cyan-100/70 border-teal-200/60 text-teal-900',
  };
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 shadow-sm ${tones[tone]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
          {sub ? <p className="mt-1 text-xs opacity-80">{sub}</p> : null}
        </div>
        <Icon className="h-7 w-7 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
      </div>
    </div>
  );
}

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: ReactNode;
  variant?: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'purple';
}) {
  const map = {
    neutral: 'bg-slate-100 text-slate-800 border-slate-200',
    success: 'bg-emerald-100 text-emerald-900 border-emerald-200',
    warn: 'bg-amber-100 text-amber-900 border-amber-200',
    danger: 'bg-red-100 text-red-900 border-red-200',
    info: 'bg-sky-100 text-sky-900 border-sky-200',
    purple: 'bg-violet-100 text-violet-900 border-violet-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[variant]}`}
    >
      {children}
    </span>
  );
}

export function IconButton({
  children,
  onClick,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
    >
      {children}
    </button>
  );
}
