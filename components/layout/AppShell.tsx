"use client";
 
// import Link from "next/link";
// import { usePathname, useRouter } from "next/navigation";
// import { useEffect, useState } from "react";
// import { supabaseBrowser } from "@/lib/supabase/browser";
// import { useToast } from "@/components/ui/Toast";
// import { ThemeToggle } from "@/components/theme/ThemeToggle";
// import { initials, cn } from "@/lib/utils";
// import type { StaffRole } from "@/types/db";
 
// type NavItem = {
//   href: string;
//   label: string;
//   icon: React.ReactNode;
//   roles?: StaffRole[];
//   match?: (path: string) => boolean;
//   placeholder?: boolean;
// };
 
// // ─── Icons ────────────────────────────────────────────────────────────────────
 
// function StethoscopeIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M6 3v6a4 4 0 008 0V3" />
//       <path d="M10 14v2a4 4 0 008 0v-2" />
//       <circle cx="18" cy="11" r="2" />
//     </svg>
//   );
// }
 
// function HomeIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M3 11l9-8 9 8M5 10v10h5v-5h4v5h5V10" />
//     </svg>
//   );
// }
 
// function IntakeQueueIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="8" y="2" width="8" height="4" rx="1" />
//       <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
//       <path d="M9 12h6M9 16h4" />
//     </svg>
//   );
// }

// function EmrReviewIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#93a4b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="7" y="4" width="10" height="17" rx="2" />
//       <path d="M10 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
//       <path d="M10 11h4M10 15h3" />
//     </svg>
//   );
// }
 
// function PatientsIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="9" cy="8" r="3.5" />
//       <path d="M2.5 20a6.5 6.5 0 0113 0" />
//       <circle cx="17" cy="9" r="2.5" />
//       <path d="M15 20a4.5 4.5 0 016.5-4" />
//     </svg>
//   );
// }
 
// function CalendarIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="3" y="5" width="18" height="16" rx="2" />
//       <path d="M8 3v4M16 3v4M3 10h18" />
//     </svg>
//   );
// }

// function BillingIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M7 4h10a2 2 0 012 2v15l-3-1.5L13 21l-3-1.5L7 21l-2-1V6a2 2 0 012-2z" />
//       <path d="M9 8h6M9 12h6M9 16h3" />
//     </svg>
//   );
// }
 
// function PatientPortalIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="9" />
//       <path d="M2.5 12h19" />
//       <path d="M12 2.5C9.5 6 8 9 8 12s1.5 6 4 9.5M12 2.5C14.5 6 16 9 16 12s-1.5 6-4 9.5" />
//     </svg>
//   );
// }
 
// function PharmacyIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M10.5 3.5a5 5 0 017 7l-7 7a5 5 0 01-7-7l7-7z" />
//       <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
//     </svg>
//   );
// }
 
// function CogIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="3" />
//       <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
//     </svg>
//   );
// }
 
// function ShieldIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
//     </svg>
//   );
// }

// function InteropIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="6" cy="12" r="2.5" />
//       <circle cx="18" cy="6" r="2.5" />
//       <circle cx="18" cy="18" r="2.5" />
//       <path d="M8.2 11l7.6-4M8.2 13l7.6 4" />
//     </svg>
//   );
// }

// function ReportingIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M4 20V4" />
//       <rect x="7" y="12" width="3" height="6" rx="0.5" />
//       <rect x="12" y="8" width="3" height="10" rx="0.5" />
//       <rect x="17" y="5" width="3" height="13" rx="0.5" />
//     </svg>
//   );
// }
 
// function GlobeIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="9" />
//       <path d="M2.5 12h19" />
//       <path d="M12 2.5C9.5 6 8 9 8 12s1.5 6 4 9.5M12 2.5C14.5 6 16 9 16 12s-1.5 6-4 9.5" />
//     </svg>
//   );
// }

// function TranslateIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M4 5h7M7.5 5v1.5c0 3-2 5.5-4 6.5M5 9c.5 2 2.5 3.8 4.5 4.5" />
//       <path d="M11 19l3.5-8 3.5 8M12.3 16h4.4" />
//     </svg>
//   );
// }
 
// function FaxIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <rect x="2" y="8" width="20" height="13" rx="2" />
//       <path d="M7 8V5a1 1 0 011-1h8a1 1 0 011 1v3" />
//       <circle cx="17.5" cy="11.5" r="1" fill="#a78bfa" stroke="none" />
//       <rect x="7" y="14" width="10" height="4" rx="1" />
//     </svg>
//   );
// }
 
// // ─── Nav definition ───────────────────────────────────────────────────────────
 
//  const NAV: NavItem[] = [
//   {
//     href: "/dashboard",
//     label: "Dashboard",
//     icon: <HomeIcon />,
//     roles: ["doctor", "medical_assistant"],
//     match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
//   },
//   {
//     href: "/emr/intake",
//     label: "Intake Queue",
//     icon: <IntakeQueueIcon />,
//     roles: ["medical_assistant"],
//     match: (p) => p === "/emr/intake" || p.startsWith("/emr/intake/"),
//   },
//   {
//     href: "/emr",
//     label: "Patients",
//     icon: <PatientsIcon />,
//     match: (p) => p === "/emr",
//   },
//   { href: "#emr-review", label: "EMR Review", icon: <EmrReviewIcon />, roles: ["doctor"], placeholder: true },
//   {
//     href: "/appointments",
//     label: "Appointments",
//     icon: <CalendarIcon />,
//     match: (p) => p.startsWith("/appointments"),
//     roles: ["doctor", "medical_assistant", "admin"],
//   },
//   {
//     href: "/dashboard",
//     label: "Admin",
//     icon: <ShieldIcon />,
//     roles: ["admin"],
//     match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
//   },
//   {
//     href: "/settings",
//     label: "Settings",
//     icon: <CogIcon />,
//     match: (p) => p === "/settings",
//   },
//   { href: "#billing", label: "Billing", icon: <BillingIcon />, roles: ["admin"], placeholder: true },
//   { href: "#patient-portal", label: "Patient Portal", icon: <PatientPortalIcon />, roles: ["doctor", "admin"], placeholder: true },
//   { href: "#interop", label: "Interop", icon: <InteropIcon />, roles: ["doctor", "admin"], placeholder: true },
//   { href: "#reporting", label: "Reporting", icon: <ReportingIcon />, roles: ["doctor", "admin"], placeholder: true },
//   { href: "#pharmacy", label: "Pharmacy", icon: <PharmacyIcon />, roles: ["doctor", "admin"], placeholder: true },
//   {
//     href: "/patient-portal",
//     label: "Patient Portal",
//     icon: <PatientPortalIcon />,
//     roles: ["medical_assistant"],
//     match: (p) => p.startsWith("/patient-portal"),
//   },
//   {
//     href: "/pharmacy",
//     label: "Pharmacy",
//     icon: <PharmacyIcon />,
//     roles: ["medical_assistant"],
//     match: (p) => p.startsWith("/pharmacy"),
//   },
// ];
 
// // ─── Component ────────────────────────────────────────────────────────────────
 
// export function AppShell({
//   userName,
//   clinicName,
//   inviteCode,
//   role,
//   email,
//   children,
// }: {
//   userName: string;
//   clinicName: string;
//   inviteCode: string;
//   role: StaffRole;
//   email: string;
//   children: React.ReactNode;
// }) {
//   const router = useRouter();
//   const pathname = usePathname() || "";
//   const { push } = useToast();
//   const [drawerOpen, setDrawerOpen] = useState(false);
//   const [userMenu, setUserMenu] = useState(false);
 
//   useEffect(() => {
//     setDrawerOpen(false);
//   }, [pathname]);
 
//   async function signOut() {
//     await supabaseBrowser().auth.signOut();
//     router.replace("/login");
//     router.refresh();
//   }
 
//   async function copyInvite() {
//     try {
//       await navigator.clipboard.writeText(inviteCode);
//       push({ title: "Invite code copied", variant: "success" });
//     } catch {
//       push({ title: "Could not copy", variant: "error" });
//     }
//   }
 
//   const visibleNav = NAV.filter((n) => !n.roles || n.roles.includes(role));
//   const roleLabel =
//     role === "medical_assistant"
//       ? "Medical Assistant"
//       : role === "admin"
//         ? "Admin"
//         : "Doctor";
//   const displayName =
//     role === "doctor" ? `Dr. ${userName.split(" ")[0]}` : userName;
 
//   const sidebarBody = (
//     <>
//       {/* Logo */}
//       <div className="flex items-center gap-3 px-5 pb-8 pt-7">
//         <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-[0_12px_28px_rgba(14,165,164,0.28)]">
//           <StethoscopeIcon />
//         </div>
//         <div className="min-w-0">
//           <div className="truncate text-base font-bold leading-tight text-white">
//             MedAssist
//           </div>
//           <div className="truncate text-sm leading-tight text-[#91a7b8]">
//             {clinicName}
//           </div>
//         </div>
//       </div>
 
//       {/* Navigation */}
//       <nav className="flex-1 overflow-y-auto px-3">
//         <div className="px-3 pb-3 pt-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7890a2]">
//           Navigate
//         </div>
//         <div className="flex flex-col gap-0.5">
//           {visibleNav.map((n) => {
//             if (n.placeholder) {
//               return (
//                 <button
//                   key={n.label}
//                   type="button"
//                   title="Coming soon"
//                   className="nav-link w-full cursor-default text-left"
//                 >
//                   <span className="flex min-w-0 items-center gap-3">
//                     {n.icon}
//                     <span className="truncate">{n.label}</span>
//                   </span>
//                   <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
//                     Soon
//                   </span>
//                 </button>
//               );
//             }
//             const active = n.match ? n.match(pathname) : pathname === n.href;
//             return (
//               <Link
//                 key={n.label}
//                 href={n.href}
//                 className={cn("nav-link", active && "nav-link-active")}
//               >
//                 <span className="flex min-w-0 items-center gap-3">
//                   {n.icon}
//                   <span className="truncate">{n.label}</span>
//                 </span>
//               </Link>
//             );
//           })}
//         </div>
//       </nav>
 
//       {/* Bottom items */}
//       <div className="px-3 pb-2">
//         {role === "doctor" ? (
//           <div className="mb-4 flex flex-col gap-0.5 border-t border-white/10 pt-4">
//             <button className="nav-link w-full cursor-default text-left" title="Coming soon">
//               <span className="flex min-w-0 items-center gap-3">
//                 <TranslateIcon />
//                 <span className="truncate">Language</span>
//               </span>
//               <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
//                 Soon
//               </span>
//             </button>
//             <button className="nav-link w-full cursor-default text-left" title="Coming soon">
//               <span className="flex min-w-0 items-center gap-3">
//                 <FaxIcon />
//                 <span className="truncate">Fax</span>
//               </span>
//               <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
//                 Soon
//               </span>
//             </button>
//           </div>
//         ) : null}
 
//         {/* MA-only: Language + Fax */}
//         {role === "medical_assistant" ? (
//           <div className="flex flex-col gap-0.5">
//             <button className="nav-link w-full cursor-default text-left" title="Coming soon">
//               <span className="flex min-w-0 items-center gap-3">
//                 <TranslateIcon />
//                 <span className="truncate">Language</span>
//               </span>
//               <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
//                 Soon
//               </span>
//             </button>
//             <button className="nav-link w-full cursor-default text-left" title="Coming soon">
//               <span className="flex min-w-0 items-center gap-3">
//                 <FaxIcon />
//                 <span className="truncate">Fax</span>
//               </span>
//               <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
//                 Soon
//               </span>
//             </button>
//           </div>
//         ) : null}
//       </div>
 
//       {/* User profile */}
//       <div className="border-t border-white/10 px-3 py-3">
//         <div className="px-3 pb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7890a2]">
//           Clinic
//         </div>
//         <div className="mb-4">
//           <ThemeToggle variant="full" />
//         </div>
//         <div className="relative">
//           <button
//             onClick={() => setUserMenu((v) => !v)}
//             className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/10"
//           >
//             <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-400 ring-1 ring-teal-500/30">
//               {initials(userName)}
//             </span>
//             <div className="min-w-0 flex-1">
//               <div className="truncate text-sm font-semibold text-white">
//                 {displayName}
//               </div>
//               <div className="truncate text-[11px] text-slate-400">
//                 {roleLabel}
//               </div>
//             </div>
//             <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
//               <path d="M5 8l5 5 5-5" />
//             </svg>
//           </button>
 
//           {userMenu ? (
//             <div
//               className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-white/10 bg-[#243044] p-1 shadow-deep animate-slideUp"
//               onMouseLeave={() => setUserMenu(false)}
//             >
//               <div className="px-3 py-2 text-[11px] text-slate-500">
//                 Signed in as{" "}
//                 <span className="text-slate-300">{email}</span>
//               </div>
//               <div className="my-1 border-t border-white/10" />
//               {role === "admin" ? (
//                 <button
//                   onClick={() => {
//                     void copyInvite();
//                     setUserMenu(false);
//                   }}
//                   className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
//                 >
//                   <span>Copy invite code</span>
//                   <span className="font-mono text-[11px] text-brand-300">
//                     {inviteCode}
//                   </span>
//                 </button>
//               ) : null}
//               <Link
//                 href="/settings"
//                 className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
//                 onClick={() => setUserMenu(false)}
//               >
//                 Profile & settings
//               </Link>
//               {role === "admin" ? (
//                 <Link
//                   href="/settings/team"
//                   className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
//                   onClick={() => setUserMenu(false)}
//                 >
//                   Team management
//                 </Link>
//               ) : null}
//               <button
//                 onClick={signOut}
//                 className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-500/10"
//               >
//                 Sign out
//               </button>
//             </div>
//           ) : null}
//         </div>
//       </div>
//     </>
//   );
 
//   return (
//     <div className="app-bg min-h-screen bg-slate-50 dark:bg-ink-950">
//       {/* Mobile top bar */}
//       <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/85 md:hidden">
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setDrawerOpen(true)}
//             className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-ink-200 dark:hover:bg-ink-800"
//             aria-label="Open menu"
//           >
//             <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
//               <path d="M4 7h16M4 12h16M4 17h16" />
//             </svg>
//           </button>
//           <Link href="/dashboard" className="flex items-center gap-2">
//             <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-brand-500 to-brand-700 text-white">
//               <StethoscopeIcon />
//             </div>
//             <span className="text-sm font-bold text-slate-900 dark:text-ink-100">MedAssist</span>
//           </Link>
//         </div>
//         <div className="flex items-center gap-1">
//           <ThemeToggle />
//           <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-600">
//             {initials(userName)}
//           </span>
//         </div>
//       </header>
 
//       {/* Mobile drawer */}
//       {drawerOpen ? (
//         <div className="no-print fixed inset-0 z-40 md:hidden">
//           <div
//             className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
//             onClick={() => setDrawerOpen(false)}
//           />
//           <aside className="relative ml-0 flex h-full w-[310px] max-w-[86vw] flex-col bg-[#062b3d] shadow-deep animate-slideUp">
//             <button
//               onClick={() => setDrawerOpen(false)}
//               className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
//               aria-label="Close menu"
//             >
//               <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
//                 <path d="M5 5l10 10M15 5L5 15" />
//               </svg>
//             </button>
//             {sidebarBody}
//           </aside>
//         </div>
//       ) : null}
 
//       {/* Desktop sidebar */}
//       <aside className="no-print fixed left-0 top-0 z-20 hidden h-screen w-[310px] flex-col bg-[#062b3d] md:flex">
//         {sidebarBody}
//       </aside>
 
//       {/* Main content */}
//       <main className="md:pl-[310px]">
//         <div className="mx-auto w-full max-w-[1460px] px-4 pb-24 pt-7 sm:px-8 lg:px-12">
//           {children}
//         </div>
//       </main>
//     </div>
//   );
// }


//components/layout/AppShell.tsx
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
  placeholder?: boolean;
};

type LanguageChoice = {
  code: string;
  locale: string;
  label: string;
};
 
// ─── Icons ────────────────────────────────────────────────────────────────────
 
function StethoscopeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3v6a4 4 0 008 0V3" />
      <path d="M10 14v2a4 4 0 008 0v-2" />
      <circle cx="18" cy="11" r="2" />
    </svg>
  );
}
 
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l9-8 9 8M5 10v10h5v-5h4v5h5V10" />
    </svg>
  );
}
 
function IntakeQueueIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}
 
function EmrReviewIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#93a4b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="4" width="10" height="17" rx="2" />
      <path d="M10 4V3a1 1 0 011-1h2a1 1 0 011 1v1" />
      <path d="M10 11h4M10 15h3" />
    </svg>
  );
}
 
function PatientsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0113 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20a4.5 4.5 0 016.5-4" />
    </svg>
  );
}
 
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#818cf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
 
function BillingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10a2 2 0 012 2v15l-3-1.5L13 21l-3-1.5L7 21l-2-1V6a2 2 0 012-2z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}
 
function PatientPortalIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5C9.5 6 8 9 8 12s1.5 6 4 9.5M12 2.5C14.5 6 16 9 16 12s-1.5 6-4 9.5" />
    </svg>
  );
}
 
function PharmacyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#f43f5e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 3.5a5 5 0 017 7l-7 7a5 5 0 01-7-7l7-7z" />
      <line x1="8.5" y1="8.5" x2="15.5" y2="15.5" />
    </svg>
  );
}
 
function CogIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </svg>
  );
}
 
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z" />
    </svg>
  );
}
 
function InteropIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#c4b5fd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 11l7.6-4M8.2 13l7.6 4" />
    </svg>
  );
}
 
function ReportingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V4" />
      <rect x="7" y="12" width="3" height="6" rx="0.5" />
      <rect x="12" y="8" width="3" height="10" rx="0.5" />
      <rect x="17" y="5" width="3" height="13" rx="0.5" />
    </svg>
  );
}
 
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M2.5 12h19" />
      <path d="M12 2.5C9.5 6 8 9 8 12s1.5 6 4 9.5M12 2.5C14.5 6 16 9 16 12s-1.5 6-4 9.5" />
    </svg>
  );
}
 
function TranslateIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5h7M7.5 5v1.5c0 3-2 5.5-4 6.5M5 9c.5 2 2.5 3.8 4.5 4.5" />
      <path d="M11 19l3.5-8 3.5 8M12.3 16h4.4" />
    </svg>
  );
}
 
function FaxIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="8" width="20" height="13" rx="2" />
      <path d="M7 8V5a1 1 0 011-1h8a1 1 0 011 1v3" />
      <circle cx="17.5" cy="11.5" r="1" fill="#a78bfa" stroke="none" />
      <rect x="7" y="14" width="10" height="4" rx="1" />
    </svg>
  );
}
 
// ─── Nav definition ───────────────────────────────────────────────────────────
 
 const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <HomeIcon />,
    roles: ["doctor", "medical_assistant"],
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
  {
    href: "/emr/intake",
    label: "Intake Queue",
    icon: <IntakeQueueIcon />,
    roles: ["medical_assistant"],
    match: (p) => p === "/emr/intake" || p.startsWith("/emr/intake/"),
  },
  {
    href: "/emr",
    label: "Patients",
    icon: <PatientsIcon />,
    match: (p) => p === "/emr",
  },
  { href: "#emr-review", label: "EMR Review", icon: <EmrReviewIcon />, roles: ["doctor"], placeholder: true },
  {
    href: "/appointments",
    label: "Appointments",
    icon: <CalendarIcon />,
    match: (p) => p.startsWith("/appointments"),
    roles: ["doctor", "medical_assistant", "admin"],
  },
  {
    href: "/dashboard",
    label: "Admin",
    icon: <ShieldIcon />,
    roles: ["admin"],
    match: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: <CogIcon />,
    match: (p) => p === "/settings",
  },
  { href: "#billing", label: "Billing", icon: <BillingIcon />, roles: ["admin"], placeholder: true },
  { href: "#patient-portal", label: "Patient Portal", icon: <PatientPortalIcon />, roles: ["doctor", "admin"], placeholder: true },
  { href: "#interop", label: "Interop", icon: <InteropIcon />, roles: ["doctor", "admin"], placeholder: true },
  { href: "#reporting", label: "Reporting", icon: <ReportingIcon />, roles: ["doctor", "admin"], placeholder: true },
  {
    href: "/pharmacy",
    label: "Pharmacy",
    icon: <PharmacyIcon />,
    roles: ["doctor", "medical_assistant"],
    match: (p) => p.startsWith("/pharmacy"),
  },
  {
    href: "/patient-portal",
    label: "Patient Portal",
    icon: <PatientPortalIcon />,
    roles: ["medical_assistant"],
    match: (p) => p.startsWith("/patient-portal"),
  },
];

const LANGUAGE_CHOICES: LanguageChoice[] = [
  { code: "GB", locale: "en", label: "English" },
  { code: "IN", locale: "hi", label: "हिंदी" },
  { code: "IN", locale: "te", label: "తెలుగు" },
  { code: "IN", locale: "ta", label: "தமிழ்" },
  { code: "IN", locale: "kn", label: "ಕನ್ನಡ" },
  { code: "IN", locale: "ml", label: "മലയാളം" },
  { code: "ES", locale: "es", label: "Español" },
  { code: "SA", locale: "ar", label: "العربية" },
  { code: "CN", locale: "zh", label: "中文" },
];
 
// ─── Component ────────────────────────────────────────────────────────────────
 
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
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [draftLanguage, setDraftLanguage] = useState("en");
 
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem("hd-interface-language");
    if (savedLanguage) {
      setLanguage(savedLanguage);
      setDraftLanguage(savedLanguage);
    }
  }, []);
 
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
    role === "doctor" ? `Dr. ${userName.split(" ")[0]}` : userName;
  const bottomLinks = [
    {
      href: "/fax",
      label: "Fax",
      icon: <FaxIcon />,
      match: (p: string) => p.startsWith("/fax"),
    },
  ];
  const showCommunicationTools = role === "doctor" || role === "medical_assistant";

  function openLanguageModal() {
    setDraftLanguage(language);
    setDrawerOpen(false);
    setLanguageModalOpen(true);
  }

  function saveLanguage() {
    setLanguage(draftLanguage);
    window.localStorage.setItem("hd-interface-language", draftLanguage);
    setLanguageModalOpen(false);
    push({ title: "Language saved", variant: "success" });
  }
 
  const sidebarBody = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pb-8 pt-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-[0_12px_28px_rgba(14,165,164,0.28)]">
          <StethoscopeIcon />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold leading-tight text-white">
            MedAssist
          </div>
          <div className="truncate text-sm leading-tight text-[#91a7b8]">
            {clinicName}
          </div>
        </div>
      </div>
 
      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="px-3 pb-3 pt-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7890a2]">
          Navigate
        </div>
        <div className="flex flex-col gap-0.5">
          {visibleNav.map((n) => {
            if (n.placeholder) {
              return (
                <button
                  key={n.label}
                  type="button"
                  title="Coming soon"
                  className="nav-link w-full cursor-default text-left"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {n.icon}
                    <span className="truncate">{n.label}</span>
                  </span>
                  <span className="rounded-full bg-white/[0.08] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#7890a2]">
                    Soon
                  </span>
                </button>
              );
            }
            const active = n.match ? n.match(pathname) : pathname === n.href;
            return (
              <Link
                key={n.label}
                href={n.href}
                className={cn("nav-link", active && "nav-link-active")}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {n.icon}
                  <span className="truncate">{n.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
 
      {/* Bottom items */}
      <div className="px-3 pb-2">
        {showCommunicationTools ? (
          <div className="flex flex-col gap-0.5 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={openLanguageModal}
              className={cn("nav-link w-full text-left", languageModalOpen && "nav-link-active")}
            >
              <span className="flex min-w-0 items-center gap-3">
                <TranslateIcon />
                <span className="truncate">Language</span>
              </span>
            </button>
            {bottomLinks.map((item) => {
              const active = item.match(pathname);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn("nav-link", active && "nav-link-active")}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
 
      {/* User profile */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="px-3 pb-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7890a2]">
          Clinic
        </div>
        <div className="mb-4">
          <ThemeToggle variant="full" />
        </div>
        <div className="relative">
          <button
            onClick={() => setUserMenu((v) => !v)}
            className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-white/10"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-400 ring-1 ring-teal-500/30">
              {initials(userName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {displayName}
              </div>
              <div className="truncate text-[11px] text-slate-400">
                {roleLabel}
              </div>
            </div>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 8l5 5 5-5" />
            </svg>
          </button>
 
          {userMenu ? (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-white/10 bg-[#243044] p-1 shadow-deep animate-slideUp"
              onMouseLeave={() => setUserMenu(false)}
            >
              <div className="px-3 py-2 text-[11px] text-slate-500">
                Signed in as{" "}
                <span className="text-slate-300">{email}</span>
              </div>
              <div className="my-1 border-t border-white/10" />
              {role === "admin" ? (
                <button
                  onClick={() => {
                    void copyInvite();
                    setUserMenu(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <span>Copy invite code</span>
                  <span className="font-mono text-[11px] text-brand-300">
                    {inviteCode}
                  </span>
                </button>
              ) : null}
              <Link
                href="/settings"
                className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                onClick={() => setUserMenu(false)}
              >
                Profile & settings
              </Link>
              {role === "admin" ? (
                <Link
                  href="/settings/team"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  onClick={() => setUserMenu(false)}
                >
                  Team management
                </Link>
              ) : null}
              <button
                onClick={signOut}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-400 transition hover:bg-rose-500/10"
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
            <span className="text-sm font-bold text-slate-900 dark:text-ink-100">MedAssist</span>
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-600">
            {initials(userName)}
          </span>
        </div>
      </header>
 
      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="no-print fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm animate-fadeIn"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative ml-0 flex h-full w-[310px] max-w-[86vw] flex-col bg-[#062b3d] shadow-deep animate-slideUp">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white"
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
      <aside className="no-print fixed left-0 top-0 z-20 hidden h-screen w-[310px] flex-col bg-[#062b3d] md:flex">
        {sidebarBody}
      </aside>
 
      {/* Main content */}
      <main className="md:pl-[310px]">
        <div className="mx-auto w-full max-w-[1460px] px-4 pb-24 pt-7 sm:px-8 lg:px-12">
          {children}
        </div>
      </main>

      {languageModalOpen ? (
        <LanguageSettingsModal
          selectedLanguage={draftLanguage}
          onSelect={setDraftLanguage}
          onCancel={() => {
            setDraftLanguage(language);
            setLanguageModalOpen(false);
          }}
          onSave={saveLanguage}
        />
      ) : null}
    </div>
  );
}

function LanguageSettingsModal({
  selectedLanguage,
  onSelect,
  onCancel,
  onSave,
}: {
  selectedLanguage: string;
  onSelect: (language: string) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center bg-slate-900/45 px-4 pt-10 backdrop-blur-sm sm:items-center sm:pt-0">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-settings-title"
        className="w-full max-w-[600px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h2
            id="language-settings-title"
            className="flex items-center gap-2 text-[17px] font-extrabold text-slate-900"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-[12px] font-black text-sky-600">
              A
            </span>
            Language Settings
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="flex h-8 w-8 items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close language settings"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-9">
          <p className="mb-4 text-sm text-slate-500">
            Select interface language. Patient-facing forms will also reflect this language.
          </p>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {LANGUAGE_CHOICES.map((item) => {
              const active = selectedLanguage === item.locale;

              return (
                <button
                  key={item.locale}
                  type="button"
                  onClick={() => onSelect(item.locale)}
                  className={cn(
                    "flex h-12 items-center justify-center gap-2 rounded-md border px-3 text-[15px] font-semibold text-slate-800 transition hover:border-cyan-400 hover:bg-cyan-50",
                    active
                      ? "border-cyan-500 bg-cyan-50 text-teal-700 shadow-[0_0_0_1px_rgba(6,182,212,0.35)]"
                      : "border-slate-200 bg-white",
                  )}
                >
                  <span className="text-[11px] font-extrabold uppercase tracking-wide text-slate-600">
                    {item.code}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-sm text-slate-500">
            30+ languages supported including French, German, Portuguese, Russian, and more.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-teal-700"
          >
            Save Language
          </button>
        </div>
      </section>
    </div>
  );
}
 
 
