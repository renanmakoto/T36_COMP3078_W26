'use client';

import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { apiLogin as apiLoginCall, clearSessionStorage, setTokens, type LoginResult } from './api';

type Role = 'guest' | 'user' | 'admin';

type SessionValue = {
  isReady: boolean;
  role: Role;
  displayName: string;
  loginUser: (email: string, password: string) => Promise<string | null>;
  loginAdmin: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
};

type SessionSnapshot = {
  isReady: boolean;
  role: Role;
  displayName: string;
};

const SessionContext = createContext<SessionValue | null>(null);
const SESSION_CHANGE_EVENT = 'hb-session-change';
const DEFAULT_SNAPSHOT: SessionSnapshot = { isReady: false, role: 'guest', displayName: '' };
let cachedSnapshot: SessionSnapshot = DEFAULT_SNAPSHOT;

function readSessionSnapshot(): SessionSnapshot {
  if (typeof window === 'undefined') return DEFAULT_SNAPSHOT;

  const savedRole = localStorage.getItem('hb-role') as Role | null;
  const savedName = localStorage.getItem('hb-name');
  const token = localStorage.getItem('hb-access');
  const nextSnapshot: SessionSnapshot =
    savedRole && token
      ? {
          isReady: true,
          role: savedRole,
          displayName: savedName || '',
        }
      : {
          isReady: true,
          role: 'guest',
          displayName: '',
        };

  if (
    cachedSnapshot.isReady === nextSnapshot.isReady &&
    cachedSnapshot.role === nextSnapshot.role &&
    cachedSnapshot.displayName === nextSnapshot.displayName
  ) {
    return cachedSnapshot;
  }

  cachedSnapshot = nextSnapshot;
  return cachedSnapshot;
}

function subscribeSession(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = () => callback();
  window.addEventListener('storage', handler);
  window.addEventListener(SESSION_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener(SESSION_CHANGE_EVENT, handler);
  };
}

function emitSessionChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SESSION_CHANGE_EVENT));
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribeSession, readSessionSnapshot, () => DEFAULT_SNAPSHOT);

  const value = useMemo<SessionValue>(
    () => ({
      role: snapshot.role,
      isReady: snapshot.isReady,
      displayName: snapshot.displayName,

      loginUser: async (email: string, password: string): Promise<string | null> => {
        try {
          const result: LoginResult = await apiLoginCall(email, password);
          setTokens(result.access, result.refresh);
          const name = result.user.display_name || result.user.email.split('@')[0];
          const nextRole: Role = result.user.role === 'ADMIN' ? 'admin' : 'user';
          localStorage.setItem('hb-role', nextRole);
          localStorage.setItem('hb-name', name);
          emitSessionChange();
          return null;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Login failed.';
        }
      },

      loginAdmin: async (email: string, password: string): Promise<string | null> => {
        try {
          const result: LoginResult = await apiLoginCall(email, password);
          if (result.user.role !== 'ADMIN') {
            clearSessionStorage();
            return 'This account does not have admin privileges.';
          }
          setTokens(result.access, result.refresh);
          const name = result.user.display_name || 'Admin';
          localStorage.setItem('hb-role', 'admin');
          localStorage.setItem('hb-name', name);
          emitSessionChange();
          return null;
        } catch (err: unknown) {
          return err instanceof Error ? err.message : 'Login failed.';
        }
      },

      logout: () => {
        clearSessionStorage();
      },
    }),
    [snapshot.displayName, snapshot.isReady, snapshot.role],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
