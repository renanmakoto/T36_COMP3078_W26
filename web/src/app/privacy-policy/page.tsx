import Link from 'next/link';

import { siteConfig } from '../site-config';

export default function PrivacyPolicyPage() {
  return (
    <article className="mx-auto max-w-4xl rounded-[2rem] border border-[#e6dccf] bg-[#fffaf2] p-8 text-[#1d1712] shadow-[0_20px_70px_rgba(29,23,18,0.08)] sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8f5a36]">{siteConfig.brandName}</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-3 text-sm text-[#675d55]">Effective date: April 2, 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-7 text-[#3a3028]">
        <section>
          <h2 className="text-lg font-semibold text-[#1d1712]">What we collect</h2>
          <p>
            We collect account details such as name, email address, and password, plus booking data such as selected
            services, appointment times, notes, and booking history. If you submit a testimonial, we also store the
            review text and rating.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#1d1712]">How we use it</h2>
          <p>
            We use your information to create and manage your account, schedule appointments, confirm or update
            bookings, and operate the client and admin areas of the service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#1d1712]">Sharing and storage</h2>
          <p>
            Your information may be processed by our hosting, database, and email delivery providers when needed to
            operate the booking service. We do not sell personal information.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#1d1712]">Account deletion</h2>
          <p>
            You can delete your customer account inside the mobile app from the dashboard, or by visiting the{' '}
            <Link className="font-semibold text-[#8f5a36] underline" href="/account/delete">
              account deletion page
            </Link>{' '}
            on our website. Deleting your account removes your customer profile, appointment history, and your submitted
            testimonials from the live booking system.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#1d1712]">Contact</h2>
          <p>
            Questions about this policy or your information can be sent to{' '}
            <a className="font-semibold text-[#8f5a36] underline" href="mailto:admin@brazwebdes.com">
              admin@brazwebdes.com
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
