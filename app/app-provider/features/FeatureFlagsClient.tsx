"use client";

import { useMemo, useState, useTransition } from "react";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import { saveClinicFeatureFlags, type FeatureFlagDraft, type FeatureFlagKey } from "./actions";

const FLAGS: FeatureFlagKey[] = [
  "pharmacy",
  "appointments",
  "patient_portal",
  "fhir_export",
  "ai_extraction",
  "pre_visit_summary",
  "fax",
  "multilingual",
  "immunizations",
  "referrals",
];

type FeatureFlagRow = {
  clinic: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  };
  flags: Record<string, unknown> | null;
};

function labelFor(flag: FeatureFlagKey) {
  return flag.replace(/_/g, " ");
}

function toDraft(flags: Record<string, unknown> | null): FeatureFlagDraft {
  return FLAGS.reduce((acc, flag) => {
    acc[flag] = flags?.[flag] !== false;
    return acc;
  }, {} as FeatureFlagDraft);
}

function EnabledPill({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em]",
        enabled
          ? "border-cyan-200 bg-cyan-50 text-cyan-800"
          : "border-slate-200 bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      {enabled ? "On" : "Off"}
    </span>
  );
}

function ClinicFeatureRow({ row, canEdit }: { row: FeatureFlagRow; canEdit: boolean }) {
  const initialDraft = useMemo(() => toDraft(row.flags), [row.flags]);
  const [draft, setDraft] = useState<FeatureFlagDraft>(initialDraft);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const enabledCount = FLAGS.filter((flag) => draft[flag]).length;

  function updateFlag(flag: FeatureFlagKey, enabled: boolean) {
    setSaved(false);
    setError("");
    setDraft((current) => ({ ...current, [flag]: enabled }));
  }

  function saveFlags() {
    setSaved(false);
    setError("");
    startTransition(async () => {
      try {
        await saveClinicFeatureFlags(row.clinic.id, draft);
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save feature flags");
      }
    });
  }

  return (
    <div className="border-b border-slate-200 px-5 py-5 last:border-b-0">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 xl:w-72">
          <div className="font-black text-slate-950">{row.clinic.name}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {[row.clinic.city, row.clinic.state].filter(Boolean).join(", ") || "Location not set"}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <EnabledPill enabled={enabledCount > 0} />
            <span className="text-xs font-bold text-slate-500">
              {enabledCount} of {FLAGS.length} modules enabled
            </span>
          </div>
        </div>

        <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {FLAGS.map((flag) => (
            <label
              key={flag}
              className={[
                "flex min-h-12 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-xs font-black capitalize transition",
                draft[flag]
                  ? "border-cyan-300 bg-cyan-50 text-slate-950"
                  : "border-slate-200 bg-white text-slate-500",
              ].join(" ")}
            >
              <input
                type="checkbox"
                checked={draft[flag]}
                disabled={!canEdit}
                onChange={(event) => canEdit && updateFlag(flag, event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <span className="leading-snug">{labelFor(flag)}</span>
            </label>
          ))}
        </div>

        <div className="flex min-w-36 flex-col items-start gap-2 xl:items-end">
          <button
            type="button"
            onClick={saveFlags}
            disabled={isPending || !canEdit}
            className="rounded-md bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Saving..." : "Save flags"}
          </button>
          {!canEdit ? (
            <span className="text-xs font-semibold text-slate-400">View only</span>
          ) : null}
          {saved ? <span className="text-xs font-black text-cyan-700">Saved</span> : null}
          {error ? <span className="max-w-44 text-xs font-bold text-rose-600">{error}</span> : null}
        </div>
      </div>
    </div>
  );
}

export function FeatureFlagsClient({ rows, canEdit }: { rows: FeatureFlagRow[]; canEdit: boolean }) {
  const [page, setPage] = useState(1);
  const pageData = getClientPageItems(rows, page, 10);

  if (!rows.length) {
    return <div className="px-5 py-8 text-sm font-semibold text-slate-500">No clinics found.</div>;
  }

  return (
    <div className="overflow-hidden rounded-b-md bg-white">
      {pageData.pageItems.map((row) => (
        <ClinicFeatureRow key={row.clinic.id} row={row} canEdit={canEdit} />
      ))}
      <ClientPagination
        page={pageData.currentPage}
        pageSize={10}
        totalItems={rows.length}
        onPageChange={setPage}
        label="clinics"
      />
    </div>
  );
}
