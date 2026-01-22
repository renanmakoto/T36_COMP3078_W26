'use client';

import { useState } from 'react';

const gallery = [
  { title: 'Fade + Beard', note: 'Before / After', tag: 'Fade' },
  { title: 'Classic Cut', note: 'Side part', tag: 'Classic' },
  { title: 'Mid Fade', note: 'Business friendly', tag: 'Fade' },
];

const testimonials = [
  { name: 'Daniel Johnson', quote: '“Got confirmation instantly and fit it into my break.”' },
  { name: 'Ahmed Ali', quote: '“Rescheduling online saved my Saturday.”' },
];

export default function PortfolioPage() {
  const [showTestimonials, setShowTestimonials] = useState(false);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#0f0a1e]">Portfolio</h1>
          <p className="text-sm text-[#5a5872]">Uploads and consent handling will be implemented in the backend.</p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <div key={item.title} className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
              <div className="mb-3 h-32 rounded-xl bg-gradient-to-br from-[#d9d2ff] to-[#f6f6ff]" />
              <p className="font-semibold text-[#0f0a1e]">{item.title}</p>
              <p className="text-sm text-[#5a5872]">{item.note}</p>
              <span className="mt-2 inline-block rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-semibold text-[#1a132f]">
                {item.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Testimonials</h2>
          <button
            onClick={() => setShowTestimonials((s) => !s)}
            className="rounded-full border border-[#e5e4ef] px-4 py-2 text-sm font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
          >
            {showTestimonials ? 'Hide' : 'View'} testimonials
          </button>
        </div>

        {showTestimonials && (
          <div className="mt-4 space-y-3">
            {testimonials.map((t) => (
              <div key={t.name} className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
                <p className="text-sm text-[#1a132f]">{t.quote}</p>
                <p className="mt-2 text-sm font-semibold text-[#0f0a1e]">{t.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
