'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Role = 'guest' | 'user' | 'admin';
type BookingStatus = 'scheduled' | 'cancelled' | 'completed';

export type Booking = {
  id: string;
  serviceId: string;
  serviceTitle: string;
  start: string; // ISO datetime string
  durationMinutes: number;
  price: number;
  addBrows: boolean;
  userName: string;
  status: BookingStatus;
};

type NewBookingInput = {
  serviceId: string;
  serviceTitle: string;
  start: string;
  durationMinutes: number;
  price: number;
  addBrows: boolean;
};

type SessionValue = {
  role: Role;
  displayName: string;
  bookings: Booking[];
  loginUser: (name: string) => void;
  loginAdmin: () => void;
  logout: () => void;
  addBooking: (data: NewBookingInput) => void;
  cancelBooking: (id: string) => void;
  rescheduleBooking: (id: string, newStart: string) => void;
  setBookingStatus: (id: string, status: BookingStatus) => void;
};

const STORAGE_KEY = 'hb-bookings';

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [displayName, setDisplayName] = useState<string>('');
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Load bookings from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Booking[];
        if (Array.isArray(parsed)) {
          setBookings(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // Persist bookings whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    } catch {
      // ignore storage errors
    }
  }, [bookings]);

  const value = useMemo<SessionValue>(
    () => ({
      role,
      displayName,
      bookings,
      loginUser: (name: string) => {
        setRole('user');
        setDisplayName(name);
      },
      loginAdmin: () => {
        setRole('admin');
        setDisplayName('Admin');
      },
      logout: () => {
        setRole('guest');
        setDisplayName('');
      },
      addBooking: (data: NewBookingInput) => {
        if (role !== 'user') {
          // Only logged-in users can create saved bookings
          return;
        }
        const booking: Booking = {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          userName: displayName || 'Client',
           status: 'scheduled',
          ...data,
        };
        setBookings((prev) => [...prev, booking]);
      },
      cancelBooking: (id: string) => {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)),
        );
      },
      rescheduleBooking: (id: string, newStart: string) => {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, start: newStart } : b)),
        );
      },
      setBookingStatus: (id: string, status: BookingStatus) => {
        setBookings((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status } : b)),
        );
      },
    }),
    [role, displayName, bookings],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
