'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const mainServices = [
  { id: 'haircut', title: 'Haircut', desc: 'Fresh fade or classic cut.', price: 20, duration: 45 },
  { id: 'beard', title: 'Beard', desc: 'Lineup, trim, and finish.', price: 15, duration: 30 },
  { id: 'combo', title: 'Haircut & Beard', desc: 'Complete package for hair and beard.', price: 25, duration: 60 },
];

const addOn = {
  id: 'brows',
  title: 'Eyebrows',
  desc: 'Eyebrow shaping and trimming.',
  price: 5,
  duration: 15,
};

export default function BookingPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [includeBrows, setIncludeBrows] = useState(false);

  const chosen = mainServices.find((s) => s.id === selected);
  const total = (chosen?.price ?? 0) + (includeBrows ? addOn.price : 0);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#7b7794]">Step 1</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Choose the service</h1>
          </div>
          <p className="text-sm text-[#5a5872]">Slots in 15-minute intervals</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {mainServices.map((service) => {
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
                    <p className="text-lg font-semibold text-[#0f0a1e]">{service.title}</p>
                    <p className="text-sm text-[#5a5872]">{service.desc}</p>
                  </div>
                  <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                    ~{service.duration} min
                  </span>
                </div>
                <p className="mt-4 text-2xl font-bold text-[#1a132f]">${service.price}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#e5e4ef] bg-[#faf9ff] p-4">
          <input
            id="brows"
            type="checkbox"
            checked={includeBrows}
            onChange={(e) => setIncludeBrows(e.target.checked)}
            className="mt-1 h-5 w-5 accent-[#1a132f]"
          />
          <div className="flex-1">
            <label htmlFor="brows" className="text-base font-semibold text-[#0f0a1e]">
              Add eyebrows
            </label>
            <p className="text-sm text-[#5a5872]">{addOn.desc}</p>
          </div>
          <p className="text-sm font-semibold text-[#1a132f]">+${addOn.price}</p>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-[#0f0a1e] px-4 py-3 text-white">
          <div>
            <p className="text-sm text-[#c7c3de]">Summary</p>
            <p className="text-lg font-semibold">
              {chosen ? chosen.title : 'Select a service'}
              {includeBrows && chosen ? ' + Brows' : ''}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-[#c7c3de]">Total</p>
            <p className="text-2xl font-bold">${total}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            disabled={!chosen}
            onClick={() =>
              router.push(
                `/book/schedule?service=${chosen?.id}&title=${encodeURIComponent(chosen?.title ?? '')}&price=${
                  chosen?.price ?? 0
                }&duration=${chosen?.duration ?? 0}&brows=${includeBrows ? 1 : 0}`,
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

