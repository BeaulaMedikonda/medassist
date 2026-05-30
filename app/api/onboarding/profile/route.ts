import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import type { StaffRole } from "@/types/db";

export const runtime = "nodejs";

const ACTIVE_CLINIC_COOKIE = "active_clinic_id";
const ACTIVE_MEMBER_COOKIE = "active_member_id";

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
    const clinicId = body.clinicId?.trim();
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
    const { data: clinic, error: clinicError } = await admin
      .from("clinics")
      .select("id, name, address, phone")
      .eq("id", clinicId)
      .maybeSingle();
    if (clinicError) {
      return NextResponse.json({ error: clinicError.message }, { status: 500 });
    }
    if (!clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    let signatureUrl: string | null = null;
    if (role !== "medical_assistant" && body.signature?.data) {
      signatureUrl = await uploadSignature(user.id, body.signature);
    }

    const clinicRow = clinic as {
      name: string;
      address: string | null;
      phone: string | null;
    };

    const profileRow = {
      id: user.id,
      auth_user_id: user.id,
      email: user.email || null,
      full_name: fullName,
      qualification:
        role !== "medical_assistant"
          ? body.profile?.qualification?.trim() || null
          : null,
      registration_number:
        role !== "medical_assistant"
          ? body.profile?.registration_number?.trim() || null
          : null,
      clinic_name: clinicRow.name || body.clinicName || null,
      clinic_address: clinicRow.address || null,
      clinic_phone: body.profile?.clinic_phone?.trim() || clinicRow.phone || null,
      signature_url: signatureUrl,
      preferred_language: "en",
      role,
      clinic_id: clinicId,
    };

    const { data: member, error } = await admin
      .from("doctors")
      .upsert(profileRow as never, { onConflict: "id" })
      .select("id")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const memberId = (member as { id?: string } | null)?.id || user.id;
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_CLINIC_COOKIE, clinicId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    cookieStore.set(ACTIVE_MEMBER_COOKIE, memberId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });

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
