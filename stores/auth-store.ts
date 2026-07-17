"use client";

import { create } from "zustand";
import type { MeResponse, Role, Permission } from "@/types";

interface AuthState {
  user: MeResponse | null;
  role: Role | null;
  permissions: Permission[];
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
      permissions: (user?.permissions ?? []) as Permission[],
      isLoading: false,
    }),
  setLoading: (isLoading) => set({ isLoading }),
  hasPermission: (perm) => get().permissions.includes(perm as Permission),
  reset: () => set({ user: null, role: null, permissions: [], isLoading: false }),
}));
