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

export type AddMedicineInput = {
  name: string;
  composition?: string;
  manufacturerName?: string;
  type?: string;
  packSizeLabel?: string;
  price?: string;
  prescriptionRequired?: boolean;
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

export async function addMedicineToMaster(input: AddMedicineInput) {
  const medicineName = input.name.trim().replace(/\s+/g, " ");
  if (medicineName.length < 2) {
    return { data: null as MedicineSearchRow | null, error: "Enter at least 2 characters." };
  }

  try {
    const response = await fetch("/api/pharmacy/medicines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, name: medicineName }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      medicine?: MedicineSearchRow;
      error?: string;
    };

    if (!response.ok) {
      return { data: null as MedicineSearchRow | null, error: result.error || "Medicine could not be added." };
    }

    return { data: result.medicine || null, error: "" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Medicine could not be added.";
    return { data: null as MedicineSearchRow | null, error: msg };
  }
}
