import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const redirectUrl = new URL(next, url.origin);

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "reset_link_invalid");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(redirectUrl);
}
