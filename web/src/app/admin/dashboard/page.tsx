'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';
import {
  apiAnalyticsOverview,
  apiGetAdminTestimonials,
  apiGetAllAppointments,
  type AdminAnalyticsOverviewData,
  type AdminAppointmentData,
  type AdminTestimonialData,
} from '../../api';
import { AdminSectionNav, formatCurrency, formatDateTime, panelClass, statusTone } from './admin-ui';

type DashboardSnapshot = {
  appointments: AdminAppointmentData[];
  overview: AdminAnalyticsOverviewData;
  testimonials: AdminTestimonialData[];
};

export default function AdminDashboardPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [appointments, overview, testimonials] = await Promise.all([
          apiGetAllAppointments(),
          apiAnalyticsOverview(),
          apiGetAdminTestimonials(),
        ]);
        setSnapshot({ appointments, overview, testimonials });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isReady, role, router]);

  const upcomingAppointments = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.appointments]
      .filter((item) => item.status !== 'CANCELLED' && new Date(item.start_time) >= new Date())
      .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())
      .slice(0, 6);
  }, [snapshot]);

  const todayAppointments = useMemo(() => {
    if (!snapshot) return [];
    const today = new Date();
    return snapshot.appointments
      .filter((item) => {
        const start = new Date(item.start_time);
        return (
          item.status !== 'CANCELLED' &&
          start.getFullYear() === today.getFullYear() &&
          start.getMonth() === today.getMonth() &&
          start.getDate() === today.getDate()
        );
      })
      .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())
      .slice(0, 6);
  }, [snapshot]);

  if (!isReady || role !== 'admin') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{error || 'Failed to load dashboard.'}</p>
      </div>
    );
  }

  const pendingReviews = snapshot.testimonials.filter((item) => item.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div className={`${panelClass} bg-[linear-gradient(135deg,#ffffff_0%,#f1eefc_52%,#fff8ef_100%)]`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b7794]">Admin dashboard</p>
        <h1 className="mt-3 text-3xl font-bold text-[#0f0a1e]">Overview for Erick</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5a5872]">
          Focus on what matters first: today&apos;s queue, upcoming bookings, money scheduled to come in, and client
          activity.
        </p>
      </div>

      <AdminSectionNav />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Today bookings" value={String(snapshot.overview.today_bookings)} />
        <MetricCard label="Upcoming bookings" value={String(snapshot.overview.upcoming_bookings)} />
        <MetricCard label="Scheduled revenue" value={formatCurrency(snapshot.overview.scheduled_revenue_cents)} />
        <MetricCard label="Pending reviews" value={String(pendingReviews)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Today&apos;s queue</h2>
              <p className="text-sm text-[#5a5872]">Quick scan of what Erick needs to handle today.</p>
            </div>
            <Link href="/admin/dashboard/bookings" className="text-sm font-semibold text-[#1a132f] hover:underline">
              Open bookings
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {todayAppointments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
                No bookings scheduled for today.
              </p>
            ) : (
              todayAppointments.map((appointment) => (
                <AppointmentRow key={appointment.id} appointment={appointment} />
              ))
            )}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Business snapshot</h2>
          <div className="mt-5 grid gap-4">
            <SnapshotCard
              label="This month revenue"
              value={formatCurrency(snapshot.overview.this_month_revenue_cents)}
              note="Expected value from non-cancelled appointments in the current month."
            />
            <SnapshotCard
              label="Completed revenue"
              value={formatCurrency(snapshot.overview.completed_revenue_cents)}
              note="Appointments already completed and counted as delivered work."
            />
            <SnapshotCard
              label="Returning clients"
              value={String(snapshot.overview.returning_clients)}
              note={`Out of ${snapshot.overview.unique_clients} active clients in the system.`}
            />
          </div>
        </section>
      </div>

      <section className={panelClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Next upcoming bookings</h2>
            <p className="text-sm text-[#5a5872]">The next confirmed or pending appointments coming up.</p>
          </div>
          <Link href="/admin/dashboard/analytics" className="text-sm font-semibold text-[#1a132f] hover:underline">
            View analytics
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {upcomingAppointments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
              No upcoming bookings yet.
            </p>
          ) : (
            upcomingAppointments.map((appointment) => <AppointmentRow key={appointment.id} appointment={appointment} />)
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-[#7b7794]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0f0a1e]">{value}</p>
    </div>
  );
}

function SnapshotCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#7b7794]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0f0a1e]">{value}</p>
      <p className="mt-2 text-sm text-[#5a5872]">{note}</p>
    </div>
  );
}

function AppointmentRow({ appointment }: { appointment: AdminAppointmentData }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[#7b7794]">{formatDateTime(appointment.start_time)}</p>
          <p className="mt-1 text-base font-semibold text-[#0f0a1e]">
            {appointment.user.display_name || appointment.user.email}
          </p>
          <p className="text-sm text-[#5a5872]">
            {appointment.service.name} / {appointment.add_ons.length} add-ons /{' '}
            {formatCurrency(appointment.total_price_cents)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(appointment.status)}`}>
          {appointment.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}
