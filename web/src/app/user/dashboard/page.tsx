'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';

const upcoming = [
  { date: 'Thu, Jan 29 • 7:00 PM', service: 'Haircut & Beard', price: '$25', status: 'Confirmed' },
  { date: 'Sat, Jan 31 • 9:15 AM', service: 'Haircut + Brows', price: '$25', status: 'Confirmed' },
];

const past = [
  { date: 'Jan 10 • 6:30 PM', service: 'Haircut', price: '$20', status: 'Completed' },
  { date: 'Dec 15 • 5:00 PM', service: 'Haircut & Beard', price: '$25', status: 'Completed' },
];

export default function UserDashboardPage() {
  const { role, displayName } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (role === 'guest') router.replace('/login');
  }, [role, router]);

  if (role === 'guest') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7b7794]">My account</p>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Hi, {displayName || 'Client'}</h1>
        </div>
        <button
          onClick={() => router.push('/book')}
          className="rounded-full bg-[#1a132f] px-4 py-2 text-white shadow-sm hover:brightness-110"
        >
          New booking
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Próximos">
          {upcoming.map((b) => (
            <BookingRow key={b.date} {...b} />
          ))}
        </Card>
        <Card title="Histórico">
          {past.map((b) => (
            <BookingRow key={b.date} {...b} />
          ))}
        </Card>
      </div>
    </div>
  );
}

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

function BookingRow({ date, service, price, status }: { date: string; service: string; price: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div>
        <p className="text-sm text-[#7b7794]">{date}</p>
        <p className="text-base font-semibold text-[#0f0a1e]">{service}</p>
      </div>
      <div className="text-right">
        <p className="text-sm text-[#7b7794]">{status}</p>
        <p className="text-lg font-bold text-[#1a132f]">{price}</p>
      </div>
    </div>
  );
}
