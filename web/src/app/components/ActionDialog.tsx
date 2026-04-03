'use client';

import { useEffect, type ReactNode } from 'react';

type ActionDialogProps = {
  open: boolean;
  title: string;
  description: string;
  eyebrow?: string;
  tone?: 'default' | 'danger' | 'success';
  closeLabel?: string;
  onClose?: () => void;
  children?: ReactNode;
  actions?: ReactNode;
};

const toneStyles: Record<NonNullable<ActionDialogProps['tone']>, string> = {
  default: 'bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)] border-white/20',
  danger: 'bg-[linear-gradient(180deg,#ffffff_0%,#fff5f5_100%)] border-[#f6d6dc]',
  success: 'bg-[linear-gradient(180deg,#ffffff_0%,#effbf4_100%)] border-[#cfead8]',
};

export function ActionDialog({
  open,
  title,
  description,
  eyebrow,
  tone = 'default',
  closeLabel = 'Close',
  onClose,
  children,
  actions,
}: ActionDialogProps) {
  useEffect(() => {
    if (!open) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0a1e]/55 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        className={`w-full max-w-md rounded-[2rem] border p-6 shadow-[0_30px_80px_-32px_rgba(15,10,30,0.55)] ${toneStyles[tone]}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b7794]">{eyebrow}</p>
            ) : null}
            <h2 className="mt-2 text-2xl font-bold text-[#0f0a1e]">{title}</h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#ddd9ef] px-3 py-1 text-sm font-semibold text-[#5a5872] hover:bg-white"
            >
              {closeLabel}
            </button>
          ) : null}
        </div>

        <p className="mt-5 text-sm leading-6 text-[#4f4a66]">{description}</p>

        {children ? <div className="mt-5">{children}</div> : null}
        {actions ? <div className="mt-6 grid gap-3">{actions}</div> : null}
      </div>
    </div>
  );
}

export function DialogSummary({
  title,
  lines,
}: {
  title: string;
  lines: string[];
}) {
  return (
    <div className="rounded-[1.5rem] bg-[#1a132f] p-4 text-white">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-1 text-sm text-[#ddd9ef]">
        {lines.filter(Boolean).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
