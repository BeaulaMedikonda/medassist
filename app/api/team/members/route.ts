
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabase/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

import type { Doctor } from "@/types/db";
 
export const runtime = "nodejs";
 
const ALLOWED_ROLES = ["doctor", "medical_assistant", "admin"] as const;
 
type CreateBody = {

  email?: string;

  password?: string;

  full_name?: string;

  role?: (typeof ALLOWED_ROLES)[number];

  clinic_id?: string;

  qualification?: string;

  registration_number?: string;

};
 
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

      throw new Error(error.message);

    }
 
    const found = data.users.find(

      (u) => u.email?.toLowerCase() === email.toLowerCase(),

    );
 
    if (found) return found;
 
    if (data.users.length < 1000) break;

    page += 1;

  }
 
  return null;

}
 
export async function POST(req: Request) {

  try {

    const sb = await supabaseServer();
 
    const {

      data: { user },

    } = await sb.auth.getUser();
 
    if (!user) {

      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    }
 
    const { data: adminMemberships, error: meErr } = await sb

      .from("doctors")

      .select("*")

      .eq("auth_user_id", user.id)

      .eq("role", "admin")

      .not("clinic_id", "is", null);
 
    if (meErr) {

      return NextResponse.json({ error: meErr.message }, { status: 500 });

    }
 
    const adminRows = (adminMemberships as Doctor[] | null) || [];
 
    if (adminRows.length === 0) {

      return NextResponse.json(

        { error: "Only clinic admins can add team members" },

        { status: 403 },

      );

    }
 
    const body = (await req.json()) as CreateBody;
 
    const email = (body.email || "").trim().toLowerCase();

    const password = body.password || "";

    const full_name = (body.full_name || "").trim();

    const role = body.role;

    const requestedClinicId = (body.clinic_id || "").trim();

    const qualification = (body.qualification || "").trim();

    const registration_number = (body.registration_number || "").trim();
 
    if (!email) {

      return NextResponse.json({ error: "Email required" }, { status: 400 });

    }
 
    if (!full_name) {

      return NextResponse.json({ error: "Full name required" }, { status: 400 });

    }
 
    if (!role || !ALLOWED_ROLES.includes(role)) {

      return NextResponse.json({ error: "Valid role required" }, { status: 400 });

    }

    const targetClinicId = requestedClinicId || adminRows[0]?.clinic_id;

    if (!targetClinicId) {

      return NextResponse.json({ error: "Admin has no clinic" }, { status: 400 });

    }

    const meRow = adminRows.find((row) => row.clinic_id === targetClinicId);

    if (!meRow) {

      return NextResponse.json(

        { error: "You can only add members to clinics where you are an admin" },

        { status: 403 },

      );

    }
 
    const admin = supabaseAdmin();
 
    let authUserId: string;

    let createdNewAuthUser = false;
 
    // 1. Check whether Auth user already exists.

    const existingUser = await findAuthUserByEmail(admin, email);
 
    if (existingUser) {

      // Existing email: do not create Supabase Auth user again.

      authUserId = existingUser.id;

      if (password) {
        if (password.length < 8) {
          return NextResponse.json(
            { error: "Password must be at least 8 characters" },
            { status: 400 },
          );
        }

        const { error: updatePasswordErr } =
          await admin.auth.admin.updateUserById(authUserId, {
            password,
            user_metadata: {
              ...(existingUser.user_metadata || {}),
              full_name,
            },
          });

        if (updatePasswordErr) {
          return NextResponse.json(
            { error: updatePasswordErr.message },
            { status: 500 },
          );
        }
      }

    } else {

      // New email: password is required to create Auth user.

      if (password.length < 8) {

        return NextResponse.json(

          { error: "Password must be at least 8 characters" },

          { status: 400 },

        );

      }
 
      const { data: created, error: createErr } =

        await admin.auth.admin.createUser({

          email,

          password,

          email_confirm: true,

          user_metadata: { full_name },

        });
 
      if (createErr || !created?.user) {

        return NextResponse.json(

          { error: createErr?.message || "Could not create auth user" },

          { status: 500 },

        );

      }
 
      authUserId = created.user.id;

      createdNewAuthUser = true;

    }
 
    let clinicName = meRow.clinic_name || null;

    if (!clinicName) {

      const { data: clinic, error: clinicErr } = await admin

        .from("clinics")

        .select("name")

        .eq("id", targetClinicId)

        .maybeSingle();

      if (clinicErr) {

        return NextResponse.json({ error: clinicErr.message }, { status: 500 });

      }

      clinicName = (clinic as { name?: string } | null)?.name || null;

    }
 
    // 2. Check duplicate by 5 fields:

    // clinic_id + clinic_name + full_name + role + email

    const duplicateQuery = admin

      .from("doctors")

      .select("id, auth_user_id, email, full_name, role, clinic_id, clinic_name")

      .eq("clinic_id", targetClinicId)

      .eq("role", role)

      .ilike("email", email)

      .ilike("full_name", full_name);
 
    if (clinicName) {

      duplicateQuery.ilike("clinic_name", clinicName);

    } else {

      duplicateQuery.is("clinic_name", null);

    }
 
    const { data: existingSameStaff, error: existingErr } =

      await duplicateQuery.maybeSingle();
 
    if (existingErr) {

      return NextResponse.json({ error: existingErr.message }, { status: 500 });

    }
 
    if (existingSameStaff) {
      const { data: repairedMember, error: repairErr } = await admin
        .from("doctors")
        .update({
          auth_user_id: authUserId,
          email,
          clinic_id: targetClinicId,
          clinic_name: clinicName,
        } as never)
        .eq("id", (existingSameStaff as { id: string }).id)
        .select("id, auth_user_id, email, full_name, role, clinic_id, clinic_name")
        .single();

      if (repairErr) {
        if (createdNewAuthUser) {
          await admin.auth.admin.deleteUser(authUserId).catch(() => {});
        }

        return NextResponse.json({ error: repairErr.message }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        member: repairedMember,
        reused_existing_auth_user: !createdNewAuthUser,
        password_updated: Boolean(existingUser && password),
        already_existed: true,
      });
    }
 
    // 3. Insert staff row into doctors table.

    // DO NOT set id: authUserId.

    // id should auto-generate. auth_user_id stores the Supabase login user id.

    const insert: Record<string, unknown> = {

      auth_user_id: authUserId,

      email,

      full_name,

      role,

      clinic_id: targetClinicId,

      clinic_name: clinicName,

      qualification: role !== "medical_assistant" ? qualification || null : null,

      registration_number:

        role !== "medical_assistant" ? registration_number || null : null,

      preferred_language: "en",

    };
 
    const { data: insertedMember, error: rowErr } = await admin

      .from("doctors")

      .insert(insert as never)

      .select("id, auth_user_id, email, full_name, role, clinic_id, clinic_name")

      .single();
 
    if (rowErr) {

      // Rollback only if we created a brand-new auth user.

      // If user already existed, do not delete their Auth account.

      if (createdNewAuthUser) {

        await admin.auth.admin.deleteUser(authUserId).catch(() => {});

      }
 
      return NextResponse.json({ error: rowErr.message }, { status: 500 });

    }
 
    return NextResponse.json({

      ok: true,

      member: insertedMember,

      reused_existing_auth_user: !createdNewAuthUser,

      password_updated: Boolean(existingUser && password),

    });

  } catch (err: unknown) {

    const msg = err instanceof Error ? err.message : "Unknown error";

    return NextResponse.json({ error: msg }, { status: 500 });

  }

}
 
