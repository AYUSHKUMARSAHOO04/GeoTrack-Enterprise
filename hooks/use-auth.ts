"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import type { MeResponse } from "@/types";

export function useAuth() {
  const router = useRouter();
  const { user, isLoading, setUser, setLoading, reset, hasPermission } = useAuthStore();

  const fetchMe = useCallback(async () => {
    try {
      const me = await apiClient.get<MeResponse>("/me");
      setUser(me);
    } catch {
      setUser(null);
    }
  }, [setUser]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === "SIGNED_OUT" || !session) {
          reset();
          router.push("/login");
          return;
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await fetchMe();
        }
      })();
    });
    return () => subscription.unsubscribe();
  }, [fetchMe, reset, router]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchMe();
      } else {
        setLoading(false);
      }
    })();
  }, [fetchMe, setLoading]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    reset();
    router.push("/login");
  }, [reset, router]);

  return { user, isLoading, hasPermission, signOut, fetchMe };
}
