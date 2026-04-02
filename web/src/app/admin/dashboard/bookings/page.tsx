'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiGetAdminServices,
  apiGetAllAppointments,
  apiAdminUpdateAppointment,
  type AdminAppointmentData,
  type AdminServiceData,
} from '../../../api';
import {
  AdminPageHeader,
  EditableRow,
  Field,
  NoticeBanner,
  formatCurrency,
  formatDateInput,
  formatDateTime,
  formatTimeInput,
  inputClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  statusTone,
  textAreaClass,
} from '../admin-ui';

type BookingFormState = {
  customer_name: string;
  customer_email: string;
  service_id: string;
  add_on_ids: string[];
  date: string;
  start_time: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';
  notes: string;
};

const appointmentStatuses: BookingFormState['status'][] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW'];

const emptyForm: BookingFormState = {
  customer_name: '',
  customer_email: '',
  service_id: '',
  add_on_ids: [],
  date: '',
  start_time: '10:00',
  status: 'CONFIRMED',
  notes: '',
};

export default function AdminBookingsPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [appointments, setAppointments] = useState<AdminAppointmentData[]>([]);
  const [form, setForm] = useState<BookingFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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
        const [serviceItems, appointmentItems] = await Promise.all([
          apiGetAdminServices(),
          apiGetAllAppointments({
            status: statusFilter || undefined,
            date: dateFilter || undefined,
          }),
        ]);
        setServices(serviceItems);
        setAppointments(appointmentItems);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [dateFilter, isReady, role, router, statusFilter]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === form.service_id) ?? null,
    [form.service_id, services],
  );

  useEffect(() => {
    if (!selectedService) return;
    setForm((current) => {
      const allowedIds = new Set(selectedService.available_add_ons.map((item) => item.id));
      const addOnIds = current.add_on_ids.filter((id) => allowedIds.has(id));
      if (addOnIds.length === current.add_on_ids.length) return current;
      return { ...current, add_on_ids: addOnIds };
    });
  }, [selectedService]);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime(),
      ),
    [appointments],
  );

  async function refreshAppointments() {
    const data = await apiGetAllAppointments({
      status: statusFilter || undefined,
      date: dateFilter || undefined,
    });
    setAppointments(data);
  }

  function resetEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(appointment: AdminAppointmentData) {
    setEditingId(appointment.id);
    setForm({
      customer_name: appointment.user.display_name || '',
      customer_email: appointment.user.email,
      service_id: appointment.service.id,
      add_on_ids: appointment.add_ons.map((item) => item.id),
      date: formatDateInput(appointment.start_time),
      start_time: formatTimeInput(appointment.start_time),
      status: appointment.status as BookingFormState['status'],
      notes: appointment.notes,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await apiAdminUpdateAppointment(editingId, {
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        service_id: form.service_id,
        add_on_ids: form.add_on_ids,
        date: form.date,
        start_time: form.start_time,
        status: form.status,
        notes: form.notes,
      });
      setNotice('Booking updated.');
      resetEdit();
      await refreshAppointments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save booking.');
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(appointmentId: string, status: BookingFormState['status']) {
    setError('');
    setNotice('');
    try {
      await apiAdminUpdateAppointment(appointmentId, { status });
      setNotice(`Booking marked ${status.replace('_', ' ').toLowerCase()}.`);
      if (editingId === appointmentId) {
        resetEdit();
      }
      await refreshAppointments();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update booking status.');
    }
  }

  if (!isReady || role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Bookings"
        description="Review existing appointments, filter the calendar, and edit a booking only when needed."
      />

      <NoticeBanner error={error} notice={notice} />

      {editingId ? (
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Edit booking</h2>
              <p className="text-sm text-[#5a5872]">Update the selected appointment without exposing a create form.</p>
            </div>
            <button type="button" onClick={resetEdit} className={secondaryButtonClass}>
              Close editor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Customer name">
                <input
                  value={form.customer_name}
                  onChange={(event) => setForm((current) => ({ ...current, customer_name: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Field label="Customer email">
                <input
                  value={form.customer_email}
                  onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))}
                  className={inputClass}
                  type="email"
                  required
                />
              </Field>
            </div>

            <Field label="Service">
              <select
                value={form.service_id}
                onChange={(event) => setForm((current) => ({ ...current, service_id: event.target.value }))}
                className={inputClass}
                required
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.duration_minutes} min - {formatCurrency(service.price_cents)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Date">
                <input
                  value={form.date}
                  onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                  className={inputClass}
                  type="date"
                  required
                />
              </Field>
              <Field label="Start time">
                <input
                  value={form.start_time}
                  onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))}
                  className={inputClass}
                  type="time"
                  step={900}
                  required
                />
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as BookingFormState['status'],
                    }))
                  }
                  className={inputClass}
                >
                  {appointmentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {selectedService ? (
              <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
                <p className="text-sm font-semibold text-[#0f0a1e]">{selectedService.name}</p>
                <p className="text-xs text-[#5a5872]">
                  {selectedService.duration_minutes} minutes - {formatCurrency(selectedService.price_cents)}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {selectedService.available_add_ons.length === 0 ? (
                    <p className="text-sm text-[#7b7794]">This service has no add-ons yet.</p>
                  ) : (
                    selectedService.available_add_ons.map((addOn) => (
                      <label key={addOn.id} className="flex items-start gap-3 rounded-2xl border border-[#ecebf5] bg-white p-3">
                        <input
                          type="checkbox"
                          checked={form.add_on_ids.includes(addOn.id)}
                          onChange={() =>
                            setForm((current) => ({
                              ...current,
                              add_on_ids: current.add_on_ids.includes(addOn.id)
                                ? current.add_on_ids.filter((id) => id !== addOn.id)
                                : [...current.add_on_ids, addOn.id],
                            }))
                          }
                          className="mt-1 h-4 w-4 accent-[#1a132f]"
                        />
                        <div>
                          <p className="text-sm font-semibold text-[#0f0a1e]">{addOn.name}</p>
                          <p className="text-xs text-[#5a5872]">
                            {addOn.category || 'Add-on'} - +{formatCurrency(addOn.price_cents)} - +
                            {addOn.duration_minutes} min
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : null}

            <Field label="Booking notes">
              <textarea
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                className={textAreaClass}
              />
            </Field>

            <button type="submit" className={primaryButtonClass} disabled={saving}>
              {saving ? 'Saving...' : 'Save booking'}
            </button>
          </form>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Existing bookings</h2>
            <p className="text-sm text-[#5a5872]">Filter by date or status, then edit only the booking you want.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Status filter">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
                <option value="">All statuses</option>
                {appointmentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date filter">
              <input value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className={inputClass} type="date" />
            </Field>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-[#5a5872]">Loading bookings...</p>
          ) : sortedAppointments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
              No bookings match the selected filters.
            </p>
          ) : (
            sortedAppointments.map((appointment) => (
              <EditableRow
                key={appointment.id}
                title={`${appointment.user.display_name || appointment.user.email} - ${appointment.service.name}`}
                subtitle={`${formatDateTime(appointment.start_time)} - ${formatCurrency(
                  appointment.total_price_cents,
                )} - ${appointment.add_ons.map((item) => item.name).join(', ') || 'No add-ons'}`}
                meta={`Status ${appointment.status.replace('_', ' ')} - ${appointment.total_duration_minutes} min`}
                onEdit={() => startEdit(appointment)}
              >
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(appointment.status)}`}>
                  {appointment.status.replace('_', ' ')}
                </span>
                {appointment.status !== 'CONFIRMED' ? (
                  <button
                    type="button"
                    onClick={() => quickStatus(appointment.id, 'CONFIRMED')}
                    className="rounded-full border border-[#d9e8df] bg-[#eefaf3] px-3 py-1 text-xs font-medium text-[#137b45]"
                  >
                    Confirm
                  </button>
                ) : null}
                {appointment.status !== 'NO_SHOW' ? (
                  <button
                    type="button"
                    onClick={() => quickStatus(appointment.id, 'NO_SHOW')}
                    className="rounded-full border border-[#f0dfcf] bg-[#fff4ea] px-3 py-1 text-xs font-medium text-[#a45d15]"
                  >
                    No-show
                  </button>
                ) : null}
                {appointment.status !== 'CANCELLED' ? (
                  <button
                    type="button"
                    onClick={() => quickStatus(appointment.id, 'CANCELLED')}
                    className="rounded-full border border-[#f4d7db] bg-[#fff1f3] px-3 py-1 text-xs font-medium text-[#b42341]"
                  >
                    Cancel
                  </button>
                ) : null}
              </EditableRow>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
