'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '../session-context';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading sign-in...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { loginUser } = useSession();
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const err = await loginUser(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      const next = search.get('next');
      const nextRole = localStorage.getItem('hb-role');
      router.push(next || (nextRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'));
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Sign in</h1>
      <p className="text-sm text-[#5a5872]">
        Use one sign-in for both client and admin accounts. New registrations are always client accounts.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="text-sm font-semibold text-[#1a132f]">Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
            type="password"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-[#1a132f] px-4 py-3 font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="space-y-2 text-sm text-[#5a5872]">
        <p>Need an account?</p>
        <Link
          className="font-semibold text-[#5b4fe5] hover:underline"
          href={search.get('next') ? `/signup?next=${encodeURIComponent(search.get('next') ?? '')}` : '/signup'}
        >
          Go to sign up
        </Link>
        <p>
          Privacy policy:{' '}
          <Link className="font-semibold text-[#5b4fe5] hover:underline" href="/privacy-policy">
            read here
          </Link>
        </p>
      </div>
    </div>
  );
}
