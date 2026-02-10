'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';

export default function AdminDashboardPage() {
  const { role, bookings, cancelBooking, setBookingStatus } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'calendar' | 'analytics'>('list');

  useEffect(() => {
    if (role !== 'admin') router.replace('/admin/login');
  }, [role, router]);

  if (role !== 'admin') return null;

  const now = new Date();

  const { upcoming, previous } = useMemo(() => {
    const mapped = bookings.map<AdminBookingViewModel>((b) => {
      const start = new Date(b.start);
      return {
        id: b.id,
        start,
        timeLabel: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(start),
        client: b.userName,
        service: b.serviceTitle,
        status: b.status,
      };
    });

    const upcomingArr = mapped
      .filter((b) => b.start >= now && b.status !== 'cancelled')
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousArr = mapped
      .filter((b) => b.start < now && b.start >= thirtyDaysAgo)
      .sort((a, b) => b.start.getTime() - a.start.getTime());

    return { upcoming: upcomingArr, previous: previousArr };
  }, [bookings, now]);

  const calendarDays = useMemo(() => {
    const days: CalendarDay[] = [];
    const start = startOfDay(new Date());
    for (let i = 0; i < 30; i++) {
      const day = addDays(start, i);
      const dayBookings = upcoming.filter((b) => isSameDate(b.start, day));
      days.push({ date: day, bookings: dayBookings });
    }
    return days;
  }, [upcoming]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7b7794]">Erick's control panel</p>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab('list')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === 'list' ? 'bg-[#1a132f] text-white' : 'bg-white text-[#1a132f] shadow-sm'
            }`}
          >
            List
          </button>
          <button
            onClick={() => setTab('calendar')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === 'calendar' ? 'bg-[#1a132f] text-white' : 'bg-white text-[#1a132f] shadow-sm'
            }`}
          >
            Calendar
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              tab === 'analytics' ? 'bg-[#1a132f] text-white' : 'bg-white text-[#1a132f] shadow-sm'
            }`}
          >
            Analytics
          </button>
        </div>
      </div>

      {tab === 'list' && (
        <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
          <section>
            <h2 className="text-xl font-semibold text-[#0f0a1e]">Upcoming bookings</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-[#7b7794]">No upcoming bookings yet.</p>
              ) : (
                upcoming.map((b) => (
                  <AdminBookingRow
                    key={b.id}
                    booking={b}
                    onCancel={() => cancelBooking(b.id)}
                    onComplete={() => setBookingStatus(b.id, 'completed')}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#0f0a1e]">Previous 30 days</h2>
            <div className="mt-4 space-y-3">
              {previous.length === 0 ? (
                <p className="text-sm text-[#7b7794]">No bookings in the last 30 days.</p>
              ) : (
                previous.map((b) => (
                  <AdminBookingRow
                    key={b.id}
                    booking={b}
                    onCancel={() => cancelBooking(b.id)}
                    onComplete={() => setBookingStatus(b.id, 'completed')}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f0a1e]">Calendar</h2>
          <p className="text-sm text-[#5a5872]">
            Next 30 days of bookings. This is a front-end mock of a future Google Calendar-style view.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {calendarDays.map((day) => (
              <div key={day.date.toISOString()} className="rounded-xl border border-[#e5e4ef] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7b7794]">
                  {new Intl.DateTimeFormat('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }).format(day.date)}
                </p>
                {day.bookings.length === 0 ? (
                  <p className="mt-2 text-xs text-[#b0afc4]">No bookings</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {day.bookings.map((b) => (
                      <div key={b.id} className="rounded-lg bg-[#f1eefc] px-2 py-1">
                        <p className="text-xs font-semibold text-[#1a132f]">
                          {new Intl.DateTimeFormat('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          }).format(b.start)}{' '}
                          · {b.service}
                        </p>
                        <p className="text-[11px] text-[#5a5872]">{b.client}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && <Analytics />}
    </div>
  );
}

type AdminBookingViewModel = {
  id: string;
  start: Date;
  timeLabel: string;
  client: string;
  service: string;
  status: string;
};

type CalendarDay = {
  date: Date;
  bookings: AdminBookingViewModel[];
};

function Analytics() {
  const topServices = [
    { name: 'Haircut & Beard', percent: 38 },
    { name: 'Haircut', percent: 36 },
    { name: 'Beard', percent: 19 },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0f0a1e]">Indicators (mock)</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Metric label="Bookings - month" value="42" />
        <Metric label="Revenue - month" value="$1,725" />
        <Metric label="No-show rate" value="7%" />
        <Metric label="New clients" value="12" />
        <Metric label="Retention" value="71%" />
        <Metric label="Cancellations" value="5" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
          <h3 className="text-lg font-semibold text-[#0f0a1e]">Top services</h3>
          <div className="mt-3 space-y-2">
            {topServices.map((s, idx) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm text-[#5a5872]">
                  <span>
                    {idx + 1}) {s.name}
                  </span>
                  <span>{s.percent}%</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e5e4ef]">
                  <div className="h-full rounded-full bg-[#1a132f]" style={{ width: `${s.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
          <h3 className="text-lg font-semibold text-[#0f0a1e]">Insights</h3>
          <Insight text="Thursdays 5-6 PM are the peak - consider extending hours." />
          <Insight text="Haircut & Beard combo accounts for 42% of monthly revenue." />
          <Insight text="3 no-shows this month; reinforce reminders the day before." />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <p className="text-xs uppercase tracking-wide text-[#7b7794]">{label}</p>
      <p className="text-2xl font-bold text-[#0f0a1e]">{value}</p>
    </div>
  );
}

function Insight({ text }: { text: string }) {
  return <p className="text-sm text-[#1a132f]">• {text}</p>;
}

function AdminBookingRow({
  booking,
  onCancel,
  onComplete,
}: {
  booking: AdminBookingViewModel;
  onCancel: () => void;
  onComplete: () => void;
}) {
  const statusLabel =
    booking.status === 'cancelled' ? 'Cancelled' : booking.start < new Date() ? 'Completed' : 'Scheduled';

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div>
        <p className="text-sm text-[#7b7794]">{booking.timeLabel}</p>
        <p className="text-base font-semibold text-[#0f0a1e]">{booking.client}</p>
        <p className="text-sm text-[#5a5872]">{booking.service}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full bg-[#e8f7f0] px-3 py-1 text-xs font-semibold text-[#137b45]">
          {statusLabel}
        </span>
        <div className="flex flex-col gap-1">
          <button
            onClick={onComplete}
            className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
          >
            Mark completed
          </button>
          <button
            onClick={onCancel}
            className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:brightness-110"
          >
            Cancel
          </button>
        </div>
      </div>
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

