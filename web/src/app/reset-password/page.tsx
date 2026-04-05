'use client';

import Link from 'next/link';
import { FormEvent, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiResetPassword } from '../api';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 shadow-sm">
          <p className="text-sm text-[#5a5872]">Loading...</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await apiResetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-[#0f0a1e]">Invalid link</h1>
        <p className="text-sm text-[#5a5872]">This reset link is invalid or has expired.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-[#5b4fe5] hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Reset password</h1>

      {done ? (
        <div className="space-y-4">
          <p className="text-sm text-[#5a5872]">Your password has been reset successfully.</p>
          <Link href="/login" className="text-sm font-semibold text-[#5b4fe5] hover:underline">
            Sign in with your new password
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-[#5a5872]">Enter your new password below.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-[#1a132f]">New password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                type="password"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#1a132f]">Confirm password</label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
                type="password"
                required
                minLength={8}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#1a132f] px-4 py-3 font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
