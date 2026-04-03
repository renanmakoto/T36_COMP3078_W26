'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiCancelAppointment, apiGetMyAppointments, type AppointmentData } from '../../api';
import { ActionDialog, DialogSummary } from '../../components/ActionDialog';
import { useSession } from '../../session-context';

type AppointmentActionDialog =
  | { kind: 'cancel'; appointment: ViewModel }
  | { kind: 'reschedule'; appointment: ViewModel }
  | null;

type AppointmentResultDialog =
  | {
      kind: 'cancelled';
      title: string;
      description: string;
      appointment: ViewModel;
      tone: 'success' | 'danger';
    }
  | null;

export default function UserDashboardPage() {
  const { isReady, role, displayName } = useSession();
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [actionDialog, setActionDialog] = useState<AppointmentActionDialog>(null);
  const [resultDialog, setResultDialog] = useState<AppointmentResultDialog>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (role === 'guest') {
      router.replace('/login');
      return;
    }

    setLoading(true);
    setLoadingError('');
    apiGetMyAppointments()
      .then(setAppointments)
      .catch((error: unknown) => {
        setLoadingError(error instanceof Error ? error.message : 'Failed to load appointments.');
      })
      .finally(() => setLoading(false));
  }, [isReady, role, router]);

  const userName = displayName || 'Client';

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingArr: ViewModel[] = [];
    const pastArr: ViewModel[] = [];

    for (const appointment of appointments) {
      const start = new Date(appointment.start_time);
      const item: ViewModel = {
        id: appointment.id,
        rawStart: start,
        dateLabel: formatDateTime(start),
        service: appointment.service.name,
        price: `$${(appointment.total_price_cents / 100).toFixed(2)}`,
        status: formatAppointmentStatus(appointment, start, now),
        serviceId: appointment.service.id,
        basePriceCents: appointment.service.price_cents,
        totalPriceCents: appointment.total_price_cents,
        durationMinutes: appointment.total_duration_minutes,
        addOnIds: appointment.add_ons.map((item) => item.id),
        addOnNames: appointment.add_ons.map((item) => item.name),
      };
      if (start >= now && appointment.status !== 'CANCELLED') upcomingArr.push(item);
      else pastArr.push(item);
    }

    upcomingArr.sort((left, right) => left.rawStart.getTime() - right.rawStart.getTime());
    pastArr.sort((left, right) => right.rawStart.getTime() - left.rawStart.getTime());

    return { upcoming: upcomingArr, past: pastArr };
  }, [appointments]);

  const calendarDays = useMemo(() => buildCalendarDays(appointments), [appointments]);

  const openCancelDialog = useCallback((appointment: ViewModel) => {
    setActionDialog({ kind: 'cancel', appointment });
  }, []);

  const openRescheduleDialog = useCallback((appointment: ViewModel) => {
    setActionDialog({ kind: 'reschedule', appointment });
  }, []);

  const confirmCancel = useCallback(async () => {
    if (!actionDialog || actionDialog.kind !== 'cancel') return;

    const currentAppointment = actionDialog.appointment;
    setActionBusy(true);

    try {
      const updated = await apiCancelAppointment(currentAppointment.id);
      setAppointments((current) => current.map((item) => (item.id === currentAppointment.id ? updated : item)));
      setActionDialog(null);
      setResultDialog({
        kind: 'cancelled',
        title: 'Booking cancelled',
        description:
          'Your appointment was removed from the upcoming list. A cancellation email should arrive shortly with the updated details.',
        appointment: currentAppointment,
        tone: 'success',
      });
    } catch (error: unknown) {
      setActionDialog(null);
      setResultDialog({
        kind: 'cancelled',
        title: 'Cancellation failed',
        description: error instanceof Error ? error.message : 'Failed to cancel appointment.',
        appointment: currentAppointment,
        tone: 'danger',
      });
    } finally {
      setActionBusy(false);
    }
  }, [actionDialog]);

  const confirmReschedule = useCallback(() => {
    if (!actionDialog || actionDialog.kind !== 'reschedule') return;

    const appointment = actionDialog.appointment;
    setActionDialog(null);
    router.push(`/book/schedule?${buildRescheduleParams(appointment).toString()}`);
  }, [actionDialog, router]);

  if (!isReady || role === 'guest') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading your appointments...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Hi, {userName}</h1>
          </div>
          <button
            onClick={() => router.push('/book')}
            className="rounded-full bg-[#1a132f] px-4 py-2 text-white shadow-sm hover:brightness-110"
          >
            New booking
          </button>
        </div>

        {loadingError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loadingError}</div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2">
          <Card title="Upcoming">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[#7b7794]">No upcoming bookings yet.</p>
            ) : (
              upcoming.map((appointment) => (
                <BookingRow
                  key={appointment.id}
                  {...appointment}
                  onCancel={() => openCancelDialog(appointment)}
                  onReschedule={() => openRescheduleDialog(appointment)}
                />
              ))
            )}
          </Card>
          <Card title="History">
            {past.length === 0 ? (
              <p className="text-sm text-[#7b7794]">No past bookings yet.</p>
            ) : (
              past.map((appointment) => <BookingRow key={appointment.id} {...appointment} />)
            )}
          </Card>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-[#0f0a1e]">30-day booking view</h2>
          <p className="text-sm text-[#5a5872]">Next 30 days of your bookings, grouped so busy days stay readable.</p>
          <UserCalendar days={calendarDays} />
        </div>
      </div>

      <ActionDialog
        open={actionDialog?.kind === 'cancel'}
        eyebrow="Upcoming booking"
        title="Cancel this appointment?"
        description="This will release the time slot and move the booking into your history. We will keep the rest of your account data unchanged."
        tone="danger"
        onClose={actionBusy ? undefined : () => setActionDialog(null)}
        closeLabel="Back"
        actions={
          <>
            <button
              type="button"
              onClick={confirmCancel}
              disabled={actionBusy}
              className="w-full rounded-xl bg-[#b42318] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {actionBusy ? 'Cancelling...' : 'Yes, cancel booking'}
            </button>
            <button
              type="button"
              onClick={() => setActionDialog(null)}
              disabled={actionBusy}
              className="w-full rounded-xl border border-[#e2d5d8] px-4 py-3 text-sm font-semibold text-[#6d4250] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Keep booking
            </button>
          </>
        }
      >
        {actionDialog?.kind === 'cancel' ? (
          <DialogSummary
            title={actionDialog.appointment.service}
            lines={[actionDialog.appointment.dateLabel, actionDialog.appointment.price]}
          />
        ) : null}
      </ActionDialog>

      <ActionDialog
        open={actionDialog?.kind === 'reschedule'}
        eyebrow="Upcoming booking"
        title="Reschedule this appointment?"
        description="You will keep this booking until you choose and confirm a new date or time. The next screen will open the schedule with this service already loaded."
        onClose={() => setActionDialog(null)}
        closeLabel="Back"
        actions={
          <>
            <button
              type="button"
              onClick={confirmReschedule}
              className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Choose a new time
            </button>
            <button
              type="button"
              onClick={() => setActionDialog(null)}
              className="w-full rounded-xl border border-[#1a132f] px-4 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#f6f6f6]"
            >
              Keep current booking
            </button>
          </>
        }
      >
        {actionDialog?.kind === 'reschedule' ? (
          <DialogSummary
            title={actionDialog.appointment.service}
            lines={[actionDialog.appointment.dateLabel, actionDialog.appointment.price]}
          />
        ) : null}
      </ActionDialog>

      <ActionDialog
        open={Boolean(resultDialog)}
        eyebrow={resultDialog?.tone === 'success' ? 'Updated' : 'Try again'}
        title={resultDialog?.title ?? ''}
        description={resultDialog?.description ?? ''}
        tone={resultDialog?.tone ?? 'default'}
        onClose={() => setResultDialog(null)}
        closeLabel="Close"
        actions={
          resultDialog?.tone === 'success' ? (
            <>
              <button
                type="button"
                onClick={() => setResultDialog(null)}
                className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
              >
                Done
              </button>
              <button
                type="button"
                onClick={() => {
                  setResultDialog(null);
                  router.push('/book');
                }}
                className="w-full rounded-xl border border-[#1a132f] px-4 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#f6f6f6]"
              >
                Book another service
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setResultDialog(null)}
              className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Close
            </button>
          )
        }
      >
        {resultDialog ? (
          <DialogSummary title={resultDialog.appointment.service} lines={[resultDialog.appointment.dateLabel]} />
        ) : null}
      </ActionDialog>
    </>
  );
}

type ViewModel = {
  id: string;
  rawStart: Date;
  dateLabel: string;
  service: string;
  price: string;
  status: string;
  serviceId: string;
  basePriceCents: number;
  totalPriceCents: number;
  durationMinutes: number;
  addOnIds: string[];
  addOnNames: string[];
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#0f0a1e]">{title}</h2>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function BookingRow({
  dateLabel,
  service,
  price,
  status,
  onCancel,
  onReschedule,
}: ViewModel & { onCancel?: () => void; onReschedule?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div>
        <p className="text-sm text-[#7b7794]">{dateLabel}</p>
        <p className="text-base font-semibold text-[#0f0a1e]">{service}</p>
      </div>
      <div className="flex items-center gap-3 text-right">
        <div>
          <p className="text-sm text-[#7b7794]">{status}</p>
          <p className="text-lg font-bold text-[#1a132f]">{price}</p>
        </div>
        {onCancel && onReschedule && (status === 'Confirmed' || status === 'Pending') ? (
          <div className="flex flex-col gap-1">
            <button
              onClick={onReschedule}
              className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              Reschedule
            </button>
            <button
              onClick={onCancel}
              className="rounded-full bg-red-600 px-3 py-1 text-xs font-medium text-white hover:brightness-110"
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildRescheduleParams(booking: ViewModel) {
  return new URLSearchParams({
    rescheduleId: booking.id,
    serviceId: booking.serviceId,
    title: booking.service,
    basePrice: String(booking.basePriceCents),
    totalPrice: String(booking.totalPriceCents),
    duration: String(booking.durationMinutes),
    addOnIds: booking.addOnIds.join(','),
    addOnNames: booking.addOnNames.join('|'),
  });
}

function formatDateTime(date: Date) {
  const datePart = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'America/Toronto',
  }).format(date);
  const timePart = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Toronto',
  }).format(date);
  return `${datePart} - ${timePart}`;
}

function formatAppointmentStatus(appointment: AppointmentData, start: Date, now: Date) {
  if (appointment.status === 'CANCELLED') return 'Cancelled';
  if (appointment.status === 'NO_SHOW') return 'No-show';
  if (appointment.status === 'CONFIRMED' && start < now) return 'Completed';
  if (appointment.status === 'PENDING') return 'Pending';
  return 'Confirmed';
}

type CalendarDay = {
  date: Date;
  items: { id: string; start: Date; service: string }[];
};

function buildCalendarDays(appointments: AppointmentData[]): CalendarDay[] {
  const start = startOfDay(new Date());
  const days: CalendarDay[] = [];

  for (let i = 0; i < 30; i++) {
    const day = addDays(start, i);
    const items = appointments
      .filter((appointment) => appointment.status !== 'CANCELLED')
      .map((appointment) => ({
        id: appointment.id,
        dateObj: new Date(appointment.start_time),
        service: appointment.service.name,
      }))
      .filter((appointment) => isSameDate(appointment.dateObj, day))
      .map((appointment) => ({ id: appointment.id, start: appointment.dateObj, service: appointment.service }));

    days.push({ date: day, items });
  }

  return days;
}

function UserCalendar({ days }: { days: CalendarDay[] }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
      {days.map((day) => (
        <div key={day.date.toISOString()} className="rounded-xl border border-[#e5e4ef] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#7b7794]">
            {new Intl.DateTimeFormat('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              timeZone: 'America/Toronto',
            }).format(day.date)}
          </p>
          {day.items.length === 0 ? (
            <p className="mt-2 text-xs text-[#b0afc4]">No bookings</p>
          ) : (
            <div className="mt-2 space-y-1">
              {day.items.slice(0, 2).map((booking) => (
                <div key={booking.id} className="rounded-lg bg-[#f1eefc] px-2 py-1">
                  <p className="text-xs font-semibold text-[#1a132f]">
                    {new Intl.DateTimeFormat('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Toronto',
                    }).format(booking.start)}{' '}
                    &middot; {booking.service}
                  </p>
                </div>
              ))}
              {day.items.length > 2 ? (
                <p className="text-xs font-semibold text-[#7b7794]">+{day.items.length - 2} more booking(s)</p>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
