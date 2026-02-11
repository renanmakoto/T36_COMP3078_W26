'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../session-context';
import { apiGetAvailability, apiCreateAppointment, apiRescheduleAppointment } from '../../api';

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-sm text-[#5a5872]">Loading...</p></div>}>
      <ScheduleContent />
    </Suspense>
  );
}

function ScheduleContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { role } = useSession();

  const serviceId = search.get('serviceId');
  const title = search.get('title') ?? 'Service';
  const priceCents = Number(search.get('price') ?? 0);
  const duration = Number(search.get('duration') ?? 0);
  const rescheduleId = search.get('rescheduleId');

  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    setSlotsLoading(true);
    setSelectedSlot(null);
    apiGetAvailability(selectedDate, duration || undefined)
      .then((data) => setAvailableSlots(data.slots))
      .catch(() => setAvailableSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duration]);

  async function confirm() {
    if (!selectedSlot) return;
    if (role !== 'user') {
      setError('Please sign in to book an appointment.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (rescheduleId) {
        await apiRescheduleAppointment(rescheduleId, selectedDate, selectedSlot);
        setMessage(`Appointment rescheduled to ${formatDateLabel(selectedDate)} at ${to12Hour(selectedSlot)}`);
      } else if (serviceId) {
        await apiCreateAppointment(serviceId, selectedDate, selectedSlot);
        setMessage(`Appointment booked: ${formatDateLabel(selectedDate)} at ${to12Hour(selectedSlot)} (${title})`);
      }
      setSelectedSlot(null);
      // Refresh availability
      const data = await apiGetAvailability(selectedDate, duration || undefined);
      setAvailableSlots(data.slots);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to book appointment.');
    } finally {
      setLoading(false);
    }
  }

  if (!serviceId && !rescheduleId) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Select a service before choosing a time.</p>
        <button
          onClick={() => router.push('/book')}
          className="mt-4 rounded-lg bg-[#1a132f] px-4 py-2 text-white hover:brightness-110"
        >
          Back to services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm text-[#7b7794]">Step 2</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">
              {rescheduleId ? 'Reschedule appointment' : 'Pick date and time'}
            </h1>
          </div>
          {!rescheduleId && (
            <div className="rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
              {title} &middot; ${(priceCents / 100).toFixed(2)}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
              min={new Date().toISOString().slice(0, 10)}
            />

            {slotsLoading ? (
              <p className="text-sm text-[#7b7794]">Loading slots...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-[#7b7794]">No available slots for this date.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {availableSlots.map((slot) => {
                  const isSelected = slot === selectedSlot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                      className={`rounded-xl border px-3 py-2 text-sm transition ${
                        isSelected
                          ? 'border-[#1a132f] bg-[#f1eefc] font-semibold text-[#1a132f]'
                          : 'border-[#e5e4ef] hover:border-[#c8c6e2]'
                      }`}
                    >
                      {to12Hour(slot)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
            <h3 className="text-lg font-semibold text-[#0f0a1e]">Summary</h3>
            {!rescheduleId && (
              <>
                <Row label="Service" value={title} />
                <Row label="Duration" value={`${duration} min`} />
                <Row label="Price" value={`$${(priceCents / 100).toFixed(2)}`} />
              </>
            )}
            <Row label="Date" value={formatDateLabel(selectedDate)} />
            <Row label="Time" value={selectedSlot ? to12Hour(selectedSlot) : 'Select a slot'} />
            <button
              disabled={!selectedSlot || loading}
              onClick={confirm}
              className={`mt-2 w-full rounded-xl px-4 py-3 text-white font-semibold shadow-sm transition ${
                selectedSlot && !loading ? 'bg-[#1a132f] hover:brightness-110' : 'cursor-not-allowed bg-[#cfcde1]'
              }`}
            >
              {loading ? 'Booking...' : 'Confirm time'}
            </button>
            {message && <p className="text-sm font-semibold text-green-700">{message}</p>}
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-[#1a132f]">
      <span className="text-[#7b7794]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const m = mStr;
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}
