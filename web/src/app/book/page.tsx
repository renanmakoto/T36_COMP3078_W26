'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiGetServices, type ServiceData } from '../api';

export default function BookingPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetServices()
      .then(setServices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const chosen = services.find((s) => s.id === selected);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Choose the service</h1>
          </div>
          <p className="text-sm text-[#5a5872]">Slots in 15-minute intervals</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const active = selected === service.id;
            return (
              <button
                key={service.id}
                onClick={() => setSelected(service.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active ? 'border-[#1a132f] shadow-[0_10px_30px_-16px_rgba(26,19,47,0.4)]' : 'border-[#e5e4ef]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-semibold text-[#0f0a1e]">{service.name}</p>
                    <p className="text-sm text-[#5a5872]">{service.description}</p>
                  </div>
                  <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                    ~{service.duration_minutes} min
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold text-[#1a132f]">
                  ${(service.price_cents / 100).toFixed(2)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#0f0a1e] px-4 py-3 text-white">
          <div>
            <p className="text-sm text-[#c7c3de]">Summary</p>
            <p className="text-lg font-semibold">
              {chosen ? chosen.name : 'Select a service'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#c7c3de]">Total</p>
            <p className="text-2xl font-bold">
              ${chosen ? (chosen.price_cents / 100).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!chosen}
            onClick={() =>
              router.push(
                `/book/schedule?serviceId=${chosen?.id}&title=${encodeURIComponent(chosen?.name ?? '')}&price=${
                  chosen?.price_cents ?? 0
                }&duration=${chosen?.duration_minutes ?? 0}`,
              )
            }
            className={`rounded-xl px-4 py-3 text-white shadow-sm transition ${
              chosen ? 'bg-[#1a132f] hover:brightness-110' : 'cursor-not-allowed bg-[#cfcde1]'
            }`}
          >
            Continue to schedule
          </button>
        </div>
      </div>
    </div>
  );
}
