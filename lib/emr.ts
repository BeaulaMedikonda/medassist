import { supabaseAdmin } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

// Generates HD-{clinic}-{YYYYMM}-{seq}, padding seq to 5 digits.
// Uses an admin client so we can scan-and-increment without RLS friction.
export async function generateEmrNumber(): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, "0")}`;
  const prefix = `${serverEnv.emrPrefix}-${serverEnv.emrClinicCode}-${yyyymm}-`;

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("patients")
    .select("emr_number")
    .like("emr_number", `${prefix}%`)
    .order("emr_number", { ascending: false })
    .limit(1);

  if (error) throw error;

  let next = 1;
  const rows = data as Array<{ emr_number: string }> | null;
  if (rows && rows.length > 0) {
    const last = rows[0].emr_number.slice(prefix.length);
    const parsed = parseInt(last, 10);
    if (!Number.isNaN(parsed)) next = parsed + 1;
  }

  return `${prefix}${next.toString().padStart(5, "0")}`;
}
