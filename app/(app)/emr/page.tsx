import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { EmrListClient } from "./EmrListClient";
import type { Patient } from "@/types/db";

export const dynamic = "force-dynamic";

export type PatientFilter = "all" | "today" | "visited" | "chronic";
export type LatestVisit = {
  visit_id: string;
  visit_date: string;
  diagnosis: string | null;
};

export default async function EmrListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  noStore();
  await requireMember();
  const supabase = await supabaseServer();
  const resolvedSearchParams = await searchParams;
  const q = (resolvedSearchParams.q || "").trim();
  const filter: PatientFilter =
    resolvedSearchParams.filter === "today" ||
    resolvedSearchParams.filter === "visited" ||
    resolvedSearchParams.filter === "chronic"
      ? resolvedSearchParams.filter
      : "all";

  // Today range
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let patientQuery = supabase
    .from("patients")
    .select("*")
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(150);
  if (q) {
    patientQuery = patientQuery.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,emr_number.ilike.%${q}%`,
    );
  }
  if (filter === "today") {
    patientQuery = patientQuery.gte("last_visit_at", todayStart.toISOString());
  } else if (filter === "visited") {
    patientQuery = patientQuery.not("last_visit_at", "is", null);
  } else if (filter === "chronic") {
    patientQuery = patientQuery
      .not("chronic_conditions", "is", null)
      .neq("chronic_conditions", "");
  }
  const { data: patients, error } = await patientQuery;

  // Counts for filter tabs (separate cheap queries)
  const [allCount, todayCount, visitedCount, chronicCount] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .gte("last_visit_at", todayStart.toISOString()),
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .not("last_visit_at", "is", null),
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .not("chronic_conditions", "is", null)
      .neq("chronic_conditions", ""),
  ]);

  // Fetch the latest visit per patient (id + date + diagnosis) so the tile
  // can show a real "Last visit" date and a "View latest EMR" link.
  const patientIds = (patients || []).map((p) => (p as Patient).id);
  const latestVisit: Record<string, LatestVisit> = {};
  if (patientIds.length > 0) {
    const { data: visits } = await supabase
      .from("visits")
      .select("id, patient_id, confirmed_diagnosis, provisional_diagnosis, visit_date")
      .in("patient_id", patientIds)
      .order("visit_date", { ascending: false });
    if (visits) {
      for (const v of visits as Array<{
        id: string;
        patient_id: string;
        confirmed_diagnosis: string | null;
        provisional_diagnosis: string | null;
        visit_date: string;
      }>) {
        if (!latestVisit[v.patient_id]) {
          latestVisit[v.patient_id] = {
            visit_id: v.id,
            visit_date: v.visit_date,
            diagnosis: v.confirmed_diagnosis || v.provisional_diagnosis || null,
          };
        }
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Patient directory</h1>
          <p className="text-sm text-slate-500 dark:text-ink-500">
            {patients?.length ?? 0}
            {" "}
            {patients?.length === 1 ? "patient" : "patients"}
            {q ? ` matching "${q}"` : ""}
          </p>
        </div>
        <Link href="/emr/new" className="btn-primary self-start sm:self-auto">
          <svg viewBox="0 0 20 20" className="h-4 w-4">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New patient
        </Link>
      </div>

      <EmrListClient
        initialQuery={q}
        initialFilter={filter}
        patients={(patients || []) as Patient[]}
        latestVisit={latestVisit}
        error={error?.message || null}
        counts={{
          all: allCount.count ?? 0,
          today: todayCount.count ?? 0,
          visited: visitedCount.count ?? 0,
          chronic: chronicCount.count ?? 0,
        }}
      />
    </div>
  );
}
