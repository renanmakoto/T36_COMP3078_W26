'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiCreateAdminPortfolioItem,
  apiGetAdminPortfolioItems,
  apiUpdateAdminPortfolioItem,
  apiUploadAdminImage,
  type AdminPortfolioItemData,
} from '../../../api';
import {
  AdminPageHeader,
  EditableRow,
  Field,
  ImageUploadField,
  NoticeBanner,
  Toggle,
  inputClass,
  panelClass,
  primaryButtonClass,
  secondaryButtonClass,
  textAreaClass,
} from '../admin-ui';

type PortfolioFormState = {
  title: string;
  subtitle: string;
  tag: string;
  image_url: string;
  description: string;
  is_published: boolean;
  is_featured_home: boolean;
  home_order: string;
};

const initialForm: PortfolioFormState = {
  title: '',
  subtitle: '',
  tag: '',
  image_url: '',
  description: '',
  is_published: true,
  is_featured_home: false,
  home_order: '0',
};

export default function AdminPortfolioPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<AdminPortfolioItemData[]>([]);
  const [form, setForm] = useState<PortfolioFormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (role !== 'admin') {
      router.replace('/login');
      return;
    }

    loadData();
  }, [isReady, role, router]);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const data = await apiGetAdminPortfolioItems();
      setItems(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio items.');
    } finally {
      setLoading(false);
    }
  }

  const sortedItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (left.is_published !== right.is_published) return left.is_published ? -1 : 1;
        if (left.home_order !== right.home_order) return left.home_order - right.home_order;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }),
    [items],
  );

  function startEdit(item: AdminPortfolioItemData) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      subtitle: item.subtitle,
      tag: item.tag,
      image_url: item.image_url,
      description: item.description,
      is_published: item.is_published,
      is_featured_home: item.is_featured_home,
      home_order: String(item.home_order),
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleImageUpload(file: File, kind: 'service' | 'portfolio' | 'blog' | 'misc') {
    const response = await apiUploadAdminImage(file, kind);
    setNotice('Image uploaded successfully.');
    setError('');
    return response.url;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const payload = {
      title: form.title,
      subtitle: form.subtitle,
      tag: form.tag,
      image_url: form.image_url,
      description: form.description,
      is_published: form.is_published,
      is_featured_home: form.is_featured_home,
      home_order: Number(form.home_order),
    };

    try {
      if (editingId) {
        await apiUpdateAdminPortfolioItem(editingId, payload);
        setNotice('Portfolio item updated.');
      } else {
        await apiCreateAdminPortfolioItem(payload);
        setNotice('Portfolio item created.');
      }
      resetForm();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save portfolio item.');
    } finally {
      setSaving(false);
    }
  }

  if (!isReady || role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Manage Portfolio"
        description="Publish haircut work, add images, organize tags, and pick which pieces should appear on the homepage."
      />

      <NoticeBanner error={error} notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.2fr]">
        <section className={panelClass}>
          <h2 className="text-2xl font-bold text-[#0f0a1e]">{editingId ? 'Edit portfolio item' : 'Create portfolio item'}</h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
            <Field label="Subtitle">
              <input
                value={form.subtitle}
                onChange={(event) => setForm((current) => ({ ...current, subtitle: event.target.value }))}
                className={inputClass}
                placeholder="Skin fade with line work"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Tag">
                <input
                  value={form.tag}
                  onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value }))}
                  className={inputClass}
                  placeholder="Fade"
                />
              </Field>
              <ImageUploadField
                label="Portfolio image"
                hint="Paste a URL or upload from your device"
                kind="portfolio"
                value={form.image_url}
                onChange={(value) => setForm((current) => ({ ...current, image_url: value }))}
                onUpload={handleImageUpload}
                onUploadingChange={setImageUploading}
              />
            </div>
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
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
                label="Published"
                checked={form.is_published}
                onChange={(checked) => setForm((current) => ({ ...current, is_published: checked }))}
              />
              <Toggle
                label="Featured on home"
                checked={form.is_featured_home}
                onChange={(checked) => setForm((current) => ({ ...current, is_featured_home: checked }))}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass} disabled={saving || imageUploading}>
                {imageUploading
                  ? 'Uploading image...'
                  : saving
                    ? 'Saving...'
                    : editingId
                      ? 'Save portfolio item'
                      : 'Create portfolio item'}
              </button>
              {editingId ? (
                <button type="button" onClick={resetForm} className={secondaryButtonClass}>
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Published work</h2>
              <p className="text-sm text-[#5a5872]">Customers see published items in the portfolio and featured items on the home page.</p>
            </div>
            <span className="rounded-full bg-[#f3f0ff] px-3 py-1 text-xs font-semibold text-[#4f2bc7]">
              {items.filter((item) => item.is_featured_home).length} featured
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-[#5a5872]">Loading portfolio items...</p>
            ) : sortedItems.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
                No portfolio items yet.
              </p>
            ) : (
              sortedItems.map((item) => (
                <EditableRow
                  key={item.id}
                  title={item.title}
                  subtitle={`${item.subtitle || 'No subtitle'} - ${item.tag || 'No tag'}`}
                  meta={`${item.is_published ? 'Published' : 'Draft'} - home order ${item.home_order}`}
                  onEdit={() => startEdit(item)}
                >
                  {item.is_featured_home ? (
                    <span className="rounded-full bg-[#efeafe] px-3 py-1 text-xs font-semibold text-[#4f2bc7]">
                      Featured
                    </span>
                  ) : null}
                </EditableRow>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
