import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function findAuthUserByEmail(
  admin: ReturnType<typeof supabaseAdmin>,
  email: string,
) {
  let page = 1;

  while (page <= 20) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      console.warn("[password-reset] auth user lookup skipped", error.message);
      return null;
    }

    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (found) return found;

    if (data.users.length < 1000) break;
    page += 1;
  }

  return null;
}

async function hasRowForEmail(
  admin: ReturnType<typeof supabaseAdmin>,
  table: "doctors" | "platform_admins",
  email: string,
  role?: string,
) {
  let query = admin
    .from(table)
    .select("id")
    .ilike("email", email);

  if (table === "doctors" && role) {
    query = query.eq("role", role);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    console.warn(`[password-reset] ${table} lookup skipped`, error.message);
    return false;
  }

  return (data?.length || 0) > 0;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      role?: unknown;
    };
    const email = cleanEmail(body.email);
    const role = typeof body.role === "string" ? body.role : "";

    if (!email || !isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    const staffRoles = new Set(["medical_assistant", "doctor", "admin"]);
    if (role && role !== "provider" && !staffRoles.has(role)) {
      return NextResponse.json(
        { ok: false, error: "Choose a valid role." },
        { status: 400 },
      );
    }

    const admin = supabaseAdmin();
    let eligible = false;

    if (role === "provider") {
      eligible = await hasRowForEmail(admin, "platform_admins", email);
    } else if (role === "admin") {
      const [adminExists, authUser] = await Promise.all([
        hasRowForEmail(admin, "doctors", email, role),
        findAuthUserByEmail(admin, email),
      ]);
      eligible = adminExists || Boolean(authUser);
    } else if (staffRoles.has(role)) {
      eligible = await hasRowForEmail(admin, "doctors", email, role);
    } else {
      const [staffExists, providerExists, authUser] = await Promise.all([
        hasRowForEmail(admin, "doctors", email),
        hasRowForEmail(admin, "platform_admins", email),
        findAuthUserByEmail(admin, email),
      ]);
      eligible = staffExists || providerExists || Boolean(authUser);
    }

    return NextResponse.json({ ok: true, eligible });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not check email.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
