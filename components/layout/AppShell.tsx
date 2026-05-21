"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toast";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { initials, cn } from "@/lib/utils";
import type { StaffRole } from "@/types/db";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: StaffRole[];
  match?: (path: string) => boolean;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8M5 10v10h14V10" />
    </svg>
  );
}
function PatientsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20a4.5 4.5 0 016.5-4" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </svg>
  );
}
function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}
function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a4 4 0 008 0V3" />
      <path d="M10 14v2a4 4 0 008 0v-2" />
      <circle cx="18" cy="11" r="2" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="4" width="9" height="11" rx="2" />
      <path d="M4 8v8a2 2 0 002 2h6" />
    </svg>
  );
}

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <HomeIcon />,
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
  {
    href: "/emr",
    label: "Patients",
    icon: <PatientsIcon />,
    match: (p) => p === "/emr" || p.startsWith("/emr/"),
  },
  {
    href: "/appointments",
    label: "Appointments",
    icon: <CalendarIcon />,
    match: (p) => p.startsWith("/appointments"),
    roles: ["medical_assistant", "admin"],
  },
  {
    href: "/settings/team",
    label: "Team",
    icon: <ShieldIcon />,
    roles: ["admin"],
    match: (p) => p.startsWith("/settings/team"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <CogIcon />,
    match: (p) => p === "/settings",
  },
];

export function AppShell({
  userName,
  clinicName,
  inviteCode,
  role,
  email,
  children,
}: {
  userName: string;
  clinicName: string;
  inviteCode: string;
  role: StaffRole;
  email: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "";
  const { push } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      push({ title: "Invite code copied", variant: "success" });
    } catch {
      push({ title: "Could not copy", variant: "error" });
    }
  }

  const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(role));
  const roleLabel =
    role === "medical_assistant"
      ? "Medical Assistant"
      : role === "admin"
        ? "Admin"
        : "Doctor";
  const displayName =
    role === "doctor" ? `Dr. ${userName.split(" ")[0]}` : userName.split(" ")[0];

  const sidebarBody = (
    <>
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow">
          <StethoscopeIcon />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-bold leading-tight text-slate-900 dark:text-ink-100">
            Hello Doctor
          </div>
          <div className="truncate text-[11px] leading-tight text-slate-500 dark:text-ink-500">
            {clinicName}
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="text-eyebrow px-3 pb-2 pt-2">Navigate</div>
        <div className="flex flex-col gap-0.5">
          {visibleNav.map((n) => {
            const active = n.match ? n.match(pathname) : pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn("nav-link", active && "nav-link-active")}
              >
                {n.icon}
                {n.label}
              </Link>
            );
          })}
        </div>

        <div className="text-eyebrow px-3 pb-2 pt-6">Clinic</div>
        <button
          onClick={copyInvite}
          className="group flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-3 py-2.5 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50/50 dark:border-ink-700 dark:bg-ink-900/40 dark:hover:border-brand-700/50 dark:hover:bg-brand-900/20"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Invite code
            </div>
            <div className="truncate font-mono text-sm font-bold text-brand-700 dark:text-brand-300">
              {inviteCode}
            </div>
          </div>
          <span className="shrink-0 text-slate-400 group-hover:text-brand-600 dark:text-ink-500 dark:group-hover:text-brand-300">
            <CopyIcon />
          </span>
        </button>
      </nav>

      <div className="border-t border-slate-200 px-3 py-3 dark:border-ink-800">
        <div className="mb-2">
          <ThemeToggle variant="full" />
        </div>
        <div className="relative">
          <button
            onClick={() => setUserMenu((v) => !v)}
            className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-slate-100 dark:hover:bg-ink-800"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 text-xs font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-ink-100">
                {displayName}
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-ink-500">
                {roleLabel}
              </div>
            </div>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 text-slate-400 dark:text-ink-500">
              <path
                d="M5 13l5-6 5 6"
                stroke="currentColor"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {userMenu ? (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-slate-200 bg-white p-1 shadow-elevated animate-slideUp dark:border-ink-700 dark:bg-ink-900 dark:shadow-deep"
              onMouseLeave={() => setUserMenu(false)}
            >
              <div className="px-3 py-2 text-[11px] text-slate-500 dark:text-ink-500">
                Signed in as <span className="text-slate-700 dark:text-ink-300">{email}</span>
              </div>
              <div className="my-1 border-t border-slate-100 dark:border-ink-800" />
              <Link
                href="/settings"
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-ink-300 dark:hover:bg-ink-800"
                onClick={() => setUserMenu(false)}
              >
                Profile & settings
              </Link>
              {role === "admin" ? (
                <Link
                  href="/settings/team"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-ink-300 dark:hover:bg-ink-800"
                  onClick={() => setUserMenu(false)}
                >
                  Team management
                </Link>
              ) : null}
              <button
                onClick={signOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div className="app-bg min-h-screen bg-slate-50 dark:bg-ink-950">
      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85 md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-ink-200 dark:hover:bg-ink-800"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <StethoscopeIcon />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-ink-100">Hello Doctor</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 text-xs font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
            {initials(userName)}
          </span>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn dark:bg-ink-975/70"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative ml-0 flex h-full w-72 flex-col border-r border-slate-200 bg-white shadow-deep animate-slideUp dark:border-ink-800 dark:bg-ink-900">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-ink-400 dark:hover:bg-ink-800"
              aria-label="Close menu"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
            {sidebarBody}
          </aside>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="no-print fixed left-0 top-0 z-20 hidden h-screen w-[260px] flex-col border-r border-slate-200 bg-white/80 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-900/60 md:flex">
        {sidebarBody}
      </aside>

      {/* Main */}
      <main className="md:pl-[260px]">
        <div className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
