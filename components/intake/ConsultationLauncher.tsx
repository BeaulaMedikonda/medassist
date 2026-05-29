"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { initials } from "@/lib/utils";
import type { Patient } from "@/types/db";

export function ConsultationLauncher({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [picked, setPicked] = useState<Patient | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (picked || searchTerm.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const sb = supabaseBrowser();
        const term = searchTerm.trim();
        const { data } = await sb
          .from("patients")
          .select("*")
          .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,emr_number.ilike.%${term}%`)
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(6);
        if (!cancelled) setResults((data || []) as Patient[]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchTerm, picked]);

  async function start() {
    if (!picked) {
      push({ title: "Pick a patient first", variant: "info" });
      return;
    }
    setBusy(true);
    try {
      const sb = supabaseBrowser();
      const { data: visit, error } = await sb
        .from("visits")
        .insert({
          patient_id: picked.id,
          doctor_id: currentUserId,
          created_by: currentUserId,
          visit_date: new Date().toISOString(),
          status: "in_progress",
        })
        .select("id")
        .single();
      if (error || !visit) throw new Error(error?.message || "Could not start visit");
      const visitId = (visit as { id: string }).id;
      await sb.from("visit_doctors").insert({
        visit_id: visitId,
        doctor_id: currentUserId,
        role: "attending",
      });
      router.push(`/emr/${picked.id}/visits/new?vid=${visitId}&mode=record`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card rounded-[18px] p-6">
      <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#64748b] dark:text-ink-500">
        Quick consultation
      </h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#64748b] dark:text-ink-500">
        Pick a patient and start recording — the EMR draft is ready by the time you finish.
      </p>
      <div className="mt-4 space-y-3">
        {picked ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 dark:border-brand-800 dark:bg-brand-900/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 text-xs font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
                  {initials(picked.full_name)}
                </span>
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                    {picked.full_name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-ink-500">
                    {picked.emr_number}
                    {picked.age != null ? ` · ${picked.age}${picked.sex || ""}` : ""}
                  </div>
                  {picked.known_allergies ? (
                    <p className="mt-1 text-[11px] text-rose-700">
                      Allergies: {picked.known_allergies}
                    </p>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => {
                  setPicked(null);
                  setSearchTerm("");
                }}
                className="text-[11px] font-medium text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient by name, phone, or EMR number"
              className="input-base"
              style={{ boxShadow: "inset 0 1px 2px rgba(15,23,42,.06)" }}
            />
            {results.length > 0 ? (
              <ul className="absolute left-0 right-0 z-10 mt-1 max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => {
                        setPicked(p);
                        setResults([]);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-ink-800"
                    >
                      <span>
                        <span className="font-medium text-slate-900 dark:text-ink-100">{p.full_name}</span>
                        <span className="ml-2 text-[11px] text-slate-500 dark:text-ink-500">
                          {p.emr_number}
                          {p.age != null ? ` · ${p.age}${p.sex || ""}` : ""}
                        </span>
                      </span>
                      {p.phone ? (
                        <span className="text-[11px] text-slate-400 dark:text-ink-600">{p.phone}</span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {searching ? (
              <span className="absolute right-3 top-3 text-[11px] text-slate-400 dark:text-ink-600">
                searching…
              </span>
            ) : null}
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={start}
            disabled={!picked || busy}
            className="btn-teal"
          >
            {busy ? <Spinner /> : null}
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2zm4 7v-2.07a7 7 0 002 0V17h-2z" />
            </svg>
            Start recording
          </button>
        </div>
      </div>
    </div>
  );
}
