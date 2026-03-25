'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';
import {
  apiGetAdminAddOns,
  apiGetAdminBlogPosts,
  apiGetAdminPortfolioItems,
  apiGetAdminServices,
  apiGetAdminTestimonials,
  apiGetAllAppointments,
  type AdminAppointmentData,
} from '../../api';
import { formatCurrency, formatDateTime, panelClass, statusTone } from './admin-ui';

type DashboardSnapshot = {
  services: number;
  addOns: number;
  portfolio: number;
  blogPosts: number;
  testimonials: number;
  pendingTestimonials: number;
  appointments: AdminAppointmentData[];
};

export default function AdminDashboardPage() {
  const { role } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    if (role !== 'admin') {
      router.replace('/login');
      return;
    }

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [services, addOns, portfolio, blogPosts, testimonials, appointments] = await Promise.all([
          apiGetAdminServices(),
          apiGetAdminAddOns(),
          apiGetAdminPortfolioItems(),
          apiGetAdminBlogPosts(),
          apiGetAdminTestimonials(),
          apiGetAllAppointments(),
        ]);

        setSnapshot({
          services: services.length,
          addOns: addOns.length,
          portfolio: portfolio.length,
          blogPosts: blogPosts.length,
          testimonials: testimonials.length,
          pendingTestimonials: testimonials.filter((item) => item.status === 'PENDING').length,
          appointments,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [role, router]);

  const upcomingAppointments = useMemo(() => {
    if (!snapshot) return [];
    return [...snapshot.appointments]
      .filter((item) => item.status !== 'CANCELLED' && new Date(item.start_time) >= new Date())
      .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())
      .slice(0, 6);
  }, [snapshot]);

  if (role !== 'admin') return null;

  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm text-[#5a5872]">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">{error || 'Failed to load dashboard.'}</p>
      </div>
    );
  }

  const sections = [
    {
      href: '/admin/dashboard/services',
      title: 'Services and add-ons',
      description: 'Control pricing, durations, optional extras, and what appears on the home page.',
      metric: `${snapshot.services} services / ${snapshot.addOns} add-ons`,
    },
    {
      href: '/admin/dashboard/bookings',
      title: 'Bookings',
      description: 'Create bookings for walk-ins, edit appointment details, and manage booking status.',
      metric: `${snapshot.appointments.length} total bookings`,
    },
    {
      href: '/admin/dashboard/portfolio',
      title: 'Portfolio',
      description: 'Publish haircut work, attach images, and feature selected cuts on the homepage.',
      metric: `${snapshot.portfolio} portfolio items`,
    },
    {
      href: '/admin/dashboard/blog',
      title: 'Blog',
      description: 'Write posts, edit published content, and choose featured articles for the homepage.',
      metric: `${snapshot.blogPosts} blog posts`,
    },
    {
      href: '/admin/dashboard/testimonials',
      title: 'Testimonials',
      description: 'Approve or reject customer reviews and decide which ones appear publicly.',
      metric: `${snapshot.pendingTestimonials} pending moderation`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className={`${panelClass} bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(233,230,255,0.82))]`}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7b7794]">Admin CMS</p>
        <h1 className="mt-3 text-3xl font-bold text-[#0f0a1e]">Manage the full experience without code changes</h1>
        <p className="mt-2 max-w-3xl text-sm text-[#5a5872]">
          Services, bookings, portfolio cards, blog posts, testimonials, and featured home content now come from the
          admin area. Use the sections below to keep the public site and mobile app in sync.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Services" value={String(snapshot.services)} sublabel={`${snapshot.addOns} add-ons`} />
        <MetricCard label="Bookings" value={String(snapshot.appointments.length)} sublabel="All recorded appointments" />
        <MetricCard label="Portfolio" value={String(snapshot.portfolio)} sublabel="Published and draft work" />
        <MetricCard label="Blog Posts" value={String(snapshot.blogPosts)} sublabel="Admin-managed content" />
        <MetricCard
          label="Pending Reviews"
          value={String(snapshot.pendingTestimonials)}
          sublabel={`${snapshot.testimonials} total testimonials`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="rounded-[2rem] border border-[#ecebf5] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7b7794]">{section.metric}</p>
            <h2 className="mt-3 text-xl font-bold text-[#0f0a1e]">{section.title}</h2>
            <p className="mt-2 text-sm text-[#5a5872]">{section.description}</p>
            <p className="mt-5 text-sm font-semibold text-[#1a132f]">Open section</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.8fr]">
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-[#0f0a1e]">Upcoming bookings</h2>
              <p className="text-sm text-[#5a5872]">Next confirmed or pending client sessions.</p>
            </div>
            <Link
              href="/admin/dashboard/bookings"
              className="rounded-full border border-[#e3e3e3] px-3 py-2 text-xs font-semibold text-[#1a132f] hover:bg-[#f6f6f6]"
            >
              Manage bookings
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {upcomingAppointments.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e5e4ef] px-4 py-6 text-sm text-[#7b7794]">
                No upcoming bookings yet.
              </p>
            ) : (
              upcomingAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4"
                >
                  <div>
                    <p className="text-sm text-[#7b7794]">{formatDateTime(appointment.start_time)}</p>
                    <p className="text-base font-semibold text-[#0f0a1e]">
                      {appointment.user.display_name || appointment.user.email}
                    </p>
                    <p className="text-sm text-[#5a5872]">
                      {appointment.service.name} - {appointment.add_ons.length} add-ons -{' '}
                      {formatCurrency(appointment.total_price_cents)}
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(appointment.status)}`}>
                    {appointment.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={panelClass}>
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Content workflow</h2>
          <div className="mt-5 space-y-3 text-sm text-[#5a5872]">
            <WorkflowRow
              title="1. Publish a service"
              description="Add pricing, duration, image, add-ons, and mark it as featured if it should appear on the homepage."
            />
            <WorkflowRow
              title="2. Post fresh work"
              description="Upload portfolio cards and blog posts so customers always see recent cuts and updates."
            />
            <WorkflowRow
              title="3. Moderate testimonials"
              description="Customer reviews stay pending until an admin approves them, which prevents inappropriate public posts."
            />
            <WorkflowRow
              title="4. Keep home content fresh"
              description="Featured flags on services, portfolio, blog, and testimonials control the homepage cards automatically."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-[#7b7794]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0f0a1e]">{value}</p>
      <p className="mt-1 text-sm text-[#5a5872]">{sublabel}</p>
    </div>
  );
}

function WorkflowRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
      <p className="font-semibold text-[#0f0a1e]">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}
