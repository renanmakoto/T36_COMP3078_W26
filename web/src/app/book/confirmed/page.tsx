'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export default function BookingConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading confirmation...</p>
        </div>
      }
    >
      <BookingConfirmedContent />
    </Suspense>
  );
}

function BookingConfirmedContent() {
  const search = useSearchParams();
  const mode = search.get('mode') === 'rescheduled' ? 'rescheduled' : 'created';
  const date = search.get('date') ?? '';
  const time = search.get('time') ?? '';
  const title = search.get('title') ?? 'Appointment';

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
      <div className="inline-flex rounded-full bg-[#ebfff0] px-3 py-1 text-sm font-semibold text-[#0d7a33]">
        {mode === 'rescheduled' ? 'Appointment updated' : 'Booking confirmed'}
      </div>

      <div>
        <h1 className="text-3xl font-bold text-[#0f0a1e]">
          {mode === 'rescheduled' ? 'Your appointment was rescheduled' : 'Your booking is confirmed'}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5a5872]">
          Please check your email for the confirmation details, quick links to manage the booking, and the next steps
          if you need to cancel or reschedule again.
        </p>
      </div>

      <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-5">
        <p className="text-sm text-[#7b7794]">Appointment summary</p>
        <p className="mt-2 text-2xl font-semibold text-[#0f0a1e]">{title}</p>
        {date && time ? (
          <p className="mt-2 text-sm text-[#5a5872]">
            {formatDateLabel(date)} at {to12Hour(time)} Toronto time
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/user/dashboard"
          className="rounded-xl bg-[#1a132f] px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
        >
          View appointments
        </Link>
        <Link
          href="/book"
          className="rounded-xl border border-[#1a132f] px-5 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
        >
          Book another service
        </Link>
      </div>
    </div>
  );
}

function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${period}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(d);
}
