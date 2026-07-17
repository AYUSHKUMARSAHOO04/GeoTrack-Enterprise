"use client";

import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  organization_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  role: "super_admin" | "admin" | "manager" | "operator" | "viewer";
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

type AuthStatus = "authenticated" | "unauthenticated" | "loading";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  status: AuthStatus;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setSession: (session: Session | null) => void;
  setStatus: (status: AuthStatus) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  session: null,
  status: "loading",
  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),
  setProfile: (profile) => set({ profile }),
  setSession: (session) => set({ session }),
  setStatus: (status) => set({ status }),
  reset: () =>
    set({
      user: null,
      profile: null,
      session: null,
      status: "unauthenticated",
    }),
}));
