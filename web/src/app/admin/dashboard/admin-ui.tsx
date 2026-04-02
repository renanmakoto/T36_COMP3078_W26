'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

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
    <div className="space-y-4">
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
      <AdminSectionNav />
    </div>
  );
}

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/dashboard/analytics', label: 'Analytics' },
  { href: '/admin/dashboard/bookings', label: 'Bookings' },
  { href: '/admin/dashboard/services', label: 'Services' },
  { href: '/admin/dashboard/portfolio', label: 'Portfolio' },
  { href: '/admin/dashboard/blog', label: 'Blog' },
  { href: '/admin/dashboard/testimonials', label: 'Reviews' },
];

export function AdminSectionNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-[#ecebf5] bg-white p-2 shadow-sm">
      {adminNavItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active ? 'bg-[#1a132f] !text-white' : 'text-[#1a132f] hover:bg-[#f5f3fb]'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
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
    timeZone: 'America/Toronto',
  }).format(new Date(value));
}

export function ImageUploadField({
  label,
  hint,
  value,
  kind,
  onChange,
  onUpload,
  onUploadingChange,
}: {
  label: string;
  hint?: string;
  value: string;
  kind: 'service' | 'portfolio' | 'blog' | 'misc';
  onChange: (value: string) => void;
  onUpload: (file: File, kind: 'service' | 'portfolio' | 'blog' | 'misc') => Promise<string>;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError('');
    setSelectedFileName(file.name);
    onUploadingChange?.(true);
    try {
      const nextUrl = await onUpload(file, kind);
      onChange(nextUrl);
    } catch (error: unknown) {
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0];
    if (!nextFile) return;
    void uploadFile(nextFile);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <Field label={label} hint={hint}>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
          placeholder="https://... or upload from your device below"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block text-sm text-[#5a5872] file:mr-3 file:rounded-full file:border-0 file:bg-[#1a132f] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:brightness-110"
        />
        <span
          className={`rounded-xl px-4 py-3 text-sm font-semibold ${
            uploading ? 'bg-[#1a132f] text-white' : 'bg-[#e9e8f5] text-[#5a5872]'
          }`}
        >
          {uploading ? `Uploading ${selectedFileName || 'image'}...` : 'Uploads automatically after selection'}
        </span>
      </div>

      {uploadError ? <p className="text-sm font-semibold text-red-600">{uploadError}</p> : null}

      {value ? (
        <div className="overflow-hidden rounded-2xl border border-[#ecebf5] bg-white">
          <div className="aspect-[16/10] bg-cover bg-center" style={{ backgroundImage: `url(${value})` }} />
          <div className="p-3 text-xs text-[#7b7794]">Current image preview</div>
        </div>
      ) : null}
    </div>
  );
}

export function formatDateInput(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Toronto',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function formatTimeInput(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Toronto',
  }).formatToParts(date);
  const hours = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minutes = parts.find((part) => part.type === 'minute')?.value ?? '00';
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
