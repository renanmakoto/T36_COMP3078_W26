'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';
import {
  apiGetAllAppointments,
  apiAdminCancelAppointment,
  apiAdminChangeStatus,
  apiTopServices,
  apiNoShowRate,
  apiBookingsPerMonth,
  type AdminAppointmentData,
} from '../../api';

export default function AdminDashboardPage() {
  const { role } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'calendar' | 'analytics'>('list');
  const [appointments, setAppointments] = useState<AdminAppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role !== 'admin') {
      router.replace('/admin/login');
      return;
    }
    apiGetAllAppointments()
      .then(setAppointments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [role, router]);

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const updated = await apiAdminCancelAppointment(id);
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      alert('Failed to cancel.');
    }
  }, []);

  const handleComplete = useCallback(async (id: string) => {
    try {
      const updated = await apiAdminChangeStatus(id, 'CONFIRMED');
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      alert('Failed to update status.');
    }
  }, []);

  if (role !== 'admin') return null;

  const now = new Date();

  const { upcoming, previous } = useMemo(() => {
    const mapped = appointments.map<AdminBookingViewModel>((a) => {
      const start = new Date(a.start_time);
      return {
        id: a.id,
        start,
        timeLabel: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }).format(start),
        client: a.user.email,
        service: a.service.name,
        status: a.status,
      };
    });

    const upcomingArr = mapped
      .filter((b) => b.start >= now && b.status !== 'CANCELLED')
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const previousArr = mapped
      .filter((b) => b.start < now && b.start >= thirtyDaysAgo)
      .sort((a, b) => b.start.getTime() - a.start.getTime());

    return { upcoming: upcomingArr, previous: previousArr };
  }, [appointments, now]);

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

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Admin Dashboard</h1>
        </div>
        <div className="flex gap-2">
          {(['list', 'calendar', 'analytics'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                tab === t ? 'bg-[#1a132f] text-white' : 'bg-white text-[#1a132f] shadow-sm'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'list' && (
        <div className="space-y-6 rounded-3xl bg-white p-6 shadow-sm">
          <section>
            <h2 className="text-xl font-semibold text-[#0f0a1e]">Upcoming bookings</h2>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <p className="text-sm text-[#7b7794]">No upcoming bookings.</p>
              ) : (
                upcoming.map((b) => (
                  <AdminBookingRow
                    key={b.id}
                    booking={b}
                    onCancel={() => handleCancel(b.id)}
                    onComplete={() => handleComplete(b.id)}
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
                    onCancel={() => handleCancel(b.id)}
                    onComplete={() => handleComplete(b.id)}
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
          <p className="text-sm text-[#5a5872]">Next 30 days of bookings.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            {calendarDays.map((day) => (
              <div key={day.date.toISOString()} className="rounded-xl border border-[#e5e4ef] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7b7794]">
                  {new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(
                    day.date,
                  )}
                </p>
                {day.bookings.length === 0 ? (
                  <p className="mt-2 text-xs text-[#b0afc4]">No bookings</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {day.bookings.map((b) => (
                      <div key={b.id} className="rounded-lg bg-[#f1eefc] px-2 py-1">
                        <p className="text-xs font-semibold text-[#1a132f]">
                          {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(b.start)}{' '}
                          &middot; {b.service}
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
  const [topServices, setTopServices] = useState<{ service_name: string; count: number }[]>([]);
  const [noShowData, setNoShowData] = useState<{
    total_appointments: number;
    no_shows: number;
    no_show_rate_percent: number;
  } | null>(null);
  const [monthlyData, setMonthlyData] = useState<{ month: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const year = new Date().getFullYear().toString();
    Promise.all([apiTopServices(), apiNoShowRate(), apiBookingsPerMonth(year)])
      .then(([top, noShow, monthly]) => {
        setTopServices(top);
        setNoShowData(noShow);
        setMonthlyData(monthly);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading analytics...</p>
      </div>
    );
  }

  const totalBookings = monthlyData.reduce((sum, m) => sum + m.count, 0);
  const maxCount = Math.max(...topServices.map((s) => s.count), 1);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0f0a1e]">Analytics</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Metric label="Total bookings" value={String(totalBookings)} />
        <Metric label="No-show rate" value={noShowData ? `${noShowData.no_show_rate_percent}%` : '—'} />
        <Metric label="No-shows" value={noShowData ? String(noShowData.no_shows) : '—'} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
          <h3 className="text-lg font-semibold text-[#0f0a1e]">Top services</h3>
          <div className="mt-3 space-y-2">
            {topServices.length === 0 ? (
              <p className="text-sm text-[#7b7794]">No data yet.</p>
            ) : (
              topServices.map((s, idx) => (
                <div key={s.service_name}>
                  <div className="flex items-center justify-between text-sm text-[#5a5872]">
                    <span>
                      {idx + 1}) {s.service_name}
                    </span>
                    <span>{s.count} bookings</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#e5e4ef]">
                    <div
                      className="h-full rounded-full bg-[#1a132f]"
                      style={{ width: `${(s.count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
          <h3 className="text-lg font-semibold text-[#0f0a1e]">Bookings per month</h3>
          <div className="mt-3 space-y-2">
            {monthlyData.length === 0 ? (
              <p className="text-sm text-[#7b7794]">No data yet.</p>
            ) : (
              monthlyData.map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm text-[#5a5872]">
                  <span>{new Date(m.month).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                  <span className="font-semibold text-[#1a132f]">{m.count}</span>
                </div>
              ))
            )}
          </div>
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
    booking.status === 'CANCELLED'
      ? 'Cancelled'
      : booking.status === 'NO_SHOW'
        ? 'No-show'
        : booking.start < new Date()
          ? 'Completed'
          : booking.status === 'CONFIRMED'
            ? 'Confirmed'
            : 'Pending';

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
        {booking.status !== 'CANCELLED' && (
          <div className="flex flex-col gap-1">
            <button
              onClick={onComplete}
              className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              Mark confirmed
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
