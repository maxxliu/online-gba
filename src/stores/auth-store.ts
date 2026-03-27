'use client';

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js';
import type { SyncStatus } from '@/types';
import { getSupabase } from '@/lib/supabase';
import { getIndexedDb, setStorageProvider } from '@/lib/db';
import { SyncQueue } from '@/lib/sync-queue';
import { SyncProvider } from '@/lib/sync-provider';
import { performInitialSync } from '@/lib/sync-engine';
import { useLibraryStore } from './library-store';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;
  syncError: string | null;

  initialize(): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<{ error?: string }>;
  signInWithEmail(email: string, password: string): Promise<{ error?: string }>;
  signInWithGoogle(): Promise<{ error?: string }>;
  signOut(): Promise<void>;
  setSyncStatus(status: SyncStatus): void;
  setPendingSyncCount(count: number): void;
}

let initialized = false;
let syncQueue: SyncQueue | null = null;

export const useAuthStore = create<AuthState>()(
  devtools(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      syncStatus: 'idle',
      pendingSyncCount: 0,
      syncError: null,

      async initialize() {
        if (initialized) return;
        initialized = true;

        const supabase = getSupabase();
        if (!supabase) {
          set({ loading: false });
          return;
        }

        // Restore session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          set({ user: session.user, session });
          await setupSync(session.user.id, set);
        }

        // Listen for auth state changes
        supabase.auth.onAuthStateChange(async (event, newSession) => {
          set({ user: newSession?.user ?? null, session: newSession });

          if (event === 'SIGNED_IN' && newSession?.user) {
            await setupSync(newSession.user.id, set);
          } else if (event === 'SIGNED_OUT') {
            setStorageProvider(getIndexedDb());
            if (syncQueue) {
              syncQueue.destroy();
              syncQueue = null;
            }
            // Remove cloud-only ROMs that can't be played locally
            const localDb = getIndexedDb();
            const allRoms = await localDb.listRoms();
            for (const rom of allRoms) {
              if (rom.cloudOnly) {
                await localDb.deleteRom(rom.id);
              }
            }
            set({
              syncStatus: 'idle',
              pendingSyncCount: 0,
              syncError: null,
            });
            useLibraryStore.getState().loadRoms();
          }
        });

        set({ loading: false });
      },

      async signUpWithEmail(email, password) {
        const supabase = getSupabase();
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return {};
      },

      async signInWithEmail(email, password) {
        const supabase = getSupabase();
        if (!supabase) return { error: 'Supabase not configured' };

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return {};
      },

      async signInWithGoogle() {
        const supabase = getSupabase();
        if (!supabase) return { error: 'Supabase not configured' };

        // Must use redirect mode — COOP same-origin blocks popups
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) return { error: error.message };
        return {};
      },

      async signOut() {
        const supabase = getSupabase();
        if (!supabase) return;
        await supabase.auth.signOut();
      },

      setSyncStatus(status) {
        set({ syncStatus: status, syncError: status === 'error' ? get().syncError : null });
      },

      setPendingSyncCount(count) {
        set({ pendingSyncCount: count });
      },
    }),
    { name: 'auth-store' },
  ),
);

async function setupSync(
  userId: string,
  set: (partial: Partial<AuthState>) => void,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const localDb = getIndexedDb();
  syncQueue = new SyncQueue(localDb);

  const syncProvider = new SyncProvider(userId, supabase, localDb, syncQueue);
  setStorageProvider(syncProvider);

  // Set up queue status callback
  syncQueue.setCallbacks(
    (op) => syncProvider.processOp(op),
    (count) => {
      set({ pendingSyncCount: count });
      if (count === 0) {
        set({ syncStatus: 'synced' });
      }
    },
  );

  // Run initial sync
  set({ syncStatus: 'syncing' });
  try {
    await performInitialSync(userId, supabase, localDb, syncQueue);
    const count = await syncQueue.getCount();
    set({
      syncStatus: count > 0 ? 'syncing' : 'synced',
      pendingSyncCount: count,
      syncError: null,
    });
    useLibraryStore.getState().loadRoms();
  } catch (err) {
    console.error('[Auth] Initial sync failed:', err);
    set({
      syncStatus: 'error',
      syncError: err instanceof Error ? err.message : 'Sync failed',
    });
  }
}
