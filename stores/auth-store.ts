"use client";

import { create } from "zustand";
import type { MeResponse, Role } from "@/types";

interface AuthState {
  user: MeResponse | null;
  role: Role | null;
  permissions: string[];
  isLoading: boolean;
  setUser: (user: MeResponse | null) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (perm: string) => boolean;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  permissions: [],
  isLoading: true,
  setUser: (user) =>
    set({
      user,
      role: user?.role ?? null,
      permissions: user?.permissions ?? [],
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (perm) => get().permissions.includes(perm),
  reset: () => set({ user: null, role: null, permissions: [], isLoading: false }),
}));
