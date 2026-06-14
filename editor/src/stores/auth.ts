import { create } from 'zustand';
import { pb } from '../lib/pb';
import type { UserRecord } from '../types';

interface AuthState {
  user: UserRecord | null;
  ready: boolean;
  hydrate: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => {
  // Hydrate listener
  pb.authStore.onChange(() => {
    set({ user: (pb.authStore.model as UserRecord | null) ?? null });
  }, false);

  return {
    user: (pb.authStore.model as UserRecord | null) ?? null,
    ready: false,

    hydrate: () => {
      // PB SDK auto-restores from localStorage on import; we just flip ready.
      set({
        user: (pb.authStore.model as UserRecord | null) ?? null,
        ready: true,
      });
    },

    login: async (email, password) => {
      await pb.collection('users').authWithPassword(email, password);
    },

    register: async (email, password, name) => {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || email.split('@')[0],
        emailVisibility: true,
      });
      await pb.collection('users').authWithPassword(email, password);
    },

    logout: () => {
      pb.authStore.clear();
    },
  };
});
