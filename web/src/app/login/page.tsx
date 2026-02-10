'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../session-context';

const DEMO_USER = { email: 'user@example.com', password: 'password123', name: 'Daniel Johnson' };

export default function LoginPage() {
  const { loginUser } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_USER.email);
  const [password, setPassword] = useState(DEMO_USER.password);
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_USER.password) {
      loginUser(DEMO_USER.name);
      router.push('/user/dashboard');
    } else {
      setError('Invalid credentials (use user@example.com / password123).');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Sign in as client</h1>
      <p className="text-sm text-[#5a5872]">
        Accounts are mocked for this prototype. Use the prefilled credentials or any email/password to explore.
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
          className="w-full rounded-xl bg-[#1a132f] px-4 py-3 text-white font-semibold shadow-sm hover:brightness-110"
        >
          Sign in
        </button>
      </form>

      <div className="space-y-2 text-sm text-[#5a5872]">
        <p>
          Need an account? Use the (placeholder) sign-up screen or continue as guest on the homepage and services.
        </p>
        <Link className="font-semibold text-[#5b4fe5] hover:underline" href="/signup">
          Go to sign up
        </Link>
      </div>
    </div>
  );
}
