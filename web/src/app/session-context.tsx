'use client';

import { createContext, useContext, useMemo, useState } from 'react';

type Role = 'guest' | 'user' | 'admin';

type SessionValue = {
  role: Role;
  displayName: string;
  loginUser: (email: string) => void;
  loginAdmin: () => void;
  logout: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>('guest');
  const [displayName, setDisplayName] = useState<string>('');

  const value = useMemo<SessionValue>(
    () => ({
      role,
      displayName,
      loginUser: (email: string) => {
        setRole('user');
        setDisplayName(email);
      },
      loginAdmin: () => {
        setRole('admin');
        setDisplayName('Admin');
      },
      logout: () => {
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
