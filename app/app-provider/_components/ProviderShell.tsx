"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { cn, initials } from "@/lib/utils";
import { NAV_ALLOWED, type PlatformAdmin, type PlatformRole } from "@/lib/provider/access";
import { supabaseBrowser } from "@/lib/supabase/browser";

const ALL_NAV = [
  { href: "/app-provider", label: "Dashboard", short: "DB" },
  { href: "/app-provider/clinics", label: "Clinics", short: "CL" },
  { href: "/app-provider/usage", label: "Usage & Cost", short: "UC" },
  { href: "/app-provider/billing", label: "Billing", short: "BI" },
  { href: "/app-provider/features", label: "Feature Flags", short: "FF" },
  { href: "/app-provider/audit", label: "Audit", short: "AU" },
  { href: "/app-provider/system", label: "System", short: "SY" },
  { href: "/app-provider/team", label: "Team", short: "TM" },
];

function navForRole(role: PlatformRole) {
  return ALL_NAV.filter((item) => {
    const allowed = NAV_ALLOWED[item.href] as PlatformRole[] | undefined;
    return !allowed || allowed.includes(role);
  });
}

function isActive(pathname: string, href: string) {
  if (href === "/app-provider") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProviderShell({
  admin,
  children,
}: {
  admin: PlatformAdmin;
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const NAV = useMemo(() => navForRole(admin.role), [admin.role]);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    NAV.forEach((item) => router.prefetch(item.href));
  }, [NAV, router]);

  function handleNavIntent(href: string, active: boolean) {
    setPendingHref(active ? null : href);
  }

  async function signOut() {
    setSigningOut(true);
    await supabaseBrowser().auth.signOut();
    router.replace("/login?next=%2Fapp-provider");
    router.refresh();
  }

  return (
    <div className="app-bg min-h-screen bg-slate-50 text-slate-950">
      <aside className="no-print fixed left-0 top-0 hidden h-screen w-[296px] flex-col border-r border-white/10 bg-[#062b3d] md:flex">
        <div className="px-5 pb-5 pt-6">
          <Link href="/app-provider" className="flex items-center gap-3">
            <div className="brand-mark h-11 w-11 rounded-lg text-sm font-black">
              MA
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-extrabold text-white">MedAssist</div>
              <div className="truncate text-xs font-semibold uppercase tracking-wide text-[#91a7b8]">
                App Provider Console
              </div>
            </div>
          </Link>
        </div>

        <div className="px-5 pb-3">
          <div className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Platform
            </div>
            <div className="mt-1 truncate text-xs font-semibold text-[#91a7b8]">
              Clinics, billing, usage, controls
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            const pending = pendingHref === item.href && !active;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-busy={pending}
                onClick={() => handleNavIntent(item.href, active)}
                className={cn(
                  "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#b7c7c2] transition hover:bg-white/[0.07] hover:text-white",
                  active && "nav-link-active text-white",
                  pending && "bg-white/[0.055] text-white",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-[10px] font-black text-[#93aaa3] transition group-hover:bg-white/[0.10] group-hover:text-white",
                    active && "bg-cyan-200 text-[#062b3d]",
                    pending && "bg-cyan-200/20 text-cyan-100",
                  )}
                >
                  {item.short}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {pending ? <Spinner className="h-3.5 w-3.5 shrink-0 text-cyan-200" /> : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="rounded-lg border border-white/10 bg-white/[0.05] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-black text-teal-300 ring-1 ring-teal-500/30">
                {initials(admin.full_name || admin.email)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">
                  {admin.full_name || admin.email}
                </div>
                <div className="truncate text-[11px] font-semibold uppercase tracking-wide text-[#91a7b8]">
                  {admin.role.replace("platform_", "")}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="mt-3 flex h-9 w-full items-center justify-center rounded-md border border-white/10 bg-white/[0.06] text-xs font-black text-cyan-100 transition hover:bg-white/[0.10] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </div>
      </aside>

      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href="/app-provider" className="text-sm font-black text-slate-950">
          MedAssist app provider
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 disabled:opacity-60"
        >
          {signingOut ? "..." : "Logout"}
        </button>
      </header>

      <main className="md:pl-[296px]">
        <div className="mx-auto w-full max-w-[1520px] px-4 pb-20 pt-6 sm:px-8 lg:px-10">
          <div className="mb-5 flex gap-2 overflow-x-auto md:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => handleNavIntent(item.href, isActive(pathname, item.href))}
                className={cn(
                  "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600",
                  isActive(pathname, item.href) && "border-cyan-300 bg-cyan-50 text-cyan-800",
                  pendingHref === item.href && !isActive(pathname, item.href) && "border-cyan-300 bg-cyan-50 text-cyan-800",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
          {pendingHref ? (
            <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-cyan-100/40">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_18px_rgba(34,211,238,0.65)]" />
            </div>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
