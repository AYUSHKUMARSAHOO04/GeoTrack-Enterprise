"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import { useAuthStore, type Profile } from "@/stores/auth-store";

export function useAuth() {
  const router = useRouter();
  const { user, profile, session, status, setUser, setProfile, setSession, setStatus } =
    useAuthStore();

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (activeSession) {
        setSession(activeSession);
        setUser(activeSession.user);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", activeSession.user.id)
          .maybeSingle();

        if (mounted && profileData) {
          setProfile(profileData as Profile);
        }
      } else {
        setStatus("unauthenticated");
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);

          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", newSession.user.id)
            .maybeSingle();

          if (profileData) {
            setProfile(profileData as Profile);
          }

          if (event === "SIGNED_IN") {
            router.push("/dashboard");
          }
        } else {
          reset();
          if (event === "SIGNED_OUT") {
            router.push("/login");
          }
        }
      })();
    });

    function reset() {
      useAuthStore.getState().reset();
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (params: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }) => {
    const { error } = await supabase.auth.signUp({
      email: params.email,
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName,
          organization_name: params.organizationName,
        },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().reset();
    router.push("/login");
  };

  return {
    user,
    profile,
    session,
    status,
    signIn,
    signUp,
    signOut,
  };
}
