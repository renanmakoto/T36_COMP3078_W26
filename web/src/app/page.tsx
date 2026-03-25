'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGetHomeContent, type HomeContentData } from './api';

export default function HomePage() {
  const [content, setContent] = useState<HomeContentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetHomeContent()
      .then(setContent)
      .catch(() => setContent(null))
      .finally(() => setLoading(false));
  }, []);

  const featuredServices = content?.featured_services ?? [];
  const featuredPortfolio = content?.featured_portfolio ?? [];
  const featuredBlogPosts = content?.featured_blog_posts ?? [];
  const featuredTestimonials = content?.featured_testimonials ?? [];
  const leadService = featuredServices[0];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-[2rem] bg-white p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
            Booking / Portfolio / Blog / Reviews
          </p>
          <h1 className="text-4xl font-bold leading-tight text-[#0f0a1e] sm:text-5xl">
            Erik can manage bookings, services, content, and reviews without code changes.
          </h1>
          <p className="max-w-2xl text-lg text-[#49465a]">
            Customers now see live services, real add-ons, current portfolio work, moderated testimonials, and blog
            posts managed directly from the admin dashboard.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-[#1a132f] px-5 py-3 text-sm font-semibold text-white shadow-md shadow-[#1a132f]/20 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Book now
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[#1a132f] px-5 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#1a132f] hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/portfolio"
              className="rounded-full border border-[#d7d7e3] px-5 py-3 text-sm text-[#1a132f] transition hover:bg-[#f4f3fb]"
            >
              View portfolio
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Featured services" value={loading ? '3' : String(featuredServices.length)} />
            <Stat label="Portfolio items" value={loading ? '3' : String(featuredPortfolio.length)} />
            <Stat label="Approved reviews" value={loading ? '3' : String(featuredTestimonials.length)} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-[#0f0a1e] text-white shadow-lg">
          <div
            className="min-h-[240px] bg-cover bg-center"
            style={{
              backgroundImage: leadService?.image_url
                ? `linear-gradient(180deg, rgba(15,10,30,0.08), rgba(15,10,30,0.75)), url(${leadService.image_url})`
                : 'linear-gradient(135deg, #2d2745 0%, #0f0a1e 100%)',
            }}
          />
          <div className="space-y-4 p-6">
            <div>
              <p className="text-sm text-[#c7c3de]">Featured booking</p>
              <h2 className="mt-1 text-2xl font-semibold">{leadService?.name || 'Haircut with Erik'}</h2>
              <p className="mt-1 text-[#d9d6ea]">
                {leadService?.duration_minutes ? `${leadService.duration_minutes} minutes` : 'Tailored appointment time'}
                {leadService?.price_cents ? ` at $${(leadService.price_cents / 100).toFixed(2)}` : ''}
              </p>
            </div>

            <p className="text-sm leading-6 text-[#e3e0f3]">
              {leadService?.description ||
                'A fresh haircut tailored to the preferred style, with optional add-ons managed directly from the admin dashboard.'}
            </p>

            {leadService?.payment_note ? (
              <div className="rounded-2xl bg-white/8 p-4 text-sm text-[#f0eef8]">
                <p className="font-semibold text-white">Payment note</p>
                <p className="mt-1">{leadService.payment_note}</p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 text-xs text-[#d9d6ea]">
              {leadService?.available_add_ons.length ? (
                leadService.available_add_ons.slice(0, 4).map((addOn) => (
                  <span key={addOn.id} className="rounded-full bg-white/10 px-3 py-1">
                    {addOn.name}
                  </span>
                ))
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1">Custom add-ons available</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Featured services</h2>
            <p className="text-sm text-[#5a5872]">These cards now come directly from admin-managed service data.</p>
          </div>
          <Link href="/book" className="text-sm font-semibold text-[#1a132f] hover:underline">
            Open booking
          </Link>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div
                  key={`service-skeleton-${index}`}
                  className="h-[320px] animate-pulse rounded-3xl border border-[#ecebf5] bg-[#f6f4ff]"
                />
              ))
            : featuredServices.map((service) => (
                <div key={service.id} className="overflow-hidden rounded-3xl border border-[#ecebf5] bg-[#fcfcff]">
                  <div
                    className="h-44 bg-cover bg-center"
                    style={{
                      backgroundImage: service.image_url
                        ? `linear-gradient(180deg, rgba(15,10,30,0.08), rgba(15,10,30,0.55)), url(${service.image_url})`
                        : 'linear-gradient(135deg, #d9d2ff, #f6f6ff)',
                    }}
                  />
                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#0f0a1e]">{service.name}</p>
                        <p className="text-sm text-[#5a5872]">{service.description}</p>
                      </div>
                      <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                        {service.duration_minutes} min
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold text-[#1a132f]">${(service.price_cents / 100).toFixed(2)}</p>
                      <p className="text-xs uppercase tracking-[0.2em] text-[#7b7794]">
                        {service.available_add_ons.length} add-ons
                      </p>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Latest portfolio work</h2>
              <p className="text-sm text-[#5a5872]">Admin-picked work shown on the home page.</p>
            </div>
            <Link href="/portfolio" className="text-sm font-semibold text-[#1a132f] hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 2 }, (_, index) => (
                  <div key={`portfolio-skeleton-${index}`} className="h-[270px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
                ))
              : featuredPortfolio.slice(0, 2).map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-3xl border border-[#ecebf5] bg-[#fcfcff]">
                    <div
                      className="h-44 bg-cover bg-center"
                      style={{
                        backgroundImage: item.image_url
                          ? `linear-gradient(180deg, rgba(15,10,30,0.05), rgba(15,10,30,0.3)), url(${item.image_url})`
                          : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
                      }}
                    />
                    <div className="space-y-2 p-5">
                      <p className="text-lg font-semibold text-[#0f0a1e]">{item.title}</p>
                      <p className="text-sm text-[#5a5872]">{item.subtitle || item.description}</p>
                      {item.tag ? (
                        <span className="inline-flex rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                          {item.tag}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">From the blog</h2>
              <p className="text-sm text-[#5a5872]">Real blog posts selected by the admin for the landing page.</p>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-[#1a132f] hover:underline">
              Read more
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <div key={`blog-skeleton-${index}`} className="h-[110px] animate-pulse rounded-2xl bg-[#f6f4ff]" />
                ))
              : featuredBlogPosts.slice(0, 3).map((post) => (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="block rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-24px_rgba(26,19,47,0.35)]"
                  >
                    <p className="text-xs uppercase tracking-wide text-[#7b7794]">
                      {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
                        new Date(post.created_at),
                      )}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[#0f0a1e]">{post.title}</p>
                    <p className="mt-2 text-sm text-[#5a5872]">{post.excerpt}</p>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Client testimonials</h2>
            <p className="text-sm text-[#5a5872]">Only approved testimonials are shown here.</p>
          </div>
          <Link href="/portfolio" className="text-sm font-semibold text-[#1a132f] hover:underline">
            Leave a review
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }, (_, index) => (
                <div key={`testimonial-skeleton-${index}`} className="h-[190px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
              ))
            : featuredTestimonials.map((testimonial) => (
                <div key={testimonial.id} className="rounded-3xl border border-[#ecebf5] bg-[#fcfcff] p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#7b7794]">Rating {testimonial.rating}/5</p>
                  <p className="mt-3 text-sm leading-6 text-[#1a132f]">&quot;{testimonial.quote}&quot;</p>
                  <div className="mt-4">
                    <p className="font-semibold text-[#0f0a1e]">{testimonial.author_name}</p>
                    <p className="text-sm text-[#5a5872]">{testimonial.service?.name || 'Client review'}</p>
                  </div>
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <p className="text-xs uppercase tracking-wide text-[#7b7794]">{label}</p>
      <p className="text-2xl font-bold text-[#0f0a1e]">{value}</p>
    </div>
  );
}
