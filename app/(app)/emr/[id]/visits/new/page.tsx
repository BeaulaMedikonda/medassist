import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { Patient, Visit } from "@/types/db";
import { NewVisitClient } from "./NewVisitClient";

export const dynamic = "force-dynamic";

export default async function NewVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; vid?: string }>;
}) {
  await requireMember();
  const supabase = await supabaseServer();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!patient) notFound();

  // Resume an existing visit if vid is provided (doctor's queue path).
  let existingVisit: Visit | null = null;
  if (resolvedSearchParams.vid) {
    const { data: v } = await supabase
      .from("visits")
      .select("*")
      .eq("id", resolvedSearchParams.vid)
      .maybeSingle();
    existingVisit = (v as Visit | null) || null;
  }

  // For prescription diff context, find the previous visit (excluding the one we're resuming).
  let prevQuery = supabase
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .order("visit_date", { ascending: false })
    .limit(1);
  if (existingVisit) {
    prevQuery = prevQuery.lt("visit_date", existingVisit.visit_date);
  }
  const { data: prev } = await prevQuery.maybeSingle();
  const previousVisit = (prev as Visit | null) || null;

  return (
    <div>
      <Link
        href={`/emr/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M12 4l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to {(patient as Patient).full_name}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">
        {existingVisit ? "Continue visit" : "New visit"}
      </h1>
      <p className="text-sm text-slate-500">
        EMR {(patient as Patient).emr_number} · {(patient as Patient).full_name}
      </p>

      <div className="mt-6">
        <NewVisitClient
          patient={patient as Patient}
          previousVisit={previousVisit}
          existingVisit={existingVisit}
          initialMode={resolvedSearchParams.mode === "manual" ? "manual" : "record"}
        />
      </div>
    </div>
  );
}
