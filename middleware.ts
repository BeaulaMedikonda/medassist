import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
 
const PUBLIC_PATHS = [
  "/login",
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
    const isPatientPortalPath = path === "/patient" || path.startsWith("/patient/");
    url.pathname = isPatientPortalPath ? "/patient/login" : "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
 
  return response;
}
 
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cron|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
 
 
