'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSession } from '../session-context';
import { apiGetBlogPosts, type BlogPostSummaryData } from '../api';

export default function BlogPage() {
  const { role } = useSession();
  const [posts, setPosts] = useState<BlogPostSummaryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetBlogPosts()
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Beauty Blog</h1>
            <p className="text-sm text-[#5a5872]">Every post below now comes from admin-managed backend content.</p>
          </div>
          {role === 'admin' && (
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-[#e5e4ef] px-4 py-2 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              Manage posts
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div key={`blog-skeleton-${index}`} className="h-[320px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
              ))
            : posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group overflow-hidden rounded-3xl border border-[#ecebf5] bg-[#fcfcff] transition hover:-translate-y-1 hover:shadow-[0_18px_38px_-24px_rgba(26,19,47,0.35)]"
                >
                  <div
                    className="h-44 bg-cover bg-center"
                    style={{
                      backgroundImage: post.cover_image_url
                        ? `linear-gradient(180deg, rgba(15,10,30,0.05), rgba(15,10,30,0.35)), url(${post.cover_image_url})`
                        : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
                    }}
                  />
                  <div className="space-y-3 p-5">
                    <p className="text-xs uppercase tracking-wide text-[#7b7794]">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
                        new Date(post.created_at),
                      )}
                    </p>
                    <h2 className="text-lg font-semibold text-[#0f0a1e] group-hover:text-[#1a132f]">{post.title}</h2>
                    <p className="text-sm text-[#5a5872]">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </div>
  );
}
