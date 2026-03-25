'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useSession } from '../session-context';
import {
  apiCreateTestimonial,
  apiGetPortfolioItems,
  apiGetServices,
  apiGetTestimonials,
  type PortfolioItemData,
  type ServiceData,
  type TestimonialData,
} from '../api';

export default function PortfolioPage() {
  const { role, displayName } = useSession();
  const [portfolio, setPortfolio] = useState<PortfolioItemData[]>([]);
  const [testimonials, setTestimonials] = useState<TestimonialData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [authorName, setAuthorName] = useState(displayName);
  const [rating, setRating] = useState(5);
  const [serviceId, setServiceId] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  useEffect(() => {
    Promise.all([apiGetPortfolioItems(), apiGetTestimonials(), apiGetServices()])
      .then(([portfolioItems, testimonialItems, serviceItems]) => {
        setPortfolio(portfolioItems);
        setTestimonials(testimonialItems);
        setServices(serviceItems);
        if (serviceItems[0]) setServiceId(serviceItems[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setAuthorName(displayName);
  }, [displayName]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (role !== 'user') {
      setSubmitState('error');
      setSubmitMessage('Please sign in as a client before leaving a testimonial.');
      return;
    }

    setSubmitState('loading');
    setSubmitMessage('');
    try {
      await apiCreateTestimonial({
        author_name: authorName,
        quote,
        rating,
        service_id: serviceId || undefined,
      });
      setQuote('');
      setRating(5);
      setSubmitState('success');
      setSubmitMessage('Thanks. Your testimonial was submitted for admin approval.');
    } catch (error: unknown) {
      setSubmitState('error');
      setSubmitMessage(error instanceof Error ? error.message : 'Failed to submit testimonial.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[#0f0a1e]">Portfolio</h1>
            <p className="text-sm text-[#5a5872]">Real work published by the admin, no more hard-coded gallery cards.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? Array.from({ length: 6 }, (_, index) => (
                <div key={`portfolio-skeleton-${index}`} className="h-[340px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
              ))
            : portfolio.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-3xl border border-[#ecebf5] bg-[#fcfcff]">
                  <div
                    className="h-56 bg-cover bg-center"
                    style={{
                      backgroundImage: item.image_url
                        ? `linear-gradient(180deg, rgba(15,10,30,0.05), rgba(15,10,30,0.25)), url(${item.image_url})`
                        : 'linear-gradient(135deg, #eadff8, #f7f4ff)',
                    }}
                  />
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-lg font-semibold text-[#0f0a1e]">{item.title}</p>
                        <p className="text-sm text-[#5a5872]">{item.subtitle || item.description}</p>
                      </div>
                      {item.tag ? (
                        <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
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

      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Approved testimonials</h2>
              <p className="text-sm text-[#5a5872]">Admins can approve, reject, edit, and feature these reviews.</p>
            </div>
            <span className="rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
              {testimonials.length} published
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {loading
              ? Array.from({ length: 3 }, (_, index) => (
                  <div key={`testimonial-skeleton-${index}`} className="h-[180px] animate-pulse rounded-3xl bg-[#f6f4ff]" />
                ))
              : testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="rounded-3xl border border-[#ecebf5] bg-[#fcfcff] p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-[#7b7794]">Rating {testimonial.rating}/5</p>
                    <p className="mt-3 text-sm leading-6 text-[#1a132f]">&quot;{testimonial.quote}&quot;</p>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[#0f0a1e]">{testimonial.author_name}</p>
                        <p className="text-sm text-[#5a5872]">{testimonial.service?.name || 'Customer review'}</p>
                      </div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#7b7794]">
                        {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                          new Date(testimonial.created_at),
                        )}
                      </p>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Leave a testimonial</h2>
          <p className="mt-2 text-sm text-[#5a5872]">
            Customers can submit a review here. It stays hidden until an admin approves it.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#1a132f]">Your name</label>
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                type="text"
                placeholder="Client name"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-[#1a132f]">Service</label>
                <select
                  value={serviceId}
                  onChange={(event) => setServiceId(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#1a132f]">Rating</label>
                <select
                  value={rating}
                  onChange={(event) => setRating(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>
                      {value} star{value === 1 ? '' : 's'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#1a132f]">Your review</label>
              <textarea
                value={quote}
                onChange={(event) => setQuote(event.target.value)}
                className="mt-1 min-h-[150px] w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                placeholder="Tell other clients about the service and the overall experience."
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitState === 'loading'}
              className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-60"
            >
              {submitState === 'loading' ? 'Submitting...' : 'Submit testimonial'}
            </button>

            {submitMessage ? (
              <p className={`text-sm font-semibold ${submitState === 'success' ? 'text-green-700' : 'text-red-600'}`}>
                {submitMessage}
              </p>
            ) : null}

            {role !== 'user' ? (
              <p className="text-xs text-[#7b7794]">Sign in as a client if you want to submit a testimonial.</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
