'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiAnalyticsOverview,
  apiBookingsPerDay,
  apiBookingsPerMonth,
  apiNoShowRate,
  apiTopServices,
  type AdminAnalyticsOverviewData,
} from '../../../api';
import { AdminPageHeader, NoticeBanner, formatCurrency, panelClass } from '../admin-ui';

type TopService = { service_name: string; count: number };
type DailyCount = { date: string; count: number };
type MonthlyCount = { month: string; count: number };
type NoShowRate = { total_appointments: number; no_shows: number; no_show_rate_percent: number };

export default function AdminAnalyticsPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [overview, setOverview] = useState<AdminAnalyticsOverviewData | null>(null);
  const [topServices, setTopServices] = useState<TopService[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [monthlyCounts, setMonthlyCounts] = useState<MonthlyCount[]>([]);
  const [noShowRate, setNoShowRate] = useState<NoShowRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentMonth = useMemo(() => new Intl.DateTimeFormat('en-CA').format(new Date()).slice(0, 7), []);
  const currentYear = useMemo(() => String(new Date().getFullYear()), []);

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
        const [overviewData, topServiceData, bookingsDayData, bookingsMonthData, noShowData] = await Promise.all([
          apiAnalyticsOverview(),
          apiTopServices(),
          apiBookingsPerDay(currentMonth),
          apiBookingsPerMonth(currentYear),
          apiNoShowRate(),
        ]);
        setOverview(overviewData);
        setTopServices(topServiceData);
        setDailyCounts(bookingsDayData);
        setMonthlyCounts(bookingsMonthData);
        setNoShowRate(noShowData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [currentMonth, currentYear, isReady, role, router]);

  if (!isReady || role !== 'admin') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Business Analytics"
        description="Key numbers for revenue, booking quality, client return rate, and demand by service."
      />

      <NoticeBanner error={error} />

      {overview ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Scheduled revenue" value={formatCurrency(overview.scheduled_revenue_cents)} />
            <MetricCard label="Completed revenue" value={formatCurrency(overview.completed_revenue_cents)} />
            <MetricCard label="This month revenue" value={formatCurrency(overview.this_month_revenue_cents)} />
            <MetricCard label="No-show rate" value={`${noShowRate?.no_show_rate_percent ?? 0}%`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
            <section className={panelClass}>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Revenue and clients</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard
                  label="Upcoming bookings"
                  value={String(overview.upcoming_bookings)}
                  note="Appointments still on the calendar."
                />
                <InfoCard
                  label="Today bookings"
                  value={String(overview.today_bookings)}
                  note="What Erick should expect today."
                />
                <InfoCard
                  label="Active clients"
                  value={String(overview.unique_clients)}
                  note="Unique clients with non-cancelled bookings."
                />
                <InfoCard
                  label="Returning clients"
                  value={String(overview.returning_clients)}
                  note={`New clients this month: ${overview.new_clients_this_month}`}
                />
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Booking quality</h2>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <InfoCard
                  label="Total tracked"
                  value={String(noShowRate?.total_appointments ?? 0)}
                  note="Non-cancelled appointments in analytics."
                />
                <InfoCard
                  label="No-shows"
                  value={String(noShowRate?.no_shows ?? 0)}
                  note="Clients marked as no-show."
                />
              </div>
              <div className="mt-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4 text-sm text-[#5a5872]">
                Use this area to watch demand and attendance together. If no-shows climb while bookings stay high, the
                shop may need firmer reminders or cancellation policy messaging.
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f0a1e]">Top services</h2>
                  <p className="text-sm text-[#5a5872]">What clients book most often.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {topServices.length === 0 ? (
                  <p className="text-sm text-[#7b7794]">No service data yet.</p>
                ) : (
                  topServices.map((item, index) => (
                    <BarRow
                      key={item.service_name}
                      label={`${index + 1}. ${item.service_name}`}
                      value={item.count}
                      maxValue={topServices[0]?.count || 1}
                    />
                  ))
                )}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#0f0a1e]">Daily bookings this month</h2>
                  <p className="text-sm text-[#5a5872]">Heavy and light days at a glance.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {dailyCounts.length === 0 ? (
                  <p className="text-sm text-[#7b7794]">No daily booking data yet.</p>
                ) : (
                  dailyCounts.map((item) => (
                    <BarRow
                      key={item.date}
                      label={new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(item.date))}
                      value={item.count}
                      maxValue={Math.max(...dailyCounts.map((entry) => entry.count), 1)}
                    />
                  ))
                )}
              </div>
            </section>
          </div>

          <section className={panelClass}>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Monthly booking trend</h2>
            <p className="mt-1 text-sm text-[#5a5872]">Longer view of booking volume across the year.</p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {monthlyCounts.length === 0 ? (
                <p className="text-sm text-[#7b7794]">No monthly data yet.</p>
              ) : (
                monthlyCounts.map((item) => (
                  <BarRow
                    key={item.month}
                    label={new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
                      new Date(item.month),
                    )}
                    value={item.count}
                    maxValue={Math.max(...monthlyCounts.map((entry) => entry.count), 1)}
                  />
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
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

function InfoCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-[#7b7794]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0f0a1e]">{value}</p>
      <p className="mt-2 text-sm text-[#5a5872]">{note}</p>
    </div>
  );
}

function BarRow({ label, value, maxValue }: { label: string; value: number; maxValue: number }) {
  const width = Math.max((value / Math.max(maxValue, 1)) * 100, value > 0 ? 8 : 0);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-[#1a132f]">{label}</span>
        <span className="text-[#5a5872]">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#efeafe]">
        <div className="h-full rounded-full bg-[#1a132f]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
