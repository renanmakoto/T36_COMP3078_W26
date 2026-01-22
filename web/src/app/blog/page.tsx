'use client';

import Link from 'next/link';
import { posts } from './posts';
import { useSession } from '../session-context';

export default function BlogPage() {
  const { role } = useSession();
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[#7b7794]">Content</p>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Beauty Blog</h1>
            <p className="text-sm text-[#5a5872]">
              Posts are hardcoded; “New post” shows only for logged admin (UI only).
            </p>
          </div>
          {role === 'admin' && (
            <Link
              href="/admin/dashboard"
              className="rounded-full border border-[#e5e4ef] px-4 py-2 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              New post (mock)
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.id}`}
              className="group rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4 transition hover:-translate-y-1 hover:shadow-[0_18px_38px_-24px_rgba(26,19,47,0.35)]"
            >
              <p className="text-xs uppercase tracking-wide text-[#7b7794]">{post.date}</p>
              <h3 className="mt-1 text-lg font-semibold text-[#0f0a1e] group-hover:text-[#1a132f]">
                {post.title}
              </h3>
              <p className="mt-2 text-sm text-[#5a5872]">{post.snippet}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-[#7b7794]">
                {post.author} • {post.readTime}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
