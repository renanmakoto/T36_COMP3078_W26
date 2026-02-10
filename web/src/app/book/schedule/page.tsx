'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../session-context';

type BusyMap = Record<string, string[]>;

const initialBusy: BusyMap = (() => {
  const todayKey = keyForDate(new Date());
  const plus1 = keyForDate(addDays(new Date(), 1));
  const plus2 = keyForDate(addDays(new Date(), 2));
  return {
    [todayKey]: ['12:00 PM', '4:00 PM'],
    [plus1]: ['11:15 AM', '3:30 PM'],
    [plus2]: ['10:00 AM', '1:45 PM', '6:30 PM'],
  };
})();

export default function SchedulePage() {
  const search = useSearchParams();
  const router = useRouter();
  const { bookings, addBooking, rescheduleBooking } = useSession();
  const bookingId = search.get('bookingId');

  const existing = bookingId ? bookings.find((b) => b.id === bookingId) : undefined;

  const serviceId = existing?.serviceId ?? search.get('service');
  const title = existing?.serviceTitle ?? search.get('title') ?? 'Service';
  const price = existing?.price ?? Number(search.get('price') ?? 0);
  const duration = existing?.durationMinutes ?? Number(search.get('duration') ?? 0);
  const addBrows = existing?.addBrows ?? (search.get('brows') === '1');
  const addOnDuration = addBrows ? 15 : 0;
  const addOnPrice = addBrows ? 5 : 0;

  const [selectedDate, setSelectedDate] = useState<Date>(() =>
    existing ? new Date(existing.start) : new Date(),
  );
  const [selectedSlot, setSelectedSlot] = useState<string | null>(() =>
    existing ? formatTimeLabel(new Date(existing.start)) : null,
  );
  const [busy, setBusy] = useState<BusyMap>(initialBusy);
  const [message, setMessage] = useState('');

  const dateKey = keyForDate(selectedDate);

  const slots = useMemo(() => generateSlots(), []);
  const busyToday = busy[dateKey] ?? [];
  const availableSlots = slots.filter((slot) => !busyToday.includes(slot));

  const blocksNeeded = blocksToHold(duration, addOnDuration);

  function confirm() {
    if (!selectedSlot || !serviceId) return;
    const total = price + addOnPrice;

    setBusy((prev) => {
      const next = { ...prev };
      const list = new Set(next[dateKey] ?? []);
      const startIdx = availableSlots.indexOf(selectedSlot);
      for (let i = 0; i <= blocksNeeded; i++) {
        const s = availableSlots[startIdx + i];
        if (s) list.add(s);
      }
      next[dateKey] = Array.from(list);
      return next;
    });

    const start = combineDateAndTime(selectedDate, selectedSlot).toISOString();

    if (bookingId && existing) {
      rescheduleBooking(bookingId, start);
      setMessage(
        `Booking rescheduled to ${formatDate(selectedDate)} at ${selectedSlot} (${title}) · Total $${total}`,
      );
    } else {
      addBooking({
        serviceId,
        serviceTitle: title,
        start,
        durationMinutes: duration + addOnDuration,
        price: total,
        addBrows,
      });
      setMessage(`Time reserved: ${formatDate(selectedDate)} at ${selectedSlot} (${title}) · Total $${total}`);
    }
    setSelectedSlot(null);
  }

  if (!serviceId) {
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
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Pick date and time</h1>
          </div>
          <div className="rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
            {title} {addBrows ? '+ Brows' : ''} · ${price + addOnPrice}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <input
              type="date"
              value={selectedDate.toISOString().slice(0, 10)}
              onChange={(e) => setSelectedDate(new Date(e.target.value + 'T00:00:00'))}
              className="w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
              min={new Date().toISOString().slice(0, 10)}
            />

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {availableSlots.map((slot, index) => {
                const isSelected = slot === selectedSlot;
                const blocked =
                  selectedSlot &&
                  isSelected &&
                  blocksNeeded > 0 &&
                  Array.from({ length: blocksNeeded }, (_, i) => availableSlots[index + 1 + i]).some(Boolean);
                const disabled = false;
                return (
                  <button
                    key={slot}
                    disabled={disabled}
                    onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                    className={`rounded-xl border px-3 py-2 text-sm transition ${
                      isSelected
                        ? 'border-[#1a132f] bg-[#f1eefc] font-semibold text-[#1a132f]'
                        : 'border-[#e5e4ef] hover:border-[#c8c6e2]'
                    } ${blocked ? 'ring-1 ring-[#1a132f]/50' : ''} ${disabled ? 'opacity-50' : ''}`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
            <h3 className="text-lg font-semibold text-[#0f0a1e]">Summary</h3>
            <Row label="Service" value={title} />
            {addBrows && <Row label="Add-on" value="Eyebrows +$5 · +15 min" />}
            <Row label="Duration" value={`${duration + addOnDuration} min`} />
            <Row label="Price" value={`$${price + addOnPrice}`} />
            <Row label="Date" value={formatDate(selectedDate)} />
            <Row label="Time" value={selectedSlot ?? 'Select a slot'} />
            <button
              disabled={!selectedSlot}
              onClick={confirm}
              className={`mt-2 w-full rounded-xl px-4 py-3 text-white font-semibold shadow-sm transition ${
                selectedSlot ? 'bg-[#1a132f] hover:brightness-110' : 'cursor-not-allowed bg-[#cfcde1]'
              }`}
            >
              Confirm time
            </button>
            {message && <p className="text-sm font-semibold text-[#1a132f]">{message}</p>}
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

function generateSlots() {
  const slots: string[] = [];
  let minutes = 10 * 60; // 10:00
  const end = 19 * 60; // 19:00
  while (minutes <= end) {
    slots.push(formatTime(minutes));
    minutes += 15;
  }
  return slots;
}

function formatTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHour = ((h + 11) % 12) + 1;
  const displayMin = m.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
}

function formatTimeLabel(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = ((hours + 11) % 12) + 1;
  const displayMin = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMin} ${period}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

function keyForDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function blocksToHold(serviceDuration: number, addOnDuration: number) {
  const totalMinutes = serviceDuration + addOnDuration;
  const slots = Math.ceil(totalMinutes / 15);
  return Math.max(0, slots - 1);
}

function combineDateAndTime(date: Date, timeLabel: string) {
  const [time, period] = timeLabel.split(' ');
  const [hourStr, minuteStr] = time.split(':');
  let hour = Number(hourStr);
  const minute = Number(minuteStr);
  const upperPeriod = period?.toUpperCase() === 'PM' ? 'PM' : 'AM';
  if (upperPeriod === 'PM' && hour < 12) hour += 12;
  if (upperPeriod === 'AM' && hour === 12) hour = 0;
  const result = new Date(date);
  result.setHours(hour, minute, 0, 0);
  return result;
}
