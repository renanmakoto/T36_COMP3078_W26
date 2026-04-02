'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../../session-context';
import {
  apiCreateAdminBlogPost,
  apiGetAdminBlogPosts,
  apiUpdateAdminBlogPost,
  apiUploadAdminImage,
  type AdminBlogPostData,
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
  parseTags,
  primaryButtonClass,
  secondaryButtonClass,
  textAreaClass,
} from '../admin-ui';

type BlogFormState = {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image_url: string;
  tags: string;
  is_published: boolean;
  is_featured_home: boolean;
  home_order: string;
};

const initialForm: BlogFormState = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover_image_url: '',
  tags: '',
  is_published: true,
  is_featured_home: false,
  home_order: '0',
};

export default function AdminBlogPage() {
  const { isReady, role } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<AdminBlogPostData[]>([]);
  const [form, setForm] = useState<BlogFormState>(initialForm);
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
      const data = await apiGetAdminBlogPosts();
      setPosts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }

  const sortedPosts = useMemo(
    () =>
      [...posts].sort((left, right) => {
        if (left.is_published !== right.is_published) return left.is_published ? -1 : 1;
        if (left.home_order !== right.home_order) return left.home_order - right.home_order;
        return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      }),
    [posts],
  );

  function startEdit(post: AdminBlogPostData) {
    setEditingId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      cover_image_url: post.cover_image_url,
      tags: post.tags.join(', '),
      is_published: post.is_published,
      is_featured_home: post.is_featured_home,
      home_order: String(post.home_order),
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
      slug: form.slug,
      excerpt: form.excerpt,
      body: form.body,
      cover_image_url: form.cover_image_url,
      tags: parseTags(form.tags),
      is_published: form.is_published,
      is_featured_home: form.is_featured_home,
      home_order: Number(form.home_order),
    };

    try {
      if (editingId) {
        await apiUpdateAdminBlogPost(editingId, payload);
        setNotice('Blog post updated.');
      } else {
        await apiCreateAdminBlogPost(payload);
        setNotice('Blog post created.');
      }
      resetForm();
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save blog post.');
    } finally {
      setSaving(false);
    }
  }

  if (!isReady || role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Manage Blog"
        description="Create blog posts, update copy, control publishing, and feature selected articles on the homepage."
      />

      <NoticeBanner error={error} notice={notice} />

      <div className="grid gap-6 xl:grid-cols-[1fr,1.1fr]">
        <section className={panelClass}>
          <h2 className="text-2xl font-bold text-[#0f0a1e]">{editingId ? 'Edit post' : 'Create post'}</h2>
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Title">
              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className={inputClass}
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Slug" hint="Optional, auto-generated if left blank">
                <input
                  value={form.slug}
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <ImageUploadField
                label="Cover image"
                hint="Paste a URL or upload from your device"
                kind="blog"
                value={form.cover_image_url}
                onChange={(value) => setForm((current) => ({ ...current, cover_image_url: value }))}
                onUpload={handleImageUpload}
                onUploadingChange={setImageUploading}
              />
            </div>
            <Field label="Excerpt">
              <textarea
                value={form.excerpt}
                onChange={(event) => setForm((current) => ({ ...current, excerpt: event.target.value }))}
                className={textAreaClass}
              />
            </Field>
            <Field label="Body">
              <textarea
                value={form.body}
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                className={`${textAreaClass} min-h-[220px]`}
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Tags">
                <input
                  value={form.tags}
                  onChange={(event) => setForm((current) => ({ ...current, tags: event.target.value }))}
                  className={inputClass}
                  placeholder="fade, beard, style"
                />
              </Field>
              <Field label="Home order">
                <input
                  value={form.home_order}
                  onChange={(event) => setForm((current) => ({ ...current, home_order: event.target.value }))}
                  className={inputClass}
                />
              </Field>
              <div className="grid gap-4">
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
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" className={primaryButtonClass} disabled={saving || imageUploading}>
                {imageUploading ? 'Uploading image...' : saving ? 'Saving...' : editingId ? 'Save post' : 'Create post'}
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
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Blog posts</h2>
              <p className="text-sm text-[#5a5872]">Published posts show on the blog page. Featured posts can also be promoted on the home page.</p>
            </div>
            <span className="rounded-full bg-[#f3f0ff] px-3 py-1 text-xs font-semibold text-[#4f2bc7]">
              {posts.filter((post) => post.is_featured_home).length} featured
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="text-sm text-[#5a5872]">Loading blog posts...</p>
            ) : sortedPosts.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
                No blog posts yet.
              </p>
            ) : (
              sortedPosts.map((post) => (
                <EditableRow
                  key={post.id}
                  title={post.title}
                  subtitle={`${post.excerpt || 'No excerpt'} - ${post.tags.join(', ') || 'No tags'}`}
                  meta={`${post.is_published ? 'Published' : 'Draft'} - slug ${post.slug}`}
                  onEdit={() => startEdit(post)}
                >
                  {post.is_featured_home ? (
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
