'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { apiRequestPasswordReset } from '../api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await apiRequestPasswordReset(email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Forgot password</h1>

      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-[#5a5872]">
            If an account with that email exists, a reset link has been sent. Check your inbox.
          </p>
          <Link href="/login" className="text-sm font-semibold text-[#5b4fe5] hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#5a5872]">
            Enter your email and we will send you a link to reset your password.
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1a132f] px-4 py-3 font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
          <Link href="/login" className="block text-sm text-[#5b4fe5] hover:underline">
            Back to sign in
          </Link>
        </>
      )}
    </div>
  );
}
