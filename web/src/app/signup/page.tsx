'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRegister } from '../api';

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading sign-up...</p>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const router = useRouter();
  const search = useSearchParams();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRegister(email, password, displayName, phone);
      const next = search.get('next');
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Create account</h1>
      <p className="text-sm text-[#5a5872]">
        Sign up with your email to start booking appointments. Admin accounts are added manually and cannot be
        self-registered.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#1a132f]">Name</label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
            type="text"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#1a132f]">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
            type="email"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#1a132f]">Phone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
            type="tel"
            placeholder="+1 (437) 555-0123"
            required
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#1a132f]">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
            type="password"
            required
            minLength={8}
          />
          <p className="mt-1 text-xs text-[#7b7794]">Minimum 8 characters</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1a132f] px-4 py-3 font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-[#5a5872]">
        By creating an account, you agree to the{' '}
        <Link href="/privacy-policy" className="font-semibold text-[#5b4fe5] hover:underline">
          privacy policy
        </Link>
        .
      </p>
    </div>
  );
}
