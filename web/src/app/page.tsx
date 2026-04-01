'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGetHomeContent, type HomeContentData } from './api';
import { siteConfig } from './site-config';

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
  const featuredTestimonials = content?.featured_testimonials ?? [];
  const leadService = featuredServices[0];

  return (
    <div className="space-y-10">
      <section className="grid gap-6 rounded-[2rem] bg-[linear-gradient(135deg,#ffffff_0%,#f3f0ff_52%,#fff7ef_100%)] p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#1a132f] shadow-sm">
            Toronto barber booking / portfolio / reviews
          </p>

          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-[#0f0a1e] sm:text-5xl">
              Clean cuts, beard work, and polished grooming with {siteConfig.ownerName}.
            </h1>
            <p className="max-w-2xl text-lg text-[#49465a]">
              Book online, check the latest portfolio work, and manage your appointment with a simpler client flow.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-[#1a132f] px-5 py-3 text-sm font-semibold !text-white shadow-md shadow-[#1a132f]/20 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Book now
            </Link>
            <Link
              href="/portfolio"
              className="rounded-full border border-[#1a132f] px-5 py-3 text-sm font-semibold text-[#1a132f] transition hover:bg-[#1a132f] hover:text-white"
            >
              View portfolio
            </Link>
            <Link
              href="/blog"
              className="rounded-full border border-[#d7d7e3] px-5 py-3 text-sm text-[#1a132f] transition hover:bg-white"
            >
              Read grooming tips
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoChip label="Address" value={siteConfig.address} />
            <InfoChip label="Phone" value={siteConfig.phone} />
            <InfoChip label="Booking hours" value={siteConfig.bookingWindow} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Popular services" value={loading ? '3' : String(featuredServices.length)} />
            <Stat label="Portfolio highlights" value={loading ? '3' : String(featuredPortfolio.length)} />
            <Stat label="Published reviews" value={loading ? '3' : String(featuredTestimonials.length)} />
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] bg-[#0f0a1e] text-white shadow-lg">
          <div
            className="min-h-[260px] bg-cover bg-center"
            style={{
              backgroundImage: leadService?.image_url
                ? `linear-gradient(180deg, rgba(15,10,30,0.14), rgba(15,10,30,0.74)), url(${leadService.image_url})`
                : 'linear-gradient(135deg, #2d2745 0%, #0f0a1e 100%)',
            }}
          />
          <div className="space-y-4 p-6">
            <div>
              <p className="text-sm text-[#c7c3de]">Most-booked appointment</p>
              <h2 className="mt-1 text-2xl font-semibold">{leadService?.name || 'Classic cut and beard tidy'}</h2>
              <p className="mt-1 text-[#d9d6ea]">
                {leadService?.duration_minutes ? `${leadService.duration_minutes} minutes` : 'Flexible timing'}
                {leadService?.price_cents ? ` / $${(leadService.price_cents / 100).toFixed(2)}` : ''}
              </p>
            </div>

            <p className="text-sm leading-6 text-[#e3e0f3]">
              {leadService?.description ||
                'A polished appointment designed for clients who want a clean finish, practical maintenance, and easy booking management.'}
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#c7c3de]">Payment methods</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {siteConfig.paymentMethods.map((method) => (
                  <span key={method} className="rounded-full bg-white/12 px-3 py-2 text-sm font-semibold text-white">
                    {method}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Recent portfolio work</h2>
              <p className="text-sm text-[#5a5872]">Fresh cuts and grooming work published by the studio.</p>
            </div>
            <Link href="/portfolio" className="text-sm font-semibold text-[#1a132f] hover:underline">
              See full gallery
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {loading
              ? Array.from({ length: 2 }, (_, index) => (
                  <div key={`portfolio-skeleton-${index}`} className="h-[280px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
                ))
              : featuredPortfolio.slice(0, 2).map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-3xl border border-[#ecebf5] bg-[#fcfcff]">
                    <div
                      className="h-52 bg-cover bg-center"
                      style={{
                        backgroundImage: item.image_url
                          ? `linear-gradient(180deg, rgba(15,10,30,0.05), rgba(15,10,30,0.3)), url(${item.image_url})`
                          : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
                      }}
                    />
                    <div className="space-y-2 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-[#0f0a1e]">{item.title}</p>
                          <p className="text-sm text-[#5a5872]">{item.subtitle || item.description}</p>
                        </div>
                        {item.tag ? (
                          <span className="inline-flex rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                            {item.tag}
                          </span>
                        ) : null}
                      </div>
                      {item.description ? <p className="text-sm leading-6 text-[#5a5872]">{item.description}</p> : null}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Client reviews</h2>
              <p className="text-sm text-[#5a5872]">Recent approved testimonials from real appointments.</p>
            </div>
            <Link href="/portfolio" className="text-sm font-semibold text-[#1a132f] hover:underline">
              Read more reviews
            </Link>
          </div>

          <div className="mt-5 space-y-4">
            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <div key={`testimonial-skeleton-${index}`} className="h-[190px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
                ))
              : featuredTestimonials.map((testimonial) => (
                  <div key={testimonial.id} className="rounded-3xl border border-[#ecebf5] bg-[#fcfcff] p-5">
                    <div className="flex items-center gap-1 text-[#f5a524]">
                      {Array.from({ length: testimonial.rating }, (_, index) => (
                        <span key={`${testimonial.id}-star-${index}`} aria-hidden="true">
                          &#9733;
                        </span>
                      ))}
                      <span className="ml-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7b7794]">
                        {testimonial.rating}/5
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#1a132f]">&quot;{testimonial.quote}&quot;</p>
                    <div className="mt-4">
                      <p className="font-semibold text-[#0f0a1e]">{testimonial.author_name}</p>
                      <p className="text-sm text-[#5a5872]">{testimonial.service?.name || 'Client review'}</p>
                    </div>
                  </div>
                ))}
          </div>
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

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-[#7b7794]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#0f0a1e]">{value}</p>
    </div>
  );
}
