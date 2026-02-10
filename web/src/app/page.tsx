import Link from 'next/link';

const services = [
  { title: 'Haircut', desc: 'Fade, taper, or classic cut tailored to you.', price: '$20', duration: '30-45 min' },
  { title: 'Haircut & Beard', desc: 'Complete cut with beard trim and finish.', price: '$25', duration: '45-60 min' },
  { title: 'Eyebrows', desc: 'Eyebrow shaping and clean-up.', price: '$5', duration: '15-20 min' },
];

const steps = [
  { title: 'Choose the service', body: 'Pick haircut, beard, or combo plus add-ons.' },
  { title: 'Pick a time', body: 'We only show free time slots (15 min blocks).' },
  { title: 'Confirm', body: 'Quick summary and (mocked) email confirmation.' },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 rounded-3xl bg-white p-6 shadow-sm md:grid-cols-[1.1fr_0.9fr] md:p-8">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-[#f1eefc] px-3 py-1 text-sm font-semibold text-[#1a132f]">
            Booking / Portfolio / Blog
          </p>
          <h1 className="text-4xl font-bold leading-tight text-[#0f0a1e] sm:text-5xl">
            Easy booking for Erick - plus portfolio and testimonials in one place.
          </h1>
          <p className="max-w-2xl text-lg text-[#49465a]">
            Web version of the mobile prototype. Focused on self-service booking, valid slots, and a simple admin
            area for the barber to manage schedule, content, and basic metrics.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/book"
              className="inline-flex items-center justify-center rounded-full bg-[#1a132f] px-5 py-3 text-white shadow-md shadow-[#1a132f]/20 transition hover:translate-y-[-1px] hover:brightness-110"
              style={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 600 }}
            >
              Book now
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-[#1a132f] px-5 py-3 text-[#1a132f] font-semibold hover:bg-[#1a132f] hover:text-white transition"
            >
              Sign in as client
            </Link>
            <Link
              href="/admin/login"
              className="rounded-full border border-[#d7d7e3] px-5 py-3 text-[#1a132f] hover:bg-[#f4f3fb]"
            >
              Admin
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Next openings" value="Today - 7:00 PM" />
            <Stat label="Clients/week" value="+35" />
            <Stat label="Response time" value="< 10 min" />
          </div>
        </div>

        <div className="rounded-2xl bg-[#0f0a1e] p-6 text-white shadow-lg">
          <p className="text-sm text-[#c7c3de]">Next appointment</p>
          <h3 className="mt-2 text-2xl font-semibold">Today - 7:00 PM</h3>
          <p className="mt-1 text-[#d9d6ea]">Haircut &amp; Beard - Daniel Johnson</p>
          <div className="mt-6 space-y-3 rounded-xl bg-white/5 p-4">
            <Row label="Address" value="230 Woolner Avenue, Toronto" />
            <Row label="Contact" value="erickhenriquecanada2909@gmail.com" />
            <Row label="Hours" value="Mon-Fri 7:00-10:30 PM - Sat 8:00-5:00 - Sun 8:00-12:00" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2 text-sm text-[#d9d6ea]">
            <Tag text="Email only" />
            <Tag text="Single barber - single location" />
            <Tag text="Consent log for photos" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#0f0a1e]">Our services</h2>
            <Link href="/book" className="text-sm font-semibold text-[#5b4fe5] hover:underline">
              See availability
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="flex flex-col gap-3 rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-lg font-semibold text-[#0f0a1e]">{service.title}</p>
                  <p className="text-sm text-[#5a5872]">{service.desc}</p>
                  <span className="mt-2 inline-flex rounded-full bg-[#f1eefc] px-3 py-1 text-xs font-medium text-[#1a132f]">
                    {service.duration}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#7b7794]">Starting at</p>
                  <p className="text-2xl font-bold text-[#1a132f]">{service.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">How it works</h2>
          <div className="mt-5 space-y-4">
            {steps.map((step, i) => (
              <div key={step.title} className="flex gap-3 rounded-2xl border border-[#ecebf5] bg-[#faf9ff] p-4">
                <div className="mt-0.5 h-8 w-8 rounded-full bg-[#1a132f] text-center text-sm font-semibold text-white">
                  {i + 1}
                </div>
                <div>
                  <p className="font-semibold text-[#0f0a1e]">{step.title}</p>
                  <p className="text-sm text-[#5a5872]">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Testimonials</h2>
          <p className="text-sm text-[#5a5872]">
            Mocked on the front-end; consent capture will be handled in the backend.
          </p>
          <div className="mt-5 space-y-4">
            {[
              {
                name: 'Daniel Johnson',
                text: '"I can book during work breaks without calling. I get an email instantly."',
                service: 'Haircut & Beard',
              },
              {
                name: 'Ahmed Ali',
                text: '"I rescheduled online without a fee and got email confirmation. Super handy."',
                service: 'Haircut + Eyebrows',
              },
            ].map((t) => (
              <div key={t.name} className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
                <p className="text-sm text-[#1a132f]">{t.text}</p>
                <div className="mt-3 flex items-center justify-between text-sm text-[#5a5872]">
                  <span className="font-semibold text-[#0f0a1e]">{t.name}</span>
                  <span>{t.service}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm md:p-8">
          <h2 className="text-2xl font-bold text-[#0f0a1e]">Blog & portfolio</h2>
          <p className="text-sm text-[#5a5872]">Content preview; posts and photos are hardcoded.</p>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
              <p className="text-xs uppercase tracking-wide text-[#7b7794]">Blog</p>
              <p className="mt-1 font-semibold text-[#0f0a1e]">5 tips to keep your fade in summer</p>
              <p className="text-sm text-[#5a5872]">Quick care to avoid dry hair with sun and pool.</p>
            </div>
            <div className="rounded-2xl border border-[#ecebf5] bg-[#fcfcff] p-4">
              <p className="text-xs uppercase tracking-wide text-[#7b7794]">Portfolio</p>
              <p className="mt-1 font-semibold text-[#0f0a1e]">Before / After</p>
              <p className="text-sm text-[#5a5872]">
                Mock gallery - backend will handle uploads and consent.
              </p>
            </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="min-w-[78px] text-[#c7c3de]">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}

function Tag({ text }: { text: string }) {
  return <span className="rounded-full bg-white/10 px-3 py-1 text-xs">{text}</span>;
}
