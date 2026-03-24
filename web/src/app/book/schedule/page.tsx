'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../session-context';
import { apiCreateAppointment, apiGetAvailability, apiRescheduleAppointment } from '../../api';

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading...</p>
        </div>
      }
    >
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
  const basePriceCents = Number(search.get('basePrice') ?? 0);
  const totalPriceCents = Number(search.get('totalPrice') ?? basePriceCents);
  const duration = Number(search.get('duration') ?? 0);
  const addOnIds = (search.get('addOnIds') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const addOnNames = (search.get('addOnNames') ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const rescheduleId = search.get('rescheduleId');

  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
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

  const addOnSummary = useMemo(() => addOnNames.filter(Boolean), [addOnNames]);

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
        setMessage(`Appointment rescheduled to ${formatDateLabel(selectedDate)} at ${to12Hour(selectedSlot)}.`);
      } else if (serviceId) {
        await apiCreateAppointment({
          service_id: serviceId,
          add_on_ids: addOnIds,
          date: selectedDate,
          start_time: selectedSlot,
        });
        setMessage(`Appointment booked for ${formatDateLabel(selectedDate)} at ${to12Hour(selectedSlot)}.`);
      }
      setSelectedSlot(null);
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
      <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#7b7794]">Step 2</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">
              {rescheduleId ? 'Reschedule appointment' : 'Pick date and time'}
            </h1>
          </div>
          {!rescheduleId && (
            <div className="rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
              {title} · ${totalPriceCents ? (totalPriceCents / 100).toFixed(2) : (basePriceCents / 100).toFixed(2)}
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-4">
              <label className="text-sm font-semibold text-[#1a132f]">Appointment date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>

            <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0f0a1e]">Available time slots</h2>
                <p className="text-sm text-[#7b7794]">15-minute grid</p>
              </div>

              {slotsLoading ? (
                <p className="mt-4 text-sm text-[#7b7794]">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="mt-4 text-sm text-[#7b7794]">No available slots for this date.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlots.map((slot) => {
                    const isSelected = slot === selectedSlot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? 'border-[#1a132f] bg-[#1a132f] text-white'
                            : 'border-[#e5e4ef] bg-white text-[#1a132f] hover:border-[#c8c6e2]'
                        }`}
                      >
                        {to12Hour(slot)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] bg-[#0f0a1e] p-5 text-white">
            <div>
              <p className="text-sm text-[#c7c3de]">Booking summary</p>
              <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/8 p-4">
              <SummaryRow label="Base price" value={`$${(basePriceCents / 100).toFixed(2)}`} />
              <SummaryRow label="Total duration" value={`${duration} min`} />
              <SummaryRow label="Date" value={formatDateLabel(selectedDate)} />
              <SummaryRow label="Time" value={selectedSlot ? to12Hour(selectedSlot) : 'Select a slot'} />
            </div>

            {addOnSummary.length > 0 && (
              <div className="rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Selected add-ons</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {addOnSummary.map((name) => (
                    <span key={name} className="rounded-full bg-white/12 px-3 py-1 text-xs text-[#ddd9ef]">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {!rescheduleId && (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-[#c7c3de]">Total price</p>
                <p className="mt-1 text-3xl font-bold">${(totalPriceCents / 100).toFixed(2)}</p>
              </div>
            )}

            <button
              disabled={!selectedSlot || loading}
              onClick={confirm}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                selectedSlot && !loading
                  ? 'bg-white text-[#0f0a1e] hover:translate-y-[-1px]'
                  : 'cursor-not-allowed bg-white/30 text-white/60'
              }`}
            >
              {loading ? 'Saving...' : 'Confirm booking'}
            </button>
            {message && <p className="text-sm font-semibold text-[#9bf0a8]">{message}</p>}
            {error && <p className="text-sm font-semibold text-[#ff9fa6]">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#c7c3de]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
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
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}
