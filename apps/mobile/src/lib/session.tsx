import type { CustomerSession, OwnerSession } from '@baki/shared';
import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { setAuthToken, setUnauthorizedHandler } from './api';

export type Session = OwnerSession | CustomerSession;

const STORAGE_KEY = 'baki.session';

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const stored = JSON.parse(raw) as Session;
        setAuthToken(stored.token);
        setSession(stored);
      })
      .catch(() => SecureStore.deleteItemAsync(STORAGE_KEY))
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(
    async (next: Session) => {
      queryClient.clear();
      setAuthToken(next.token);
      setSession(next);
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setSession(null);
    queryClient.clear();
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const value = useMemo(() => ({ session, ready, signIn, signOut }), [session, ready, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

export function useOwnerSession(): OwnerSession {
  const { session } = useSession();
  if (session?.role !== 'owner') throw new Error('Not signed in as owner');
  return session;
}

export function useCustomerSession(): CustomerSession {
  const { session } = useSession();
  if (session?.role !== 'customer') throw new Error('Not signed in as customer');
  return session;
}
