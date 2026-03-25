'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiCreateAdminAddOn,
  apiCreateAdminService,
  apiGetAdminAddOns,
  apiGetAdminServices,
  apiUpdateAdminAddOn,
  apiUpdateAdminService,
  type AdminAddOnData,
  type AdminServiceData,
} from '../../../api';

type ServiceFormState = {
  name: string;
  description: string;
  image_url: string;
  payment_note: string;
  duration_minutes: string;
  price_dollars: string;
  sort_order: string;
  is_featured_home: boolean;
  home_order: string;
  is_active: boolean;
  add_on_ids: string[];
};

type AddOnFormState = {
  name: string;
  description: string;
  category: string;
  price_dollars: string;
  duration_minutes: string;
  sort_order: string;
  is_active: boolean;
  service_ids: string[];
};

const initialServiceForm: ServiceFormState = {
  name: '',
  description: '',
  image_url: '',
  payment_note: '',
  duration_minutes: '45',
  price_dollars: '50.85',
  sort_order: '0',
  is_featured_home: false,
  home_order: '0',
  is_active: true,
  add_on_ids: [],
};

const initialAddOnForm: AddOnFormState = {
  name: '',
  description: '',
  category: 'Enhancement',
  price_dollars: '5.00',
  duration_minutes: '10',
  sort_order: '0',
  is_active: true,
  service_ids: [],
};

export default function AdminServicesPage() {
  const { role } = useSession();
  const router = useRouter();
  const [services, setServices] = useState<AdminServiceData[]>([]);
  const [addOns, setAddOns] = useState<AdminAddOnData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceFormState>(initialServiceForm);
  const [addOnForm, setAddOnForm] = useState<AddOnFormState>(initialAddOnForm);

  useEffect(() => {
    if (role !== 'admin') {
      router.replace('/login');
      return;
    }
    loadData();
  }, [role, router]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [serviceItems, addOnItems] = await Promise.all([apiGetAdminServices(), apiGetAdminAddOns()]);
      setServices(serviceItems);
      setAddOns(addOnItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load service data.');
    } finally {
      setLoading(false);
    }
  }

  function resetServiceForm() {
    setEditingServiceId(null);
    setServiceForm(initialServiceForm);
  }

  function resetAddOnForm() {
    setEditingAddOnId(null);
    setAddOnForm(initialAddOnForm);
  }

  function editService(item: AdminServiceData) {
    setEditingServiceId(item.id);
    setServiceForm({
      name: item.name,
      description: item.description,
      image_url: item.image_url,
      payment_note: item.payment_note,
      duration_minutes: String(item.duration_minutes),
      price_dollars: centsToDollars(item.price_cents),
      sort_order: String(item.sort_order),
      is_featured_home: item.is_featured_home,
      home_order: String(item.home_order),
      is_active: item.is_active,
      add_on_ids: item.available_add_ons.map((addOn) => addOn.id),
    });
  }

  function editAddOn(item: AdminAddOnData) {
    setEditingAddOnId(item.id);
    setAddOnForm({
      name: item.name,
      description: item.description,
      category: item.category,
      price_dollars: centsToDollars(item.price_cents),
      duration_minutes: String(item.duration_minutes),
      sort_order: String(item.sort_order),
      is_active: item.is_active,
      service_ids: item.services.map((service) => service.id),
    });
  }

  async function submitService(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const payload = {
        name: serviceForm.name,
        description: serviceForm.description,
        image_url: serviceForm.image_url,
        payment_note: serviceForm.payment_note,
        duration_minutes: Number(serviceForm.duration_minutes),
        price_cents: dollarsToCents(serviceForm.price_dollars),
        sort_order: Number(serviceForm.sort_order),
        is_featured_home: serviceForm.is_featured_home,
        home_order: Number(serviceForm.home_order),
        is_active: serviceForm.is_active,
        add_on_ids: serviceForm.add_on_ids,
      };

      if (editingServiceId) {
        await apiUpdateAdminService(editingServiceId, payload);
        setNotice('Service updated.');
      } else {
        await apiCreateAdminService(payload);
        setNotice('Service created.');
      }
      resetServiceForm();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save service.');
    }
  }

  async function submitAddOn(event: FormEvent) {
    event.preventDefault();
    setError('');
    setNotice('');
    try {
      const payload = {
        name: addOnForm.name,
        description: addOnForm.description,
        category: addOnForm.category,
        price_cents: dollarsToCents(addOnForm.price_dollars),
        duration_minutes: Number(addOnForm.duration_minutes),
        sort_order: Number(addOnForm.sort_order),
        is_active: addOnForm.is_active,
        service_ids: addOnForm.service_ids,
      };

      if (editingAddOnId) {
        await apiUpdateAdminAddOn(editingAddOnId, payload);
        setNotice('Add-on updated.');
      } else {
        await apiCreateAdminAddOn(payload);
        setNotice('Add-on created.');
      }
      resetAddOnForm();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save add-on.');
    }
  }

  if (role !== 'admin') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading services...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Manage Services</h1>
          <p className="text-sm text-[#5a5872]">Control services, add-ons, pricing, duration, images, and home page visibility.</p>
        </div>
        <Link href="/admin/dashboard" className="rounded-full border border-[#e3e3e3] px-4 py-2 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]">
          Back to dashboard
        </Link>
      </div>

      {(notice || error) && (
        <div className={`rounded-2xl p-4 text-sm font-semibold ${error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {error || notice}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">{editingServiceId ? 'Edit service' : 'Create service'}</h2>
          <form onSubmit={submitService} className="mt-5 space-y-4">
            <Field label="Title">
              <input value={serviceForm.name} onChange={(event) => setServiceForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClass} required />
            </Field>
            <Field label="Description">
              <textarea value={serviceForm.description} onChange={(event) => setServiceForm((prev) => ({ ...prev, description: event.target.value }))} className={`${inputClass} min-h-[120px]`} />
            </Field>
            <Field label="Image URL">
              <input value={serviceForm.image_url} onChange={(event) => setServiceForm((prev) => ({ ...prev, image_url: event.target.value }))} className={inputClass} />
            </Field>
            <Field label="Payment note">
              <textarea value={serviceForm.payment_note} onChange={(event) => setServiceForm((prev) => ({ ...prev, payment_note: event.target.value }))} className={`${inputClass} min-h-[90px]`} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Price (CAD)">
                <input value={serviceForm.price_dollars} onChange={(event) => setServiceForm((prev) => ({ ...prev, price_dollars: event.target.value }))} className={inputClass} required />
              </Field>
              <Field label="Duration (min)">
                <input value={serviceForm.duration_minutes} onChange={(event) => setServiceForm((prev) => ({ ...prev, duration_minutes: event.target.value }))} className={inputClass} required />
              </Field>
              <Field label="Sort order">
                <input value={serviceForm.sort_order} onChange={(event) => setServiceForm((prev) => ({ ...prev, sort_order: event.target.value }))} className={inputClass} required />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Home order">
                <input value={serviceForm.home_order} onChange={(event) => setServiceForm((prev) => ({ ...prev, home_order: event.target.value }))} className={inputClass} required />
              </Field>
              <Toggle label="Active" checked={serviceForm.is_active} onChange={(checked) => setServiceForm((prev) => ({ ...prev, is_active: checked }))} />
              <Toggle label="Featured on home" checked={serviceForm.is_featured_home} onChange={(checked) => setServiceForm((prev) => ({ ...prev, is_featured_home: checked }))} />
            </div>

            <div className="space-y-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
              <h3 className="text-sm font-semibold text-[#0f0a1e]">Available add-ons</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {addOns.map((addOn) => (
                  <label key={addOn.id} className="flex items-start gap-3 rounded-2xl border border-[#ecebf5] bg-white p-3">
                    <input
                      type="checkbox"
                      checked={serviceForm.add_on_ids.includes(addOn.id)}
                      onChange={() =>
                        setServiceForm((prev) => ({
                          ...prev,
                          add_on_ids: prev.add_on_ids.includes(addOn.id)
                            ? prev.add_on_ids.filter((id) => id !== addOn.id)
                            : [...prev.add_on_ids, addOn.id],
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-[#1a132f]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0f0a1e]">{addOn.name}</p>
                      <p className="text-xs text-[#5a5872]">+${(addOn.price_cents / 100).toFixed(2)} · +{addOn.duration_minutes} min</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white hover:brightness-110">
                {editingServiceId ? 'Save service' : 'Create service'}
              </button>
              {editingServiceId && (
                <button type="button" onClick={resetServiceForm} className="rounded-xl border border-[#e3e3e3] px-4 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]">
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {services.map((service) => (
              <ListRow
                key={service.id}
                title={service.name}
                subtitle={`${service.duration_minutes} min · $${(service.price_cents / 100).toFixed(2)} · ${service.available_add_ons.length} add-ons`}
                meta={service.is_featured_home ? 'Featured on home' : service.is_active ? 'Active' : 'Hidden'}
                onEdit={() => editService(service)}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">{editingAddOnId ? 'Edit add-on' : 'Create add-on'}</h2>
          <form onSubmit={submitAddOn} className="mt-5 space-y-4">
            <Field label="Title">
              <input value={addOnForm.name} onChange={(event) => setAddOnForm((prev) => ({ ...prev, name: event.target.value }))} className={inputClass} required />
            </Field>
            <Field label="Description">
              <textarea value={addOnForm.description} onChange={(event) => setAddOnForm((prev) => ({ ...prev, description: event.target.value }))} className={`${inputClass} min-h-[120px]`} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Category">
                <input value={addOnForm.category} onChange={(event) => setAddOnForm((prev) => ({ ...prev, category: event.target.value }))} className={inputClass} />
              </Field>
              <Field label="Price (CAD)">
                <input value={addOnForm.price_dollars} onChange={(event) => setAddOnForm((prev) => ({ ...prev, price_dollars: event.target.value }))} className={inputClass} required />
              </Field>
              <Field label="Duration (min)">
                <input value={addOnForm.duration_minutes} onChange={(event) => setAddOnForm((prev) => ({ ...prev, duration_minutes: event.target.value }))} className={inputClass} required />
              </Field>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sort order">
                <input value={addOnForm.sort_order} onChange={(event) => setAddOnForm((prev) => ({ ...prev, sort_order: event.target.value }))} className={inputClass} required />
              </Field>
              <Toggle label="Active" checked={addOnForm.is_active} onChange={(checked) => setAddOnForm((prev) => ({ ...prev, is_active: checked }))} />
            </div>

            <div className="space-y-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
              <h3 className="text-sm font-semibold text-[#0f0a1e]">Assign to services</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {services.map((service) => (
                  <label key={service.id} className="flex items-start gap-3 rounded-2xl border border-[#ecebf5] bg-white p-3">
                    <input
                      type="checkbox"
                      checked={addOnForm.service_ids.includes(service.id)}
                      onChange={() =>
                        setAddOnForm((prev) => ({
                          ...prev,
                          service_ids: prev.service_ids.includes(service.id)
                            ? prev.service_ids.filter((id) => id !== service.id)
                            : [...prev.service_ids, service.id],
                        }))
                      }
                      className="mt-1 h-4 w-4 accent-[#1a132f]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-[#0f0a1e]">{service.name}</p>
                      <p className="text-xs text-[#5a5872]">{service.duration_minutes} min service</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white hover:brightness-110">
                {editingAddOnId ? 'Save add-on' : 'Create add-on'}
              </button>
              {editingAddOnId && (
                <button type="button" onClick={resetAddOnForm} className="rounded-xl border border-[#e3e3e3] px-4 py-3 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]">
                  Cancel edit
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 space-y-3">
            {addOns.map((addOn) => (
              <ListRow
                key={addOn.id}
                title={addOn.name}
                subtitle={`${addOn.category || 'Add-on'} · +$${(addOn.price_cents / 100).toFixed(2)} · +${addOn.duration_minutes} min`}
                meta={`${addOn.services.length} services`}
                onEdit={() => editAddOn(addOn)}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#1a132f]">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-[#ecebf5] bg-[#fcfcff] px-3 py-3 text-sm font-semibold text-[#1a132f]">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#1a132f]" />
      {label}
    </label>
  );
}

function ListRow({
  title,
  subtitle,
  meta,
  onEdit,
}: {
  title: string;
  subtitle: string;
  meta: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <div>
        <p className="font-semibold text-[#0f0a1e]">{title}</p>
        <p className="text-sm text-[#5a5872]">{subtitle}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-[#7b7794]">{meta}</p>
      </div>
      <button onClick={onEdit} className="rounded-full border border-[#e3e3e3] px-3 py-1 text-xs font-medium text-[#1a132f] hover:bg-[#f6f6f6]">
        Edit
      </button>
    </div>
  );
}

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function dollarsToCents(value: string) {
  return Math.round(Number.parseFloat(value || '0') * 100);
}

const inputClass =
  'w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2';
