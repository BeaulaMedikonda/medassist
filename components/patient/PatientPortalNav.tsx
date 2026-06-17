"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    title: "My Health",
    items: [
      { href: "/patient/profile", label: "Personal Details", icon: <ProfileIcon /> },
      { href: "/patient/visits", label: "My Visits", icon: <VisitsIcon /> },
      { href: "/patient/appointments", label: "Appointments", icon: <CalendarIcon /> },
      { href: "/patient/immunizations", label: "Immunizations", icon: <ImmunizationsIcon /> },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/patient/reports", label: "Reports & Prescriptions", icon: <PrescriptionIcon /> },
      { href: "/patient/vitals", label: "Vitals History", icon: <VitalsIcon /> },
    ],
  },
];

export function PatientPortalNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6 px-0">
      {navSections.map((section) => (
        <div key={section.title}>
          <div className="mb-3 px-3 text-[12px] font-bold uppercase tracking-[0.18em] text-[#7890a2]">
            {section.title}
          </div>
          <div className="space-y-1">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[52px] items-center gap-3 rounded-2xl px-4 py-3 text-base font-extrabold transition ${
                    active
                      ? "bg-[linear-gradient(90deg,rgba(34,211,238,0.20)_0%,rgba(20,184,166,0.12)_58%,rgba(255,255,255,0.035)_100%)] text-[#ecfeff] shadow-[inset_2px_0_0_#22d3ee,inset_0_0_0_1px_rgba(125,211,252,0.10)]"
                      : "text-[#9bb2c5] hover:bg-white/[0.07] hover:text-white"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center ${
                      active ? "text-[#22d3ee]" : "text-[#7fb3ff]"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21a8 8 0 10-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function VisitsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6" />
      <path d="M10 3v4h4V3" />
      <rect x="6" y="5" width="12" height="16" rx="2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </svg>
  );
}

function PrescriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function VitalsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V9" />
      <path d="M10 19V5" />
      <path d="M16 19v-7" />
      <path d="M22 19H2" />
    </svg>
  );
}

function ImmunizationsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3L5 17" />
      <path d="M12 4l4 4" />
      <path d="M5 10l4 4" />
      <path d="M3 21l4-4" />
      <circle cx="17" cy="7" r="2" />
    </svg>
  );
}
