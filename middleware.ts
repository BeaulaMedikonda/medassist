import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabasePublicEnv, publicEnv } from "@/lib/env";
import { PATIENT_DEMO_SESSION_COOKIE } from "@/lib/patient-session";
 
const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/patient/clinics",
  "/patient/login",
  "/patient/register",
  "/api/patient/register",
  "/auth",
  "/_next",
  "/favicon.ico",
  "/manifest",
  "/manifest.webmanifest",
];
 
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
 
  if (isPublic) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
 
  const isPatientPortalPath = path === "/patient" || path.startsWith("/patient/");
  const isPatientApiPath = path.startsWith("/api/patient/");
  if ((isPatientPortalPath || isPatientApiPath) && request.cookies.has(PATIENT_DEMO_SESSION_COOKIE)) {
    return NextResponse.next({
      request: { headers: request.headers },
    });
  }
 
  if (!hasSupabasePublicEnv) {
    const url = request.nextUrl.clone();
    url.pathname = isPatientPortalPath ? "/patient/login" : "/login";
    url.searchParams.set("next", path);
    url.searchParams.set("error", "supabase-not-configured");
    return NextResponse.redirect(url);
  }
 
  let response = NextResponse.next({
    request: { headers: request.headers },
  });
 
  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      get: (name: string) => request.cookies.get(name)?.value,
      set: (name: string, value: string, options: CookieOptions) => {
        response.cookies.set({ name, value, ...options });
      },
      remove: (name: string, options: CookieOptions) => {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });
 
  const {
    data: { user },
  } = await supabase.auth.getUser();
 
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = isPatientPortalPath ? "/patient/login" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
 
  return response;
}
 
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
 
 
 
 
