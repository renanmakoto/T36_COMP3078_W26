'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';
import { apiGetMyAppointments, apiCancelAppointment, type AppointmentData } from '../../api';

export default function UserDashboardPage() {
  const { isReady, role, displayName } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (role === 'guest') {
      router.replace('/login');
      return;
    }
    apiGetMyAppointments()
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isReady, role, router]);

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const updated = await apiCancelAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      alert('Failed to cancel appointment.');
    }
  }, []);

  const userName = displayName || 'Client';

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingArr: ViewModel[] = [];
    const pastArr: ViewModel[] = [];

    for (const a of appointments) {
      const start = new Date(a.start_time);
      const item: ViewModel = {
        id: a.id,
        rawStart: start,
        dateLabel: formatDateTime(start),
        service: a.service.name,
        price: `$${(a.total_price_cents / 100).toFixed(2)}`,
        status: formatAppointmentStatus(a, start, now),
        serviceId: a.service.id,
        basePriceCents: a.service.price_cents,
        totalPriceCents: a.total_price_cents,
        durationMinutes: a.total_duration_minutes,
        addOnIds: a.add_ons.map((item) => item.id),
        addOnNames: a.add_ons.map((item) => item.name),
      };
      if (start >= now && a.status !== 'CANCELLED') upcomingArr.push(item);
      else pastArr.push(item);
    }

    upcomingArr.sort((a, b) => a.rawStart.getTime() - b.rawStart.getTime());
    pastArr.sort((a, b) => b.rawStart.getTime() - a.rawStart.getTime());

    return { upcoming: upcomingArr, past: pastArr };
  }, [appointments]);

  const calendarDays = useMemo(() => buildCalendarDays(appointments), [appointments]);

  function handleReschedule(b: ViewModel) {
    if (!window.confirm('Do you want to reschedule this appointment?')) return;
    const params = new URLSearchParams({
      rescheduleId: b.id,
      serviceId: b.serviceId,
      title: b.service,
      basePrice: String(b.basePriceCents),
      totalPrice: String(b.totalPriceCents),
      duration: String(b.durationMinutes),
      addOnIds: b.addOnIds.join(','),
      addOnNames: b.addOnNames.join('|'),
    });
    router.push(`/book/schedule?${params.toString()}`);
  }

  if (!isReady || role === 'guest') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading your appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Hi, {userName}</h1>
        </div>
        <button
          onClick={() => router.push('/book')}
          className="rounded-full bg-[#1a132f] px-4 py-2 text-white shadow-sm hover:brightness-110"
        >
          New booking
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Upcoming">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[#7b7794]">No upcoming bookings yet.</p>
          ) : (
            upcoming.map((b) => (
              <BookingRow
                key={b.id}
                {...b}
                onCancel={() => handleCancel(b.id)}
                onReschedule={() => handleReschedule(b)}
              />
            ))
          )}
        </Card>
        <Card title="History">
          {past.length === 0 ? (
            <p className="text-sm text-[#7b7794]">No past bookings yet.</p>
          ) : (
            past.map((b) => <BookingRow key={b.id} {...b} />)
          )}
        </Card>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-[#0f0a1e]">30-day booking view</h2>
        <p className="text-sm text-[#5a5872]">Next 30 days of your bookings, grouped so busy days stay readable.</p>
        <UserCalendar days={calendarDays} />
      </div>
    </div>
  );
}

type ViewModel = {
  id: string;
  rawStart: Date;
  dateLabel: string;
  service: string;
  price: string;
  status: string;
  serviceId: string;
  basePriceCents: number;
  totalPriceCents: number;
  durationMinutes: number;
  addOnIds: string[];
  addOnNames: string[];
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#0f0a1e]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BookingRow({
  dateLabel,
  service,
  price,
  status,
  onCancel,
  onReschedule,
}: ViewModel & { onCancel?: () => void; onReschedule?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div>
        <p className="text-sm text-[#7b7794]">{dateLabel}</p>
        <p className="text-base font-semibold text-[#0f0a1e]">{service}</p>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-sm text-[#7b7794]">{status}</p>
          <p className="text-lg font-bold text-[#1a132f]">{price}</p>
        </div>
        {onCancel && onReschedule && (status === 'Confirmed' || status === 'Pending') && (
          <div className="flex flex-col gap-1">
            <button
              onClick={onReschedule}
              className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              Reschedule
            </button>
            <button
              onClick={onCancel}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:brightness-110"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatDateTime(date: Date) {
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Toronto',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(date);
  return `${datePart} - ${timePart}`;
}

function formatAppointmentStatus(appointment: AppointmentData, start: Date, now: Date) {
  if (appointment.status === 'CANCELLED') return 'Cancelled';
  if (appointment.status === 'NO_SHOW') return 'No-show';
  if (appointment.status === 'CONFIRMED' && start < now) return 'Completed';
  if (appointment.status === 'PENDING') return 'Pending';
  return 'Confirmed';
}

type CalendarDay = {
  date: Date;
  items: { id: string; start: Date; service: string }[];
};

function buildCalendarDays(appointments: AppointmentData[]): CalendarDay[] {
  const start = startOfDay(new Date());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 30; i++) {
    const day = addDays(start, i);
    const items = appointments
      .filter((a) => a.status !== 'CANCELLED')
      .map((a) => ({ id: a.id, dateObj: new Date(a.start_time), service: a.service.name }))
      .filter((a) => isSameDate(a.dateObj, day))
      .map((a) => ({ id: a.id, start: a.dateObj, service: a.service }));

    days.push({ date: day, items });
  }

  return days;
}

function UserCalendar({ days }: { days: CalendarDay[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
      {days.map((day) => (
        <div key={day.date.toISOString()} className="rounded-xl border border-[#e5e4ef] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7b7794]">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'America/Toronto',
            }).format(day.date)}
          </p>
          {day.items.length === 0 ? (
            <p className="mt-2 text-xs text-[#b0afc4]">No bookings</p>
          ) : (
            <div className="mt-2 space-y-1">
              {day.items.slice(0, 2).map((b) => (
                <div key={b.id} className="rounded-lg bg-[#f1eefc] px-2 py-1">
                  <p className="text-xs font-semibold text-[#1a132f]">
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Toronto',
                    }).format(b.start)}{' '}
                    &middot; {b.service}
                  </p>
                </div>
              ))}
              {day.items.length > 2 ? (
                <p className="text-xs font-semibold text-[#7b7794]">+{day.items.length - 2} more booking(s)</p>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isSameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
