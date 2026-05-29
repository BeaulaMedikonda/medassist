//app/api/onboarding/profile/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import type { StaffRole } from "@/types/db";
 
export const runtime = "nodejs";
 
type SignaturePayload = {
  name?: string;
  type?: string;
  data?: string;
};
 
type ProfileBody = {
  clinicId?: string;
  clinicName?: string;
  role?: StaffRole;
  profile?: {
    full_name?: string;
    qualification?: string;
    registration_number?: string;
    clinic_phone?: string;
  };
  signature?: SignaturePayload | null;
};
 
const ROLES = new Set<StaffRole>(["doctor", "medical_assistant", "admin"]);
 
export async function POST(req: Request) {
  try {
    const sb = await supabaseServer();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
 
    const body = (await req.json()) as ProfileBody;
    const clinicId = body.clinicId;
    const role = body.role;
    const fullName = body.profile?.full_name?.trim() || "";
 
    if (!clinicId) {
      return NextResponse.json({ error: "Missing clinic" }, { status: 400 });
    }
    if (!role || !ROLES.has(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (!fullName) {
      return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }
 
    const admin = supabaseAdmin();
    const { data: clinic } = await admin
      .from("clinics")
      .select("id, name")
      .eq("id", clinicId)
      .maybeSingle();
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }
 
    let signatureUrl: string | null = null;
    if (role !== "medical_assistant" && body.signature?.data) {
      signatureUrl = await uploadSignature(user.id, body.signature);
    }
 
    const { error } = await admin.from("doctors").upsert(
      {
        id: user.id,
        full_name: fullName,
        qualification:
          role !== "medical_assistant"
            ? body.profile?.qualification?.trim() || null
            : null,
        registration_number:
          role !== "medical_assistant"
            ? body.profile?.registration_number?.trim() || null
            : null,
        clinic_name: (clinic as { name: string }).name || body.clinicName || null,
        clinic_phone: body.profile?.clinic_phone?.trim() || null,
        signature_url: signatureUrl,
        preferred_language: "en",
        role,
        clinic_id: clinicId,
      } as never,
      { onConflict: "id" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
 
    return NextResponse.json({ ok: true, signature_url: signatureUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Could not save profile";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
 
async function uploadSignature(userId: string, signature: SignaturePayload) {
  const admin = supabaseAdmin();
  const contentType = signature.type || "image/png";
  const ext = extensionFromName(signature.name) || extensionFromContentType(contentType);
  const path = `${userId}/signature-${Date.now()}.${ext}`;
  const bytes = Buffer.from(signature.data || "", "base64");
 
  if (bytes.length === 0) {
    throw new Error("Signature image is empty");
  }
 
  const { error } = await admin.storage
    .from(serverEnv.supabaseAssetsBucket)
    .upload(path, bytes, {
      cacheControl: "3600",
      contentType,
      upsert: true,
    });
  if (error) throw new Error(error.message);
  return path;
}
 
function extensionFromName(name?: string) {
  const ext = name?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return ext || null;
}
 
function extensionFromContentType(contentType: string) {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  return "png";
}
 
 