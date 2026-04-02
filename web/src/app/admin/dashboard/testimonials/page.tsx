'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiGetAdminServices,
  apiGetAdminTestimonials,
  apiUpdateAdminTestimonial,
  type AdminServiceData,
  type AdminTestimonialData,
} from '../../../api';
import {
  AdminPageHeader,
  EditableRow,
  Field,
  NoticeBanner,
  Toggle,
  inputClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  statusTone,
  textAreaClass,
} from '../admin-ui';

type TestimonialFormState = {
  author_name: string;
  author_email: string;
  quote: string;
  rating: string;
  service_id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  admin_notes: string;
  is_featured_home: boolean;
  home_order: string;
};

const emptyForm: TestimonialFormState = {
  author_name: '',
  author_email: '',
  quote: '',
  rating: '5',
  service_id: '',
  status: 'PENDING',
  admin_notes: '',
  is_featured_home: false,
  home_order: '0',
};

export default function AdminTestimonialsPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [testimonials, setTestimonials] = useState<AdminTestimonialData[]>([]);
  const [form, setForm] = useState<TestimonialFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
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
        const [testimonialItems, serviceItems] = await Promise.all([apiGetAdminTestimonials(), apiGetAdminServices()]);
        setTestimonials(testimonialItems);
        setServices(serviceItems);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load testimonials.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isReady, role, router]);

  const sortedTestimonials = useMemo(
    () =>
      [...testimonials].sort((left, right) => {
        if (left.status !== right.status) {
          const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
          return order[left.status] - order[right.status];
        }
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }),
    [testimonials],
  );

  async function refreshTestimonials() {
    const data = await apiGetAdminTestimonials();
    setTestimonials(data);
  }

  function resetEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: AdminTestimonialData) {
    setEditingId(item.id);
    setForm({
      author_name: item.author_name,
      author_email: item.author_email,
      quote: item.quote,
      rating: String(item.rating),
      service_id: item.service?.id || '',
      status: item.status,
      admin_notes: item.admin_notes,
      is_featured_home: item.is_featured_home,
      home_order: String(item.home_order),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      await apiUpdateAdminTestimonial(editingId, {
        author_name: form.author_name,
        author_email: form.author_email,
        quote: form.quote,
        rating: Number(form.rating),
        service_id: form.service_id || null,
        status: form.status,
        admin_notes: form.admin_notes,
        is_featured_home: form.is_featured_home,
        home_order: Number(form.home_order),
      });
      setNotice('Testimonial updated.');
      resetEdit();
      await refreshTestimonials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save testimonial.');
    } finally {
      setSaving(false);
    }
  }

  async function quickModerate(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    setNotice('');
    try {
      await apiUpdateAdminTestimonial(id, { status });
      setNotice(`Testimonial ${status === 'APPROVED' ? 'approved' : 'rejected'}.`);
      if (editingId === id) {
        resetEdit();
      }
      await refreshTestimonials();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update testimonial.');
    }
  }

  if (!isReady || role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reviews"
        description="Moderate the review queue, approve what should go live, and edit only the testimonials that need attention."
      />

      <NoticeBanner error={error} notice={notice} />

      {editingId ? (
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Edit testimonial</h2>
              <p className="text-sm text-[#5a5872]">Update the selected review without exposing a manual create form.</p>
            </div>
            <button type="button" onClick={resetEdit} className={secondaryButtonClass}>
              Close editor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Author name">
                <input
                  value={form.author_name}
                  onChange={(event) => setForm((current) => ({ ...current, author_name: event.target.value }))}
                  className={inputClass}
                  required
                />
              </Field>
              <Field label="Author email">
                <input
                  value={form.author_email}
                  onChange={(event) => setForm((current) => ({ ...current, author_email: event.target.value }))}
                  className={inputClass}
                  type="email"
                  required
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Related service">
                <select
                  value={form.service_id}
                  onChange={(event) => setForm((current) => ({ ...current, service_id: event.target.value }))}
                  className={inputClass}
                >
                  <option value="">No linked service</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Rating">
                <select
                  value={form.rating}
                  onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))}
                  className={inputClass}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} stars
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as TestimonialFormState['status'],
                    }))
                  }
                  className={inputClass}
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </Field>
            </div>

            <Field label="Review">
              <textarea
                value={form.quote}
                onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value }))}
                className={textAreaClass}
                required
              />
            </Field>

            <Field label="Admin notes">
              <textarea
                value={form.admin_notes}
                onChange={(event) => setForm((current) => ({ ...current, admin_notes: event.target.value }))}
                className={textAreaClass}
              />
            </Field>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Home order">
                <input
                  value={form.home_order}
                  onChange={(event) => setForm((current) => ({ ...current, home_order: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <Toggle
                label="Featured on home"
                checked={form.is_featured_home}
                onChange={(checked) => setForm((current) => ({ ...current, is_featured_home: checked }))}
              />
            </div>

            <button type="submit" className={primaryButtonClass} disabled={saving}>
              {saving ? 'Saving...' : 'Save testimonial'}
            </button>
          </form>
        </section>
      ) : null}

      <section className={panelClass}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Review queue</h2>
            <p className="text-sm text-[#5a5872]">Pending reviews stay private until an admin approves them.</p>
          </div>
          <span className="rounded-full bg-[#fff4ea] px-3 py-1 text-xs font-semibold text-[#a45d15]">
            {testimonials.filter((item) => item.status === 'PENDING').length} pending
          </span>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <p className="text-sm text-[#5a5872]">Loading testimonials...</p>
          ) : sortedTestimonials.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
              No testimonials yet.
            </p>
          ) : (
            sortedTestimonials.map((item) => (
              <EditableRow
                key={item.id}
                title={`${item.author_name} - ${item.rating}/5`}
                subtitle={`${item.service?.name || 'General review'} - ${item.quote}`}
                meta={item.author_email}
                onEdit={() => startEdit(item)}
              >
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                  {item.status}
                </span>
                {item.status !== 'APPROVED' ? (
                  <button
                    type="button"
                    onClick={() => quickModerate(item.id, 'APPROVED')}
                    className="rounded-full border border-[#d9e8df] bg-[#eefaf3] px-3 py-1 text-xs font-medium text-[#137b45]"
                  >
                    Approve
                  </button>
                ) : null}
                {item.status !== 'REJECTED' ? (
                  <button
                    type="button"
                    onClick={() => quickModerate(item.id, 'REJECTED')}
                    className="rounded-full border border-[#f4d7db] bg-[#fff1f3] px-3 py-1 text-xs font-medium text-[#b42341]"
                  >
                    Reject
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
