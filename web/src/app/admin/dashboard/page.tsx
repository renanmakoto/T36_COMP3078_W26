'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';

const listBookings = [
  { time: 'Today • 7:00 PM', client: 'Daniel Johnson', service: 'Haircut & Beard', status: 'Confirmed' },
  { time: 'Tomorrow • 10:15 AM', client: 'Ahmed Ali', service: 'Haircut + Brows', status: 'Confirmed' },
  { time: 'Tomorrow • 3:30 PM', client: 'Christopher Lee', service: 'Haircut', status: 'Pending' },
];

export default function AdminDashboardPage() {
  const { role } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'calendar' | 'analytics'>('list');

  useEffect(() => {
    if (role !== 'admin') router.replace('/admin/login');
  }, [role, router]);

  if (role !== 'admin') return null;

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
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f0a1e]">Upcoming bookings</h2>
          <div className="mt-4 space-y-3">
            {listBookings.map((b) => (
              <div
                key={b.time + b.client}
                className="flex items-center justify-between rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4"
              >
                <div>
                  <p className="text-sm text-[#7b7794]">{b.time}</p>
                  <p className="text-base font-semibold text-[#0f0a1e]">{b.client}</p>
                  <p className="text-sm text-[#5a5872]">{b.service}</p>
                </div>
                <span className="rounded-full bg-[#e8f7f0] px-3 py-1 text-xs font-semibold text-[#137b45]">
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'calendar' && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f0a1e]">Day view</h2>
          <p className="text-sm text-[#5a5872]">
            Placeholder: calendar/backend integration will be handled by the backend dev. Slots follow the 15-minute
            cadence from the mobile prototype.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-[#e5e4ef] p-3">
                <p className="font-semibold text-[#0f0a1e]">Jan {25 + i}</p>
                <p className="text-[#5a5872]">Open slots: {Math.max(0, 8 - (i % 5))}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && <Analytics />}
    </div>
  );
}

function Analytics() {
  const topServices = [
    { name: 'Haircut & Beard', percent: 38 },
    { name: 'Haircut', percent: 36 },
    { name: 'Beard', percent: 19 },
  ];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-[#0f0a1e]">Indicadores (mock)</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Metric label="Bookings mês" value="42" />
        <Metric label="Receita mês" value="$1,725" />
        <Metric label="No-show rate" value="7%" />
        <Metric label="Clientes novos" value="12" />
        <Metric label="Retention" value="71%" />
        <Metric label="Cancelamentos" value="5" />
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

        <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4 space-y-2">
          <h3 className="text-lg font-semibold text-[#0f0a1e]">Insights</h3>
          <Insight text="Thursdays 5–6 PM are the peak — consider extending hours." />
          <Insight text="Haircut & Beard combo accounts for 42% of monthly revenue." />
          <Insight text="3 no-shows this month; reinforce reminder the day before." />
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
