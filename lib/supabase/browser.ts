"use client";
 
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv, requireSupabasePublicEnv } from "@/lib/env";
 
let cached: ReturnType<typeof createBrowserClient> | null = null;
 
export function supabaseBrowser() {
  if (cached) return cached;
  requireSupabasePublicEnv();
  cached = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}
 
 