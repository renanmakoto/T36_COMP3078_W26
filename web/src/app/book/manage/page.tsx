'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiCancelBookingLink, type AppointmentData } from '../../api';

export default function BookingManagePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#5a5872]">Opening booking action...</p>
        </div>
      }
    >
      <BookingManageContent />
    </Suspense>
  );
}

function BookingManageContent() {
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const action = search.get('action') ?? '';
  const invalidLink = !token || action !== 'cancel';
  const [loading, setLoading] = useState(!invalidLink);
  const [error, setError] = useState('');
  const [result, setResult] = useState<'cancelled' | 'already_cancelled' | ''>('');
  const [appointment, setAppointment] = useState<AppointmentData | null>(null);

  useEffect(() => {
    if (invalidLink) return;

    apiCancelBookingLink(token)
      .then((response) => {
        setResult(response.result === 'already_cancelled' ? 'already_cancelled' : 'cancelled');
        setAppointment(response.appointment);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to update appointment.');
      })
      .finally(() => setLoading(false));
  }, [invalidLink, token]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
      {loading ? (
        <p className="text-sm text-[#5a5872]">Updating your appointment...</p>
      ) : invalidLink ? (
        <>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Booking link unavailable</h1>
          <p className="text-sm text-red-600">This booking action is not available.</p>
        </>
      ) : error ? (
        <>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Booking link unavailable</h1>
          <p className="text-sm text-red-600">{error}</p>
        </>
      ) : (
        <>
          <div
            className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
              result === 'already_cancelled' ? 'bg-[#fff4ea] text-[#a45d15]' : 'bg-[#ebfff0] text-[#0d7a33]'
            }`}
          >
            {result === 'already_cancelled' ? 'Already cancelled' : 'Appointment cancelled'}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">
              {result === 'already_cancelled' ? 'This appointment was already cancelled' : 'Your appointment has been cancelled'}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#5a5872]">
              We also sent an updated email so you have a record of the change. If you still need the service, you can
              book a new time below.
            </p>
          </div>
          {appointment ? (
            <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-5">
              <p className="text-sm text-[#7b7794]">Cancelled appointment</p>
              <p className="mt-2 text-2xl font-semibold text-[#0f0a1e]">{appointment.service.name}</p>
              <p className="mt-2 text-sm text-[#5a5872]">{formatDateTime(appointment.start_time)}</p>
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/login?next=%2Fuser%2Fdashboard"
          className="rounded-xl border border-[#1a132f] px-5 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
        >
          View appointments
        </Link>
        <Link
          href="/book"
          className="rounded-xl bg-[#1a132f] px-5 py-3 text-sm font-semibold text-white hover:brightness-110"
        >
          Book another service
        </Link>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(new Date(value));
}
