import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGetBlogPost } from '../../api';

export default async function BlogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  try {
    const post = await apiGetBlogPost(id);

    return (
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
          <div
            className="h-64 bg-cover bg-center md:h-80"
            style={{
              backgroundImage: post.cover_image_url
                ? `linear-gradient(180deg, rgba(15,10,30,0.08), rgba(15,10,30,0.55)), url(${post.cover_image_url})`
                : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
            }}
          />

          <div className="space-y-5 p-6 md:p-8">
            <Link href="/blog" className="text-sm font-semibold text-[#1a132f] hover:underline">
              Back to blog
            </Link>

            <div>
              <p className="text-sm text-[#7b7794]">
                {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
                  new Date(post.created_at),
                )}{' '}
                by {post.created_by?.display_name || post.created_by?.email || 'Admin'}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0f0a1e] md:text-4xl">{post.title}</h1>
              {post.excerpt ? <p className="mt-3 max-w-3xl text-base text-[#5a5872]">{post.excerpt}</p> : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                  {tag}
                </span>
              ))}
            </div>

            <article className="space-y-4 text-sm leading-7 text-[#1a132f] md:text-base">
              {post.body
                .split('\n')
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </article>
          </div>
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}
