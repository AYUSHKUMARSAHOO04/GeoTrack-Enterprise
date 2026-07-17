"use client";

import { supabase } from "@/lib/supabase-client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      const { error } = await supabase.auth.getSession();
      if (error) router.push("/login");
      else router.push("/dashboard");
    })();
  }, [router]);
  return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Completing sign in...</p></div>;
}
