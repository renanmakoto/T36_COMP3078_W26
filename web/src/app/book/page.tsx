'use client';

import { useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiGetServices, type AddOnData, type ServiceData } from '../api';
import { useSession } from '../session-context';

export default function BookingPage() {
  const router = useRouter();
  const { isReady, role } = useSession();
  const [services, setServices] = useState<ServiceData[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetServices()
      .then((items) => {
        setServices(items);
        if (items[0]) setSelectedServiceId(items[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  const selectedAddOns = useMemo(
    () =>
      selectedService?.available_add_ons.filter((addOn) => selectedAddOnIds.includes(addOn.id)) ?? [],
    [selectedService, selectedAddOnIds],
  );

  const totalPrice = (selectedService?.price_cents ?? 0) + selectedAddOns.reduce((sum, addOn) => sum + addOn.price_cents, 0);
  const totalDuration =
    (selectedService?.duration_minutes ?? 0) + selectedAddOns.reduce((sum, addOn) => sum + addOn.duration_minutes, 0);

  function toggleAddOn(addOn: AddOnData) {
    setSelectedAddOnIds((prev) => (prev.includes(addOn.id) ? prev.filter((id) => id !== addOn.id) : [...prev, addOn.id]));
  }

  function continueToSchedule() {
    if (!selectedService) return;
    const params = new URLSearchParams({
      serviceId: selectedService.id,
      title: selectedService.name,
      basePrice: String(selectedService.price_cents),
      totalPrice: String(totalPrice),
      duration: String(totalDuration),
      addOnIds: selectedAddOns.map((addOn) => addOn.id).join(','),
      addOnNames: selectedAddOns.map((addOn) => addOn.name).join('|'),
    });
    router.push(`/book/schedule?${params.toString()}`);
  }

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading services...</p>
      </div>
    );
  }

  if (!selectedService) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">No active services are available right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#7b7794]">Step 1</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Choose service and add-ons</h1>
          </div>
          <p className="text-sm text-[#5a5872]">Admins control these options from the dashboard.</p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {services.map((service) => {
              const active = selectedServiceId === service.id;
              return (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedServiceId(service.id);
                    setSelectedAddOnIds([]);
                  }}
                  className={`booking-service-card overflow-hidden rounded-3xl border text-left transition ${
                    active
                      ? 'border-[#1a132f] shadow-[0_16px_40px_-26px_rgba(26,19,47,0.45)]'
                      : 'border-[#e5e4ef] hover:border-[#c8c6e2]'
                  }`}
                >
                  <div
                    className="booking-service-media"
                    style={{
                      backgroundImage: service.image_url
                        ? `linear-gradient(180deg, rgba(15,10,30,0.08), rgba(15,10,30,0.5)), url(${service.image_url})`
                        : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
                    }}
                  />
                  <div className="booking-service-body bg-[#fcfcff] p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="booking-service-title text-xl font-semibold text-[#0f0a1e]">{service.name}</p>
                        <p className="booking-service-copy text-sm text-[#5a5872]">{service.description}</p>
                      </div>
                      <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                        {service.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-[#1a132f]">${(service.price_cents / 100).toFixed(2)}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7b7794]">
                        {service.available_add_ons.length} extras
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="space-y-5 rounded-[2rem] border border-[#ecebf5] bg-[#fcfcff] p-5">
            <div
              className="booking-detail-media rounded-[1.5rem]"
              style={{
                backgroundImage: selectedService.image_url
                  ? `linear-gradient(180deg, rgba(15,10,30,0.08), rgba(15,10,30,0.5)), url(${selectedService.image_url})`
                  : 'linear-gradient(135deg, #d9d2ff, #f6f6ff)',
              }}
            />

            <div className="space-y-3">
              <div>
                <h2 className="text-2xl font-bold text-[#0f0a1e]">{selectedService.name}</h2>
                <p className="mt-2 text-sm leading-6 text-[#5a5872]">{selectedService.description}</p>
              </div>

              {selectedService.payment_note && (
                <div className="rounded-2xl border border-[#ecebf5] bg-white p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#7b7794]">Payment note</p>
                  <p className="mt-2 text-sm text-[#1a132f]">{selectedService.payment_note}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-[#0f0a1e]">Additional services</h3>
                  <p className="text-sm text-[#7b7794]">Optional extras</p>
                </div>
                {selectedService.available_add_ons.length === 0 ? (
                  <p className="mt-3 text-sm text-[#7b7794]">No add-ons configured for this service yet.</p>
                ) : (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedService.available_add_ons.map((addOn) => {
                      const active = selectedAddOnIds.includes(addOn.id);
                      return (
                        <button
                          key={addOn.id}
                          type="button"
                          onClick={() => toggleAddOn(addOn)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active ? 'border-[#1a132f] bg-white shadow-sm' : 'border-[#e5e4ef] hover:border-[#c8c6e2]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold text-[#0f0a1e]">{addOn.name}</p>
                              <p className="text-sm text-[#5a5872]">{addOn.description}</p>
                            </div>
                            <input readOnly checked={active} type="checkbox" className="mt-1 h-4 w-4 accent-[#1a132f]" />
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm text-[#5a5872]">
                            <span>{addOn.category || 'Add-on'}</span>
                            <span className="font-semibold text-[#1a132f]">
                              +${(addOn.price_cents / 100).toFixed(2)} / +{addOn.duration_minutes} min
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#0f0a1e] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-[#c7c3de]">Summary</p>
                  <p className="mt-1 text-xl font-semibold">{selectedService.name}</p>
                  <div className="mt-2 space-y-1 text-sm text-[#ddd9ef]">
                    <p>{selectedService.duration_minutes} minutes base time</p>
                    {selectedAddOns.map((addOn) => (
                      <p key={addOn.id}>
                        + {addOn.name} ({addOn.duration_minutes} min / ${(addOn.price_cents / 100).toFixed(2)})
                      </p>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#c7c3de]">Total</p>
                  <p className="text-3xl font-bold">${(totalPrice / 100).toFixed(2)}</p>
                  <p className="text-sm text-[#ddd9ef]">{totalDuration} minutes</p>
                </div>
              </div>
              <button
                onClick={continueToSchedule}
                className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0f0a1e] transition hover:translate-y-[-1px]"
              >
                Continue to schedule
              </button>
              {isReady && role === 'guest' ? (
                <p className="mt-3 text-xs text-[#ddd9ef]">
                  You can review the calendar first. Sign-in is only required when you confirm the appointment.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
