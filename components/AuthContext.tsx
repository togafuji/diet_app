'use client';

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { auth, db, isFirebaseConfigured } from '../lib/firebase';
import { ensureDemoProfile } from '../lib/demoStore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isDemo: boolean;
}

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DEMO_USER_STORAGE_KEY = 'diet-app-demo-user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAppUser(firebaseUser: User): AppUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? null,
    displayName: firebaseUser.displayName ?? null,
    isDemo: false
  };
}

function readStoredDemoUser(): AppUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(DEMO_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AppUser;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse stored demo user', error);
    return null;
  }
}

function storeDemoUser(user: AppUser | null) {
  if (typeof window === 'undefined') {
    return;
  }
  if (!user) {
    window.localStorage.removeItem(DEMO_USER_STORAGE_KEY);
  } else {
    window.localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(user));
  }
}

function createDemoUser(email: string): AppUser {
  const safeEmail = email.trim().toLowerCase();
  const uidBase =
    typeof btoa === 'function' ? btoa(safeEmail).replace(/=+/g, '') : safeEmail.replace(/[^a-z0-9]/gi, '');
  const uid = `demo-${uidBase || 'user'}`;
  return {
    uid,
    email: safeEmail,
    displayName: null,
    isDemo: true
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFirebaseConfigured && auth && db) {
      const firestore = db!;
      const unsub = onAuthStateChanged(auth, async (nextUser) => {
        if (nextUser) {
          const profileRef = doc(firestore, 'users', nextUser.uid);
          const snapshot = await getDoc(profileRef);
          if (!snapshot.exists()) {
            await setDoc(profileRef, {
              goalWeight: null,
              hintMode: 'maintain',
              dayBoundaryHour: 0,
              createdAt: new Date().toISOString()
            });
          }
          setUser(toAppUser(nextUser));
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsub();
    }

    const stored = readStoredDemoUser();
    if (stored) {
      ensureDemoProfile(stored.uid);
      setUser(stored);
    }
    setLoading(false);
    return () => {};
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login: async (email: string, password: string) => {
        if (isFirebaseConfigured && auth) {
          await signInWithEmailAndPassword(auth, email, password);
          return;
        }
        const demoUser = createDemoUser(email);
        ensureDemoProfile(demoUser.uid);
        storeDemoUser(demoUser);
        setUser(demoUser);
      },
      signUp: async (email: string, password: string) => {
        if (isFirebaseConfigured && auth) {
          await createUserWithEmailAndPassword(auth, email, password);
          return;
        }
        const demoUser = createDemoUser(email);
        ensureDemoProfile(demoUser.uid);
        storeDemoUser(demoUser);
        setUser(demoUser);
      },
      logout: async () => {
        if (isFirebaseConfigured && auth) {
          await signOut(auth);
          return;
        }
        storeDemoUser(null);
        setUser(null);
      }
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthContext is not provided');
  }
  return ctx;
}
