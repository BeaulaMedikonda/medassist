"use client";

import { supabaseBrowser } from "@/lib/supabase/browser";

export type MedicineSearchRow = {
  id: string;
  name: string;
  generic_name?: string | null;
  manufacturer_name?: string | null;
  manufacturer?: string | null;
  type?: string | null;
  pack_size_label?: string | null;
  pack_size?: string | null;
  short_composition1?: string | null;
  short_composition2?: string | null;
  salt_composition?: string | null;
  composition?: string | null;
  price?: number | string | null;
  prescription_required?: boolean | null;
  rx_required?: boolean | null;
};

export const pharmacyDash = "-";

export function medicineComposition(medicine: MedicineSearchRow) {
  return (
    medicine.salt_composition ||
    medicine.composition ||
    [medicine.short_composition1, medicine.short_composition2].filter(Boolean).join(" + ") ||
    medicine.generic_name ||
    pharmacyDash
  );
}

export async function searchMedicines(term: string, limit = 20) {
  const q = term.trim();
  if (q.length < 2) return { data: [] as MedicineSearchRow[], error: "" };

  const sb = supabaseBrowser();

  const prefix = await sb
    .from("medicines")
    .select("*")
    .ilike("name", `${q}%`)
    .limit(limit);

  if (prefix.error) return { data: [] as MedicineSearchRow[], error: prefix.error.message };
  if ((prefix.data || []).length > 0) return { data: prefix.data as MedicineSearchRow[], error: "" };

  const contains = await sb
    .from("medicines")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(limit);

  if (contains.error) return { data: [] as MedicineSearchRow[], error: contains.error.message };
  return { data: (contains.data || []) as MedicineSearchRow[], error: "" };
}
