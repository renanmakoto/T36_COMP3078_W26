import Link from 'next/link';
import { notFound } from 'next/navigation';
import { posts } from '../posts';

type Props = { params: { id: string } };

export default function BlogDetailPage({ params }: Props) {
  const post = posts.find((p) => p.id === Number(params.id));
  if (!post) return notFound();

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <Link href="/blog" className="text-sm font-semibold text-[#5b4fe5] hover:underline">
          ← Back
        </Link>
        <p className="mt-2 text-sm text-[#7b7794]">
          {post.date} • {post.readTime} • By {post.author}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[#0f0a1e]">{post.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
              {tag}
            </span>
          ))}
        </div>

        <article className="prose prose-sm mt-6 max-w-none text-[#1a132f]">
          {post.body.split('\n').map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </article>
      </div>
    </div>
  );
}
