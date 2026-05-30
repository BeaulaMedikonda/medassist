import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import { buildOpConsultBundle } from "@/lib/fhir/bundle";
import { recordDisclosure } from "@/lib/fhir/disclosures";
import type { Doctor, Patient, Visit, Medicine, Immunization, PatientAllergy } from "@/types/db";
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
  const [{ id, vid }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const { member, clinic } = await requireMember();
 
  const [
    { data: patient },
    { data: visit },
    { data: immunizationRows },
    { data: allergyRows },
  ] =
    await Promise.all([
      supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      supabase
        .from("visits")
        .select("*")
        .eq("id", vid)
        .eq("patient_id", id)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      supabase
        .from("immunizations")
        .select("*")
        .eq("patient_id", id)
        .order("date_given", { ascending: false }),
      supabase.from("patient_allergies").select("*").eq("patient_id", id),
    ]);
 
  if (!patient || !visit) notFound();
 
  const p = patient as Patient;
  const v = visit as Visit;
  if (member.role === "doctor") {
    const doctorScope = await getDoctorAssignedScope(supabase, member.id, clinic.id);
    if (!doctorScope.visitIds.has(vid)) {
      notFound();
    }
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", v.doctor_id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!doctor) notFound();

  const d = doctor as Doctor;
 
  const [letterheadUrl, signatureUrl] = await Promise.all([
    signedUrl(d.letterhead_url),
    signedUrl(d.signature_url),
  ]);
 
  const meds = (v.prescription?.medicines || []).filter(
    (m) => m.status !== "stopped",
  );
  const immunizations = ((immunizationRows || []) as Immunization[]).filter(
    (record) =>
      record.date_given === v.visit_date.slice(0, 10),
  );
  const allergies = ((allergyRows || []) as PatientAllergy[]) || [];
 
  const includeNotes = serverEnv.pdfIncludeDoctorNotesByDefault;
 
  if (v.clinic_id) {
    try {
      const bundle = buildOpConsultBundle({
        patient: p,
        visit: v,
        doctor: d,
        allergies,
      });
      await recordDisclosure({
        clinicId: v.clinic_id,
        patientId: v.patient_id,
        visitId: v.id,
        actorId: member.id,
        consumerType: "fhir_export",
        consumerLabel: "prescription_print",
        bundleProfile: "OPConsultRecord",
        body: JSON.stringify(bundle, null, 2),
      });
    } catch (error) {
      console.error("[print] disclosure log failed", error);
    }
  }
 
  const vitalsLine = [
    v.bp_systolic && v.bp_diastolic
      ? `BP ${v.bp_systolic}/${v.bp_diastolic} mmHg`
      : null,
    v.pulse ? `Pulse ${v.pulse}` : null,
    v.temperature_f ? `Temp ${v.temperature_f}°F` : null,
    v.spo2 ? `SpO₂ ${v.spo2}%` : null,
    v.weight_kg ? `Wt ${v.weight_kg} kg` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
 
  return (
      <div className="print-root bg-slate-100 py-8 print:bg-white print:py-0">
      {/*
        ── PRINT STYLES ────────────────────────────────────────────────────
        @page { margin: 0 } removes the browser's own print header/footer
        (the "5/15/26, 5:06 PM · MedAssist" bar you saw in Image 1).
        -webkit-print-color-adjust forces background images/colors to print.
      */}
      <style>{`
 
        @media print {
          @page {
            margin: 0;
            size: A4 portrait;
          }
          html,
          body {
            width: 210mm !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-root {
            width: 210mm !important;
            height: 280mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            background: white !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-area {
            display: block !important;
            position: relative !important;
            top: 0 !important;
            left: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
            border: 0 !important;
            box-sizing: border-box !important;
            font-size: 9px !important;
            transform: scale(0.94) !important;
            transform-origin: top left !important;
            page-break-after: avoid !important;
            page-break-before: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid-page !important;
            break-before: avoid-page !important;
            break-inside: avoid-page !important;
          }
          .letterhead-content {
            height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
            padding-top: 31% !important;
            padding-bottom: 13% !important;
          }
          .compact-print-row {
            margin-bottom: 3px !important;
          }
          .compact-print-section {
            margin-top: 6px !important;
          }
        }
      `}</style>
 
        <PrintAutoLauncher auto={resolvedSearchParams.auto !== "0"} />
 
        <div className="no-print mx-auto mb-4 flex w-full max-w-3xl items-center justify-between px-4">
          <div className="text-sm text-slate-500">
            Preview · A4 portrait · {formatDate(v.visit_date)}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/emr/${p.id}/visits/${v.id}/view`}
              className="btn-secondary"
            >
              View EMR
            </Link>
            <Link href={`/emr/${p.id}`} className="btn-ghost">
              Back
            </Link>
            <PrintTriggerButton />
          </div>
        </div>
 
        {letterheadUrl ? (
          // ── WITH LETTERHEAD ────────────────────────────────────────────
          <>
            {/*
              Hidden <img> forces the browser to fully fetch + decode the
              letterhead BEFORE PrintAutoLauncher checks img.complete and
              calls window.print(). Without this, the CSS backgroundImage
              is often not cached yet → blank white background when printing.
            */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={letterheadUrl}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              style={{
                position: "absolute",
                opacity: 0,
                pointerEvents: "none",
                width: 1,
                height: 1,
              }}
            />
 
            <div
              className="print-area mx-auto shadow-soft print:m-0 print:shadow-none"
              style={{
                width: "210mm",
                height: "297mm",
                backgroundImage: `url(${letterheadUrl})`,
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                fontFamily:
                  'Inter, "Noto Sans Devanagari", system-ui, sans-serif',
                position: "relative",
                boxSizing: "border-box",
              }}
            >
              {/*
                Kryptons letterhead zones (A4 = 297mm tall):
                  Header (logo + doctor + patient rows + divider) ≈ 38% from top
                  Footer (dark navy band)                          ≈ 22% from bottom
                Adjust paddingTop up if content still overlaps header.
                Adjust paddingBottom up if content overlaps footer band.
              */}
              <div
                style={{
                  paddingTop: "33%",
                  paddingBottom: "14%",
                  paddingLeft: "7%",
                  paddingRight: "7%",
                  boxSizing: "border-box",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
                className="letterhead-content text-[10.5px] leading-snug text-slate-900"
              >
                {/* ── Date line (visit date, since letterhead may not show it) */}
                <div className="mb-1 flex justify-between text-[9px] text-slate-500">
                  <span>Date: <strong className="text-slate-700">{formatDate(v.visit_date)}</strong></span>
                </div>
 
                <section className="mb-1 grid grid-cols-2 gap-x-4 gap-y-0.5 rounded-lg bg-white/85 p-1.5 text-[9px] text-slate-700 shadow-sm">
                  <div>
                    <span className="text-slate-500">Patient: </span>
                    <span className="font-semibold">{p.full_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500">EMR: </span>
                    <span className="font-mono">{p.emr_number}</span>
                  </div>
                  {p.age != null ? (
                    <div>
                      <span className="text-slate-500">Age / Sex: </span>
                      <span>{p.age} / {p.sex || "—"}</span>
                    </div>
                  ) : null}
                  <div className="text-right">
                    <span className="text-slate-500">Phone: </span>
                    <span>{p.phone || "—"}</span>
                  </div>
                </section>
 
                {/* ── Clinical Sections ──────────────────────────────── */}
                {vitalsLine ? (
                  <PrintRow label="Vitals" value={vitalsLine} />
                ) : null}
                <PrintRow label="Complaints" value={v.chief_complaints} />
                <PrintRow label="History" value={v.history_present_illness} />
                <PrintRow
                  label="On Examination"
                  value={v.examination_findings}
                />
                <PrintRow
                  label="Diagnosis"
                  value={v.confirmed_diagnosis || v.provisional_diagnosis}
                  bold
                />
                <PrintRow
                  label="Investigations"
                  value={v.investigations_ordered}
                />
 
                {/* ── Prescription ───────────────────────────────────── */}
                {meds.length > 0 ? (
                  <div className="mt-1">
                    <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-0.5">
                      <span className="font-serif text-[18px] leading-none text-brand-700">
                        ℞
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-slate-400">
                        Prescription
                      </span>
                    </div>
                    <ol className="ml-5 list-decimal space-y-0.5">
                      {meds.map((m: Medicine, i: number) => (
                        <li key={i}>
                          <span className="font-semibold">{m.name}</span>
                          {medLine(m) ? (
                            <span className="text-slate-600">
                              {" "}
                              — {medLine(m)}
                            </span>
                          ) : null}
                          {m.instructions ? (
                            <div className="text-[9px] leading-tight text-slate-400">
                              ↳ {m.instructions}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
 
                <PrintImmunizations records={immunizations} />
 
                <PrintRow label="Advice" value={v.advice} />
                <PrintRow
                  label="Follow-up"
                  value={
                    v.follow_up_date
                      ? `${formatDate(v.follow_up_date)}${
                          v.follow_up_notes ? " — " + v.follow_up_notes : ""
                        }`
                      : null
                  }
                />
                {includeNotes && v.doctor_notes ? (
                  <PrintRow label="Notes" value={v.doctor_notes} />
                ) : null}
 
                {/* ── Signature + Disclaimer ─────────────────────────── */}
                {/* mt-auto pushes signature to bottom of available content area */}
                <div
                  className="flex items-end justify-between"
                  style={{
                    position: "absolute",
                    bottom: "7%",
                    right: "7%",
                    left: "7%",
                    pageBreakInside: "avoid",
                    breakInside: "avoid",
                  } as React.CSSProperties}
                >
                  <p className="text-[8px] italic text-slate-400">
                    AI-generated draft. Reviewed and approved by Dr.{" "}
                    {d.full_name}.
                  </p>
                  <div className="text-right">
                    {signatureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="ml-auto mb-0.5"
                        style={{ maxHeight: "40px", maxWidth: "110px" }}
                      />
                    ) : (
                      <div className="mb-0.5 h-8 w-24 border-b border-slate-400" />
                    )}
                    <div className="text-[9px] font-semibold text-slate-800">
                      Dr. {d.full_name}
                    </div>
                    {d.qualification ? (
                      <div className="text-[8px] text-slate-500">
                        {d.qualification}
                      </div>
                    ) : null}
                    {d.registration_number ? (
                      <div className="text-[8px] text-slate-500">
                        Reg: {d.registration_number}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // ── NO LETTERHEAD — plain fallback layout ──────────────────────
          <div
            className="print-area mx-auto h-[296mm] w-[210mm] bg-white p-8 text-[11px] leading-snug text-slate-900 shadow-soft print:m-0 print:p-6 print:shadow-none"
            style={{
              fontFamily:
                'Inter, "Noto Sans Devanagari", system-ui, sans-serif',
            }}
          >
            {/* ── Header ───────────────────────────────────────────────── */}
            <header className="mb-4 flex items-start justify-between border-b-2 border-brand-700 pb-3">
              <div>
                <div className="text-base font-bold text-slate-900">
                  Dr. {d.full_name}
                </div>
                {d.qualification ? (
                  <div className="text-[11px] text-slate-600">
                    {d.qualification}
                  </div>
                ) : null}
                {d.registration_number ? (
                  <div className="text-[10px] text-slate-500">
                    Reg. No: {d.registration_number}
                  </div>
                ) : null}
                {d.hpr_id ? (
                  <div className="text-[10px] text-slate-500">
                    HPR ID: {d.hpr_id}
                  </div>
                ) : null}
              </div>
              <div className="text-right text-[11px] text-slate-700">
                {d.clinic_name ? (
                  <div className="font-semibold">{d.clinic_name}</div>
                ) : null}
                {d.clinic_address ? (
                  <div className="max-w-[60mm] whitespace-pre-line text-[10px] text-slate-500">
                    {d.clinic_address}
                  </div>
                ) : null}
                {d.clinic_phone ? (
                  <div className="text-[10px]">📞 {d.clinic_phone}</div>
                ) : null}
                {/* Date shown here since browser's own header is suppressed by @page margin:0 */}
                <div className="mt-1 text-[10px] font-medium text-slate-600">
                  Date: {formatDate(v.visit_date)}
                </div>
              </div>
            </header>
 
            {/* ── Patient info block ────────────────────────────────────── */}
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
                    <span>
                      {p.age} / {p.sex || "—"}
                    </span>
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
                  <span className="font-semibold">⚠ Allergies: </span>
                  {p.known_allergies}
                </div>
              ) : null}
            </section>
 
            {/* ── Clinical Sections ─────────────────────────────────────── */}
            {vitalsLine ? (
              <PrintRow label="Vitals" value={vitalsLine} />
            ) : null}
            <PrintRow label="Complaints" value={v.chief_complaints} />
            <PrintRow label="History" value={v.history_present_illness} />
            <PrintRow label="On Examination" value={v.examination_findings} />
            <PrintRow
              label="Diagnosis"
              value={v.confirmed_diagnosis || v.provisional_diagnosis}
              bold
            />
            <PrintRow label="Investigations" value={v.investigations_ordered} />
 
            {/* ── Prescription ──────────────────────────────────────────── */}
            {meds.length > 0 ? (
              <div className="mt-3">
                <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-1">
                  <span className="font-serif text-2xl leading-none text-brand-700">
                    ℞
                  </span>
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
                        <div className="text-[10px] text-slate-500">
                          ↳ {m.instructions}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
 
            <PrintImmunizations records={immunizations} />
 
            <PrintRow label="Advice" value={v.advice} />
            <PrintRow
              label="Follow-up"
              value={
                v.follow_up_date
                  ? `${formatDate(v.follow_up_date)}${
                      v.follow_up_notes ? " — " + v.follow_up_notes : ""
                    }`
                  : null
              }
            />
            {includeNotes && v.doctor_notes ? (
              <PrintRow label="Notes" value={v.doctor_notes} />
            ) : null}
 
            {/* ── Footer: Signature + Disclaimer ───────────────────────── */}
            <footer
              className="mt-8 flex items-end justify-between"
              style={{
                pageBreakInside: "avoid",
                breakInside: "avoid",
              } as React.CSSProperties}
            >
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
                <div className="text-[10px] font-semibold">
                  Dr. {d.full_name}
                </div>
                {d.registration_number ? (
                  <div className="text-[9px] text-slate-500">
                    Reg: {d.registration_number}
                  </div>
                ) : null}
              </div>
            </footer>
          </div>
        )}
 
        <div className="no-print mx-auto mt-4 max-w-3xl px-4 text-center text-[11px] text-slate-400">
          Use Ctrl/Cmd + P → A4 portrait in print dialog for best fit.
        </div>
      </div>
  );
}
 
// ── Helpers ───────────────────────────────────────────────────────────────────
 
function PrintImmunizations({ records }: { records: Immunization[] }) {
  const printable = records.filter((record) => record.status !== "declined");
  if (printable.length === 0) return null;
 
  return (
    <div className="mt-1">
      <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-0.5">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">
          Immunization
        </span>
      </div>
      <ul className="ml-4 list-disc space-y-0.5">
        {printable.map((record) => (
          <li key={record.id}>
            <span className="font-semibold">{record.vaccine_name}</span>
            {immunizationLine(record) ? (
              <span className="text-slate-600"> - {immunizationLine(record)}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
 
function immunizationLine(record: Immunization): string {
  return [
    formatDate(record.date_given),
    record.dose,
    record.cvx_code ? `CVX ${record.cvx_code}` : null,
    record.status !== "completed" ? record.status : null,
  ]
    .filter(Boolean)
    .join(" / ");
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
    <div className="mb-1">
      <div className="text-[8.5px] uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={`whitespace-pre-line text-[10.5px] ${
          bold ? "font-semibold text-slate-900" : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
 
function medLine(m: Medicine): string {
  return [
    m.dose,
    m.frequency,
    m.duration,
    m.route && m.route !== "PO" ? m.route : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
