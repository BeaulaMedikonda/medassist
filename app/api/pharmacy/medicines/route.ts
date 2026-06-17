import { NextResponse } from "next/server";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { MedicineSearchRow } from "@/lib/pharmacy/medicine-search";

export const runtime = "nodejs";

type AddMedicineBody = {
  name?: string;
  composition?: string;
  manufacturerName?: string;
  type?: string;
  packSizeLabel?: string;
  price?: string;
  prescriptionRequired?: boolean;
};

function normalizeMedicineName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim().replace(/\s+/g, " ") : null;
}

function missingSchemaColumn(message: string) {
  return message.match(/Could not find the '([^']+)' column/)?.[1] || null;
}

export async function POST(req: Request) {
  try {
    const { member } = await requireMember();
    if (!["doctor", "medical_assistant", "admin"].includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as AddMedicineBody;
    const medicineName = normalizeMedicineName(body.name || "");
    if (medicineName.length < 2) {
      return NextResponse.json({ error: "Enter at least 2 characters." }, { status: 400 });
    }

    const admin = supabaseAdmin();
    const existing = await admin
      .from("medicines")
      .select("*")
      .ilike("name", medicineName)
      .limit(1)
      .maybeSingle();

    if (existing.error) {
      return NextResponse.json({ error: existing.error.message }, { status: 500 });
    }
    if (existing.data) {
      return NextResponse.json({ ok: true, medicine: existing.data as MedicineSearchRow });
    }

    const payload: Record<string, unknown> = {
      name: medicineName,
      salt_composition: cleanOptionalText(body.composition),
      manufacturer_name: cleanOptionalText(body.manufacturerName),
      manufacturer: cleanOptionalText(body.manufacturerName),
      type: cleanOptionalText(body.type),
      pack_size_label: cleanOptionalText(body.packSizeLabel),
      pack_size: cleanOptionalText(body.packSizeLabel),
      price: cleanOptionalText(body.price),
      prescription_required: Boolean(body.prescriptionRequired),
      rx_required: Boolean(body.prescriptionRequired),
    };

    let inserted = await admin.from("medicines").insert(payload as never).select("*").single();
    const removedColumns: string[] = [];
    while (inserted.error) {
      const missingColumn = missingSchemaColumn(inserted.error.message);
      if (!missingColumn || !(missingColumn in payload) || missingColumn === "name") break;
      delete payload[missingColumn];
      removedColumns.push(missingColumn);
      inserted = await admin.from("medicines").insert(payload as never).select("*").single();
    }

    if (inserted.error) {
      return NextResponse.json({ error: inserted.error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      medicine: inserted.data as MedicineSearchRow,
      ignoredColumns: removedColumns,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
