'use client';

import { useRouter } from 'next/navigation';

export default function SignUpPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Create account (mock)</h1>
      <p className="text-sm text-[#5a5872]">
        Placeholder screen for this sprint. Backend and persistence will be added later. Click "Save" to return.
      </p>

      <div className="space-y-4">
        <Field label="Full name" />
        <Field label="Email" type="email" />
        <Field label="Phone" type="tel" />
        <Field label="Password" type="password" />
      </div>

      <button
        onClick={() => router.push('/login')}
        className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-white font-semibold shadow-sm hover:brightness-110"
      >
        Save (placeholder)
      </button>
    </div>
  );
}

function Field({ label, type = 'text' }: { label: string; type?: string }) {
  return (
    <div>
      <label className="text-sm font-semibold text-[#1a132f]">{label}</label>
      <input
        className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
        type={type}
      />
    </div>
  );
}

