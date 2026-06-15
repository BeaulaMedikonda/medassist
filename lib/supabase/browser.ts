"use client";
 
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, requireSupabasePublicEnv } from "@/lib/env";
 
let cached: ReturnType<typeof createBrowserClient> | null = null;

export function clearMalformedSupabaseAuthStorage() {
  if (typeof window === "undefined") return;

  for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) continue;

    const value = window.localStorage.getItem(key) || "";
    if (/[\r\n]|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY/i.test(value)) {
      window.localStorage.removeItem(key);
    }
  }
}
 
export function supabaseBrowser() {
  if (cached) return cached;
  requireSupabasePublicEnv();
  cached = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}
 
 
