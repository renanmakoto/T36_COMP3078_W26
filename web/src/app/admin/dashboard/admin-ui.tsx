'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export const inputClass =
  'w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2';

export const textAreaClass = `${inputClass} min-h-[120px]`;
export const panelClass = 'rounded-[2rem] bg-white p-6 shadow-sm md:p-8';
export const primaryButtonClass =
  'rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white hover:brightness-110';
export const secondaryButtonClass =
  'rounded-xl border border-[#e3e3e3] px-4 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]';

export function AdminPageHeader({
  title,
  description,
  backHref = '/admin/dashboard',
  backLabel = 'Back to dashboard',
  actions,
}: {
  title: string;
  description: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold text-[#0f0a1e]">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-[#5a5872]">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {actions}
        <Link href={backHref} className={secondaryButtonClass}>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#1a132f]">{label}</span>
        {hint ? <span className="text-xs text-[#7b7794]">{hint}</span> : null}
      </div>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-[#ecebf5] bg-[#fcfcff] px-3 py-3 text-sm font-semibold text-[#1a132f]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-[#1a132f]"
      />
      {label}
    </label>
  );
}

export function NoticeBanner({
  error,
  notice,
}: {
  error?: string;
  notice?: string;
}) {
  if (!error && !notice) return null;
  return (
    <div
      className={`rounded-2xl p-4 text-sm font-semibold ${
        error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
      }`}
    >
      {error || notice}
    </div>
  );
}

export function EditableRow({
  title,
  subtitle,
  meta,
  onEdit,
  children,
}: {
  title: string;
  subtitle: string;
  meta?: string;
  onEdit?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#0f0a1e]">{title}</p>
        <p className="text-sm text-[#5a5872]">{subtitle}</p>
        {meta ? <p className="text-xs uppercase tracking-[0.16em] text-[#7b7794]">{meta}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {children}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
          >
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export function dollarsToCents(value: string) {
  return Math.round(Number.parseFloat(value || '0') * 100);
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatDateInput(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatTimeInput(value: string) {
  const date = new Date(value);
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function statusTone(status: string) {
  switch (status) {
    case 'APPROVED':
    case 'CONFIRMED':
      return 'bg-emerald-100 text-emerald-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'NO_SHOW':
    case 'REJECTED':
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}
