'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '../../session-context';

const DEMO_ADMIN = { user: 'admin', password: '123' };

export default function AdminLoginPage() {
  const { loginAdmin } = useSession();
  const router = useRouter();
  const [user, setUser] = useState(DEMO_ADMIN.user);
  const [password, setPassword] = useState(DEMO_ADMIN.password);
  const [error, setError] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (user === DEMO_ADMIN.user && password === DEMO_ADMIN.password) {
      loginAdmin();
      router.push('/admin/dashboard');
    } else {
      setError('Invalid credentials (use admin / 123).');
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 rounded-3xl bg-white p-8 shadow-sm">
      <h1 className="text-3xl font-bold text-[#0f0a1e]">Admin login</h1>
      <p className="text-sm text-[#5a5872]">
        Mirrors the mobile prototype. No backend yet; only toggles local state.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#1a132f]">Username</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e5e4ef] bg-white px-3 py-3 text-sm outline-none ring-[#5b4fe5]/40 focus:ring-2"
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

      <div className="text-sm text-[#5a5872]">
        <p>Quick switch? Use the top menu and choose "Admin".</p>
      </div>
    </div>
  );
}

