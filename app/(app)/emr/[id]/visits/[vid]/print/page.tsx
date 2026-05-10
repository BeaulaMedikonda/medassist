import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Doctor, Patient, Visit, Medicine } from "@/types/db";
import { formatDate } from "@/lib/utils";
import { serverEnv } from "@/lib/env";
import { PrintAutoLauncher, PrintTriggerButton } from "./PrintAutoLauncher";

export const dynamic = "force-dynamic";

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const admin = supabaseAdmin();
  const { data } = await admin.storage
    .from(serverEnv.supabaseAssetsBucket)
    .createSignedUrl(path, 60 * 30);
  return data?.signedUrl || null;
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; vid: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const supabase = await supabaseServer();
  const [{ id, vid }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: patient }, { data: visit }, { data: doctor }] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
    supabase.from("visits").select("*").eq("id", vid).maybeSingle(),
    supabase.from("doctors").select("*").eq("id", user.id).maybeSingle(),
  ]);

  if (!patient || !visit || !doctor) notFound();

  const p = patient as Patient;
  const v = visit as Visit;
  const d = doctor as Doctor;

  const [letterheadUrl, signatureUrl] = await Promise.all([
    signedUrl(d.letterhead_url),
    signedUrl(d.signature_url),
  ]);

  const meds = (v.prescription?.medicines || []).filter(
    (m) => m.status !== "stopped",
  );

  const includeNotes = serverEnv.pdfIncludeDoctorNotesByDefault;

  const vitalsLine = [
    v.bp_systolic && v.bp_diastolic ? `BP ${v.bp_systolic}/${v.bp_diastolic} mmHg` : null,
    v.pulse ? `Pulse ${v.pulse}` : null,
    v.temperature_f ? `Temp ${v.temperature_f}°F` : null,
    v.spo2 ? `SpO₂ ${v.spo2}%` : null,
    v.weight_kg ? `Wt ${v.weight_kg} kg` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="bg-slate-100 py-8 print:bg-white print:py-0">
      <PrintAutoLauncher auto={resolvedSearchParams.auto !== "0"} />

      <div className="no-print mx-auto mb-4 flex w-full max-w-2xl items-center justify-between px-4">
        <div className="text-sm text-slate-500">
          Preview · A5 portrait · {formatDate(v.visit_date)}
        </div>
        <div className="flex items-center gap-2">
          <PrintTriggerButton />
        </div>
      </div>

      <div
        className="print-area mx-auto w-[148mm] min-h-[210mm] bg-white p-8 text-[12px] leading-snug text-slate-900 shadow-soft print:m-0 print:shadow-none"
        style={{ fontFamily: 'Inter, "Noto Sans Devanagari", system-ui, sans-serif' }}
      >
        {letterheadUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={letterheadUrl} alt="Letterhead" className="mb-3 max-h-24 w-full object-contain" />
        ) : (
          <header className="mb-4 flex items-center justify-between border-b-2 border-brand-700 pb-3">
            <div>
              <div className="text-base font-bold text-slate-900">
                Dr. {d.full_name}
              </div>
              {d.qualification ? (
                <div className="text-[11px] text-slate-600">{d.qualification}</div>
              ) : null}
              {d.registration_number ? (
                <div className="text-[10px] text-slate-500">
                  Reg. No: {d.registration_number}
                </div>
              ) : null}
            </div>
            <div className="text-right text-[11px] text-slate-700">
              {d.clinic_name ? <div className="font-semibold">{d.clinic_name}</div> : null}
              {d.clinic_address ? (
                <div className="max-w-[60mm] whitespace-pre-line text-[10px] text-slate-500">
                  {d.clinic_address}
                </div>
              ) : null}
              {d.clinic_phone ? <div className="text-[10px]">📞 {d.clinic_phone}</div> : null}
            </div>
          </header>
        )}

        <section className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 text-[11px]">
          <div>
            <span className="text-slate-500">Patient: </span>
            <span className="font-semibold">{p.full_name}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500">EMR: </span>
            <span className="font-mono">{p.emr_number}</span>
          </div>
          <div>
            {p.age != null ? (
              <>
                <span className="text-slate-500">Age/Sex: </span>
                <span>{p.age} / {p.sex || "—"}</span>
              </>
            ) : null}
          </div>
          <div className="text-right">
            <span className="text-slate-500">Date: </span>
            <span>{formatDate(v.visit_date)}</span>
          </div>
          {p.phone ? (
            <div>
              <span className="text-slate-500">Phone: </span>
              <span>{p.phone}</span>
            </div>
          ) : null}
          {p.known_allergies ? (
            <div className="col-span-2 text-rose-700">
              <span className="font-semibold">Allergies: </span>
              {p.known_allergies}
            </div>
          ) : null}
        </section>

        {vitalsLine ? (
          <PrintRow label="Vitals" value={vitalsLine} />
        ) : null}
        <PrintRow label="Complaints" value={v.chief_complaints} />
        <PrintRow label="History" value={v.history_present_illness} />
        <PrintRow label="On examination" value={v.examination_findings} />
        <PrintRow
          label="Diagnosis"
          value={v.confirmed_diagnosis || v.provisional_diagnosis}
          bold
        />
        <PrintRow label="Investigations" value={v.investigations_ordered} />

        {meds.length > 0 ? (
          <div className="mt-3">
            <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-1">
              <span className="font-serif text-2xl leading-none text-brand-700">℞</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500">
                Prescription
              </span>
            </div>
            <ol className="ml-5 list-decimal space-y-1.5">
              {meds.map((m: Medicine, i: number) => (
                <li key={i}>
                  <span className="font-semibold">{m.name}</span>
                  {medLine(m) ? (
                    <span className="text-slate-700"> — {medLine(m)}</span>
                  ) : null}
                  {m.instructions ? (
                    <div className="text-[10px] text-slate-500">↳ {m.instructions}</div>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        <PrintRow label="Advice" value={v.advice} />
        <PrintRow
          label="Follow-up"
          value={
            v.follow_up_date
              ? `${formatDate(v.follow_up_date)}${v.follow_up_notes ? " — " + v.follow_up_notes : ""}`
              : null
          }
        />
        {includeNotes && v.doctor_notes ? (
          <PrintRow label="Notes" value={v.doctor_notes} />
        ) : null}

        <footer className="mt-8 flex items-end justify-between">
          <div className="text-[9px] italic text-slate-400">
            AI-generated draft. Reviewed and approved by Dr. {d.full_name}.
          </div>
          <div className="text-right">
            {signatureUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signatureUrl}
                alt="Signature"
                className="ml-auto mb-1 max-h-12"
              />
            ) : (
              <div className="mb-1 h-12 w-32 border-b border-slate-300" />
            )}
            <div className="text-[10px] font-semibold">Dr. {d.full_name}</div>
            {d.registration_number ? (
              <div className="text-[9px] text-slate-500">
                Reg: {d.registration_number}
              </div>
            ) : null}
          </div>
        </footer>
      </div>

      <div className="no-print mx-auto mt-4 max-w-2xl px-4 text-center text-[11px] text-slate-400">
        Use Ctrl/Cmd + P to print or save as PDF. Choose A5 portrait in the print
        dialog for best fit.
      </div>
    </div>
  );
}

function PrintRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string | null | undefined;
  bold?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="mb-1.5">
      <div className="text-[9px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className={`whitespace-pre-line text-[11px] ${bold ? "font-semibold text-slate-900" : "text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}

function medLine(m: Medicine): string {
  return [m.dose, m.frequency, m.duration, m.route && m.route !== "PO" ? m.route : null]
    .filter(Boolean)
    .join(" · ");
}
