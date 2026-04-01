'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../../session-context';
import {
  apiCreateAppointment,
  apiGetAvailability,
  apiResolveBookingLink,
  apiRescheduleAppointment,
  apiRescheduleBookingLink,
  type AppointmentData,
} from '../../api';

type PendingBookingDraft = {
  path: string;
  serviceId: string;
  title: string;
  basePriceCents: number;
  totalPriceCents: number;
  duration: number;
  addOnIds: string[];
  addOnSummary: string[];
  selectedDate: string;
  selectedSlot: string;
};

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading...</p>
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}

function ScheduleContent() {
  const search = useSearchParams();
  const router = useRouter();
  const { isReady, role } = useSession();
  const today = useMemo(() => getLocalDateInputValue(), []);

  const serviceIdFromQuery = search.get('serviceId');
  const titleFromQuery = search.get('title') ?? 'Service';
  const basePriceFromQuery = Number(search.get('basePrice') ?? 0);
  const totalPriceFromQuery = Number(search.get('totalPrice') ?? basePriceFromQuery);
  const durationFromQuery = Number(search.get('duration') ?? 0);
  const addOnIdsFromQuery = (search.get('addOnIds') ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const addOnNamesFromQuery = (search.get('addOnNames') ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
  const rescheduleId = search.get('rescheduleId');
  const emailToken = search.get('emailToken');

  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [emailAppointment, setEmailAppointment] = useState<AppointmentData | null>(null);
  const [resolvingEmail, setResolvingEmail] = useState(Boolean(emailToken));

  useEffect(() => {
    if (!emailToken) {
      setResolvingEmail(false);
      return;
    }

    setResolvingEmail(true);
    setError('');
    apiResolveBookingLink(emailToken)
      .then(({ appointment }) => {
        setEmailAppointment(appointment);
        setSelectedDate(getDateInputFromIso(appointment.start_time));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to open booking link.');
      })
      .finally(() => setResolvingEmail(false));
  }, [emailToken]);

  const effectiveAppointment = emailAppointment;
  const serviceId = effectiveAppointment?.service.id ?? serviceIdFromQuery;
  const title = effectiveAppointment?.service.name ?? titleFromQuery;
  const basePriceCents = effectiveAppointment?.service.price_cents ?? basePriceFromQuery;
  const totalPriceCents = effectiveAppointment?.total_price_cents ?? totalPriceFromQuery;
  const duration = effectiveAppointment?.total_duration_minutes ?? durationFromQuery;
  const addOnIds = effectiveAppointment?.add_ons.map((item) => item.id) ?? addOnIdsFromQuery;
  const addOnSummary = effectiveAppointment?.add_ons.map((item) => item.name) ?? addOnNamesFromQuery;
  const currentPath = useMemo(() => `/book/schedule?${search.toString()}`, [search]);
  const signInHref = useMemo(() => `/login?next=${encodeURIComponent(currentPath)}`, [currentPath]);
  const signUpHref = useMemo(() => `/signup?next=${encodeURIComponent(currentPath)}`, [currentPath]);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<PendingBookingDraft | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [pendingSlotRestore, setPendingSlotRestore] = useState<string | null>(null);
  const [restoredSlotAvailable, setRestoredSlotAvailable] = useState(true);

  useEffect(() => {
    if (!duration || resolvingEmail) {
      setAvailableSlots([]);
      return;
    }

    setSlotsLoading(true);
    setSelectedSlot(null);
    setError('');
    apiGetAvailability(selectedDate, duration)
      .then((data) => setAvailableSlots(data.slots))
      .catch((err: unknown) => {
        setAvailableSlots([]);
        setError(err instanceof Error ? err.message : 'Failed to load availability.');
      })
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, duration, resolvingEmail]);

  useEffect(() => {
    if (!showSignInPrompt) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showSignInPrompt]);

  useEffect(() => {
    if (showResumePrompt) return;
    if (!isReady || role !== 'user' || emailToken || rescheduleId || resumeDraft) return;

    const draft = readPendingBookingDraft();
    if (!draft || draft.path !== currentPath) return;

    setResumeDraft(draft);
    setRestoredSlotAvailable(true);
    setSelectedDate(draft.selectedDate);
    setPendingSlotRestore(draft.selectedSlot);
  }, [currentPath, emailToken, isReady, rescheduleId, resumeDraft, role, showResumePrompt]);

  useEffect(() => {
    if (!resumeDraft || pendingSlotRestore === null || slotsLoading) return;

    if (availableSlots.includes(pendingSlotRestore)) {
      setSelectedSlot(pendingSlotRestore);
      setRestoredSlotAvailable(true);
    } else {
      setSelectedSlot(null);
      setRestoredSlotAvailable(false);
      setError('Your previous time is no longer available. Choose another time or service.');
    }

    setPendingSlotRestore(null);
    setShowResumePrompt(true);
  }, [availableSlots, pendingSlotRestore, resumeDraft, slotsLoading]);

  function persistPendingBookingDraft() {
    if (!serviceId || !selectedSlot) return;

    savePendingBookingDraft({
      path: currentPath,
      serviceId,
      title,
      basePriceCents,
      totalPriceCents,
      duration,
      addOnIds,
      addOnSummary,
      selectedDate,
      selectedSlot,
    });
  }

  async function confirm() {
    if (!selectedSlot) return;
    if (!emailToken && (!isReady || role !== 'user')) {
      setShowSignInPrompt(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (emailToken) {
        await apiRescheduleBookingLink(emailToken, selectedDate, selectedSlot);
        router.push(buildConfirmationHref('rescheduled', selectedDate, selectedSlot, title));
        return;
      }

      if (rescheduleId) {
        await apiRescheduleAppointment(rescheduleId, selectedDate, selectedSlot);
        clearPendingBookingDraft();
        router.push(buildConfirmationHref('rescheduled', selectedDate, selectedSlot, title));
        return;
      }

      if (serviceId) {
        await apiCreateAppointment({
          service_id: serviceId,
          add_on_ids: addOnIds,
          date: selectedDate,
          start_time: selectedSlot,
        });
        clearPendingBookingDraft();
        router.push(buildConfirmationHref('created', selectedDate, selectedSlot, title));
        return;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment.');
    } finally {
      setLoading(false);
    }
  }

  if (resolvingEmail) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Opening your booking link...</p>
      </div>
    );
  }

  if (!serviceId && !rescheduleId && !emailToken) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Select a service before choosing a time.</p>
        <button
          onClick={() => router.push('/book')}
          className="mt-4 rounded-lg bg-[#1a132f] px-4 py-2 text-white hover:brightness-110"
        >
          Back to services
        </button>
      </div>
    );
  }

  if (emailToken && error && !emailAppointment) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-600">{error}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/book')}
            className="rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white hover:brightness-110"
          >
            Book a new appointment
          </button>
          <button
            type="button"
            onClick={() => router.push('/login?next=%2Fuser%2Fdashboard')}
            className="rounded-xl border border-[#1a132f] px-4 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
          >
            View dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#7b7794]">Step 2</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">
              {emailToken || rescheduleId ? 'Reschedule appointment' : 'Pick date and time'}
            </h1>
          </div>
          <div className="rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
            {title} / ${((totalPriceCents || basePriceCents) / 100).toFixed(2)}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-4">
              <label className="text-sm font-semibold text-[#1a132f]">Appointment date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                min={today}
              />
            </div>

            <div className="rounded-[1.5rem] border border-[#ecebf5] bg-[#fcfcff] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#0f0a1e]">Available time slots</h2>
                <p className="text-sm text-[#7b7794]">Toronto time / 15-minute grid</p>
              </div>

              {slotsLoading ? (
                <p className="mt-4 text-sm text-[#7b7794]">Loading slots...</p>
              ) : availableSlots.length === 0 ? (
                <p className="mt-4 text-sm text-[#7b7794]">No available slots for this date.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {availableSlots.map((slot) => {
                    const isSelected = slot === selectedSlot;
                    return (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot === selectedSlot ? null : slot)}
                        className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          isSelected
                            ? 'border-[#1a132f] bg-[#1a132f] text-white'
                            : 'border-[#e5e4ef] bg-white text-[#1a132f] hover:border-[#c8c6e2]'
                        }`}
                      >
                        {to12Hour(slot)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[1.75rem] bg-[#0f0a1e] p-5 text-white">
            <div>
              <p className="text-sm text-[#c7c3de]">Booking summary</p>
              <h2 className="mt-2 text-2xl font-semibold">{title}</h2>
            </div>

            <div className="space-y-3 rounded-[1.5rem] bg-white/8 p-4">
              <SummaryRow label="Base price" value={`$${(basePriceCents / 100).toFixed(2)}`} />
              <SummaryRow label="Total price" value={`$${(totalPriceCents / 100).toFixed(2)}`} />
              <SummaryRow label="Total duration" value={`${duration} min`} />
              <SummaryRow label="Date" value={formatDateLabel(selectedDate)} />
              <SummaryRow label="Time" value={selectedSlot ? to12Hour(selectedSlot) : 'Select a slot'} />
            </div>

            {addOnSummary.length > 0 && (
              <div className="rounded-[1.5rem] bg-white/8 p-4">
                <p className="text-sm font-semibold text-white">Selected add-ons</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {addOnSummary.map((name) => (
                    <span key={name} className="rounded-full bg-white/12 px-3 py-1 text-xs text-[#ddd9ef]">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!selectedSlot || loading}
              onClick={confirm}
              className={`w-full rounded-xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                selectedSlot && !loading
                  ? 'bg-white text-[#0f0a1e] hover:translate-y-[-1px]'
                  : 'cursor-not-allowed bg-white/30 text-white/60'
              }`}
            >
              {loading ? 'Saving...' : emailToken || rescheduleId ? 'Confirm new time' : 'Confirm booking'}
            </button>
            {!emailToken && isReady && role === 'guest' ? (
              <p className="text-xs text-[#ddd9ef]">
                You can browse the available hours first. Sign-in is only required when you confirm the appointment.
              </p>
            ) : null}
            {error && <p className="text-sm font-semibold text-[#ff9fa6]">{error}</p>}
          </div>
        </div>
      </div>

      {showSignInPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0a1e]/55 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-signin-title"
            className="w-full max-w-md rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)] p-6 shadow-[0_30px_80px_-32px_rgba(15,10,30,0.55)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b7794]">Almost there</p>
                <h2 id="booking-signin-title" className="mt-2 text-2xl font-bold text-[#0f0a1e]">
                  Sign in to confirm this appointment
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="rounded-full border border-[#ddd9ef] px-3 py-1 text-sm font-semibold text-[#5a5872] hover:bg-white"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-[#1a132f] p-4 text-white">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-sm text-[#ddd9ef]">
                {formatDateLabel(selectedDate)} at {selectedSlot ? to12Hour(selectedSlot) : 'selected time'}
              </p>
              <p className="mt-1 text-sm text-[#ddd9ef]">${((totalPriceCents || basePriceCents) / 100).toFixed(2)}</p>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#4f4a66]">
              You can browse the schedule without an account. To lock this time and finish the booking, sign in or
              create your client account first.
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  persistPendingBookingDraft();
                  router.push(signInHref);
                }}
                className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Sign in to continue
              </button>
              <button
                type="button"
                onClick={() => {
                  persistPendingBookingDraft();
                  router.push(signUpHref);
                }}
                className="w-full rounded-xl border border-[#1a132f] px-4 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#f6f6f6]"
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => setShowSignInPrompt(false)}
                className="w-full rounded-xl border border-[#ddd9ef] px-4 py-3 text-sm font-semibold text-[#5a5872] transition hover:bg-white"
              >
                Keep browsing times
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showResumePrompt && resumeDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0a1e]/55 px-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-resume-title"
            className="w-full max-w-md rounded-[2rem] border border-white/20 bg-[linear-gradient(180deg,#ffffff_0%,#f7f4ff_100%)] p-6 shadow-[0_30px_80px_-32px_rgba(15,10,30,0.55)]"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#7b7794]">Welcome back</p>
              <h2 id="booking-resume-title" className="mt-2 text-2xl font-bold text-[#0f0a1e]">
                Continue your saved booking?
              </h2>
            </div>

            <div className="mt-5 rounded-[1.5rem] bg-[#1a132f] p-4 text-white">
              <p className="text-sm font-semibold">{resumeDraft.title}</p>
              <p className="mt-2 text-sm text-[#ddd9ef]">
                {formatDateLabel(resumeDraft.selectedDate)} at{' '}
                {restoredSlotAvailable ? to12Hour(resumeDraft.selectedSlot) : 'time no longer available'}
              </p>
              <p className="mt-1 text-sm text-[#ddd9ef]">
                ${((resumeDraft.totalPriceCents || resumeDraft.basePriceCents) / 100).toFixed(2)}
              </p>
            </div>

            <p className="mt-5 text-sm leading-6 text-[#4f4a66]">
              {restoredSlotAvailable
                ? 'Your previous service, date, and time were saved before sign-in. You can continue with them now or start over.'
                : 'We restored your service and date, but the previous time is no longer free. You can stay here and choose another slot or go back to booking.'}
            </p>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  clearPendingBookingDraft();
                  setShowResumePrompt(false);
                  setResumeDraft(null);
                }}
                className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                {restoredSlotAvailable ? 'Continue with saved booking' : 'Stay on this service'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearPendingBookingDraft();
                  setShowResumePrompt(false);
                  setResumeDraft(null);
                  router.push('/book');
                }}
                className="w-full rounded-xl border border-[#1a132f] px-4 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#f6f6f6]"
              >
                Select another service or time
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-[#c7c3de]">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function to12Hour(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  let h = Number(hStr);
  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${mStr} ${period}`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
}

function getLocalDateInputValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateInputFromIso(value: string): string {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Toronto',
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value ?? '0000';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function buildConfirmationHref(mode: 'created' | 'rescheduled', date: string, time: string, title: string) {
  const params = new URLSearchParams({
    mode,
    date,
    time,
    title,
  });
  return `/book/confirmed?${params.toString()}`;
}

const PENDING_BOOKING_KEY = 'hb-pending-booking';

function savePendingBookingDraft(draft: PendingBookingDraft) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(draft));
}

function readPendingBookingDraft(): PendingBookingDraft | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(PENDING_BOOKING_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingBookingDraft>;
    if (
      typeof parsed.path !== 'string' ||
      typeof parsed.serviceId !== 'string' ||
      typeof parsed.title !== 'string' ||
      typeof parsed.basePriceCents !== 'number' ||
      typeof parsed.totalPriceCents !== 'number' ||
      typeof parsed.duration !== 'number' ||
      !Array.isArray(parsed.addOnIds) ||
      !Array.isArray(parsed.addOnSummary) ||
      typeof parsed.selectedDate !== 'string' ||
      typeof parsed.selectedSlot !== 'string'
    ) {
      return null;
    }

    return {
      path: parsed.path,
      serviceId: parsed.serviceId,
      title: parsed.title,
      basePriceCents: parsed.basePriceCents,
      totalPriceCents: parsed.totalPriceCents,
      duration: parsed.duration,
      addOnIds: parsed.addOnIds.filter((item): item is string => typeof item === 'string'),
      addOnSummary: parsed.addOnSummary.filter((item): item is string => typeof item === 'string'),
      selectedDate: parsed.selectedDate,
      selectedSlot: parsed.selectedSlot,
    };
  } catch {
    return null;
  }
}

function clearPendingBookingDraft() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(PENDING_BOOKING_KEY);
}
