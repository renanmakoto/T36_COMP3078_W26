'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useSession } from '../session-context';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/book', label: 'Booking' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/blog', label: 'Blog' },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { role, displayName, logout } = useSession();

  const dashboardHref = useMemo(() => {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'user') return '/user/dashboard';
    return '/login';
  }, [role]);

  return (
    <header className="sticky top-0 z-30 border-b border-[#e6e6e6] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1a132f] text-white font-semibold">
            HB
          </div>
          <div>
            <p className="text-sm text-[#6b6b6b]">BrazWebDes</p>
            <p className="text-base font-semibold text-[#1a132f]">Hairstylist Booking</p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-3 text-sm font-medium text-[#3b3b3b] sm:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-2 transition ${
                  active ? 'bg-[#f1eefc] text-[#1a132f] font-semibold' : 'hover:bg-[#f6f6f6]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3 text-sm">
          {role !== 'guest' ? (
            <>
              <button
                onClick={() => router.push(dashboardHref)}
                className="rounded-full border border-[#e3e3e3] px-3 py-2 font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
              >
                {role === 'admin' ? 'Admin' : 'My bookings'}
              </button>
              <button
                onClick={logout}
                className="rounded-full bg-[#1a132f] px-4 py-2 text-white shadow-sm hover:brightness-110"
              >
                Sign out ({displayName || role})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                className="rounded-full border border-[#e3e3e3] px-3 py-2 font-medium text-[#1a132f] hover:bg-[#f6f6f6]"
              >
                Sign in
              </button>
              <button
                onClick={() => router.push('/admin/login')}
                className="rounded-full bg-[#1a132f] px-4 py-2 text-white shadow-sm hover:brightness-110"
              >
                Admin
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
