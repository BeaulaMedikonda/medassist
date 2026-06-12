"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type ClinicItem = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
};

function patientLoginHref(clinic: ClinicItem) {
  const params = new URLSearchParams({ clinic: clinic.id, clinicName: clinic.name });
  return `/patient/login?${params.toString()}`;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function ClinicSelector({ clinics }: { clinics: ClinicItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clinics;
    return clinics.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q) ||
        c.state?.toLowerCase().includes(q) ||
        c.address?.toLowerCase().includes(q) ||
        c.phone?.includes(q),
    );
  }, [clinics, query]);

  return (
    <div>
      {/* Search + count */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, city or phone…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-[13px] font-medium text-slate-900 shadow-sm outline-none placeholder:text-slate-400 transition focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/15"
          />
        </div>
        <p className="text-[12px] font-semibold text-slate-400">
          {query.trim() && filtered.length !== clinics.length
            ? `${filtered.length} of ${clinics.length} matching`
            : `${clinics.length} clinic${clinics.length !== 1 ? "s" : ""} available`}
        </p>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-14 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-bold text-slate-700">No clinics found</p>
            <p className="mt-0.5 text-[12px] text-slate-400">
              No results for &ldquo;<span className="font-semibold">{query}</span>&rdquo;. Try a different name or city.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-1 text-[12px] font-extrabold text-[#0ea5a4] hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.04)]">
          {filtered.map((clinic, index) => {
            const location = [clinic.city, clinic.state].filter(Boolean).join(", ");
            return (
              <ClinicRow
                key={clinic.id}
                clinic={clinic}
                location={location}
                isLast={index === filtered.length - 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClinicRow({
  clinic,
  location,
  isLast,
}: {
  clinic: ClinicItem;
  location: string;
  isLast: boolean;
}) {
  return (
    <Link
      href={patientLoginHref(clinic)}
      className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-[#f5fffe] ${
        !isLast ? "border-b border-slate-100" : ""
      }`}
    >
      {/* Initials avatar */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-[13px] font-extrabold text-white shadow-[0_2px_8px_-2px_rgba(14,165,164,0.45)]">
        {getInitials(clinic.name)}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-extrabold text-slate-900 group-hover:text-[#0c8a89] transition-colors">
          {clinic.name}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-4 gap-y-0.5">
          {location && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1116 0Z" />
                <circle cx="12" cy="10" r="2" />
              </svg>
              {location}
            </span>
          )}
          {clinic.phone && (
            <span className="flex items-center gap-1 text-[12px] font-medium text-slate-500">
              <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              {clinic.phone}
            </span>
          )}
        </div>
      </div>

      {/* Desktop CTA */}
      <span className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-extrabold text-slate-700 shadow-sm transition group-hover:border-[#0ea5a4] group-hover:bg-[#0ea5a4] group-hover:text-white sm:inline-flex">
        Continue
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </span>

      {/* Mobile arrow */}
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-[#0ea5a4] sm:hidden" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  );
}
