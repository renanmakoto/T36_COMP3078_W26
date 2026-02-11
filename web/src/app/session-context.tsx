'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiLogin as apiLoginCall, clearTokens, setTokens, type LoginResult } from './api';

type Role = 'guest' | 'user' | 'admin';

type SessionValue = {
  role: Role;
  displayName: string;
  loginUser: (email: string, password: string) => Promise<string | null>;
  loginAdmin: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [displayName, setDisplayName] = useState<string>('');

  // Restore session from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedRole = localStorage.getItem('hb-role') as Role | null;
    const savedName = localStorage.getItem('hb-name');
    const token = localStorage.getItem('hb-access');
    if (savedRole && token) {
      setRole(savedRole);
      setDisplayName(savedName || '');
    }
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      role,
      displayName,

      loginUser: async (email: string, password: string): Promise<string | null> => {
        try {
          const result: LoginResult = await apiLoginCall(email, password);
          setTokens(result.access, result.refresh);
          const name = result.user.email.split('@')[0];
          setRole('user');
          setDisplayName(name);
          localStorage.setItem('hb-role', 'user');
          localStorage.setItem('hb-name', name);
          return null;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Login failed.';
        }
      },

      loginAdmin: async (email: string, password: string): Promise<string | null> => {
        try {
          const result: LoginResult = await apiLoginCall(email, password);
          if (result.user.role !== 'ADMIN') {
            clearTokens();
            return 'This account does not have admin privileges.';
          }
          setTokens(result.access, result.refresh);
          setRole('admin');
          setDisplayName('Admin');
          localStorage.setItem('hb-role', 'admin');
          localStorage.setItem('hb-name', 'Admin');
          return null;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Login failed.';
        }
      },

      logout: () => {
        clearTokens();
        localStorage.removeItem('hb-role');
        localStorage.removeItem('hb-name');
        setRole('guest');
        setDisplayName('');
      },
    }),
    [role, displayName],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
