'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';

export default function UserDashboardPage() {
  const { role, displayName, bookings, cancelBooking } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role === 'guest') router.replace('/login');
  }, [role, router]);

  if (role === 'guest') return null;

  const now = new Date();
  const userName = displayName || 'Client';

  const { upcoming, past } = useMemo(() => {
    const mine = bookings.filter((b) => b.userName === userName);
    const upcomingArr: BookingViewModel[] = [];
    const pastArr: BookingViewModel[] = [];

    for (const b of mine) {
      const start = new Date(b.start);
      const item: BookingViewModel = {
        id: b.id,
        rawStart: start,
        dateLabel: formatDateTime(start),
        service: b.serviceTitle,
        price: `$${b.price.toFixed(2)}`,
        status: b.status === 'cancelled' ? 'Cancelled' : start >= now ? 'Upcoming' : 'Completed',
      };
      if (start >= now && b.status !== 'cancelled') upcomingArr.push(item);
      else pastArr.push(item);
    }

    upcomingArr.sort((a, b) => a.dateLabel.localeCompare(b.dateLabel));
    pastArr.sort((a, b) => b.dateLabel.localeCompare(a.dateLabel));

    return { upcoming: upcomingArr, past: pastArr };
  }, [bookings, now, userName]);

  const calendarDays = useMemo(
    () => buildCalendarDays(bookings, userName),
    [bookings, userName],
  );

  function handleCancel(b: BookingViewModel) {
    const diffHours = (b.rawStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLate = diffHours < 30;
    const message = isLate
      ? 'This cancellation is less than 30 hours before your appointment and may lead to a fee. Do you want to continue?'
      : 'This cancellation is more than 30 hours before your appointment and will not be charged. Continue?';

    if (window.confirm(message)) {
      cancelBooking(b.id);
    }
  }

  function handleReschedule(b: BookingViewModel) {
    const diffHours = (b.rawStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isLate = diffHours < 30;
    const message = isLate
      ? 'Rescheduling less than 30 hours before your appointment may lead to a fee. Do you want to continue?'
      : 'Rescheduling more than 30 hours before your appointment will not be charged. Continue?';

    if (window.confirm(message)) {
      router.push(`/book/schedule?bookingId=${encodeURIComponent(b.id)}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7b7794]">My account</p>
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
                onCancel={() => handleCancel(b)}
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
        <h2 className="text-xl font-semibold text-[#0f0a1e]">Calendar</h2>
        <p className="text-sm text-[#5a5872]">
          Next 30 days of your bookings, similar to the admin calendar.
        </p>
        <UserCalendar days={calendarDays} />
      </div>
    </div>
  );
}

type BookingViewModel = {
  id: string;
  rawStart: Date;
  dateLabel: string;
  service: string;
  price: string;
  status: string;
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
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
}: BookingViewModel & { onCancel?: () => void; onReschedule?: () => void }) {
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
        {onCancel && onReschedule && status === 'Upcoming' && (
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
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${datePart} - ${timePart}`;
}

type CalendarDay = {
  date: Date;
  items: { id: string; start: Date; service: string }[];
};

function buildCalendarDays(bookings: any[], userName: string): CalendarDay[] {
  const start = startOfDay(new Date());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 30; i++) {
    const day = addDays(start, i);
    const items =
      bookings
        .filter((b) => b.userName === userName && b.status !== 'cancelled')
        .map((b) => ({ ...b, dateObj: new Date(b.start) }))
        .filter((b) => isSameDate(b.dateObj, day))
        .map((b) => ({
          id: b.id,
          start: b.dateObj,
          service: b.serviceTitle,
        })) || [];

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
            }).format(day.date)}
          </p>
          {day.items.length === 0 ? (
            <p className="mt-2 text-xs text-[#b0afc4]">No bookings</p>
          ) : (
            <div className="mt-2 space-y-1">
              {day.items.map((b) => (
                <div key={b.id} className="rounded-lg bg-[#f1eefc] px-2 py-1">
                  <p className="text-xs font-semibold text-[#1a132f]">
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    }).format(b.start)}{' '}
                    · {b.service}
                  </p>
                </div>
              ))}
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

