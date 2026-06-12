import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireSupabaseAdminEnv, serverEnv } from "@/lib/env";
 
let cached: ReturnType<typeof createClient> | null = null;
 
export function supabaseAdmin() {
  if (cached) return cached;
  requireSupabaseAdminEnv();
  cached = createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return cached;
}
 
 