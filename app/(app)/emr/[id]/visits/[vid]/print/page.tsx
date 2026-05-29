// import { notFound, redirect } from "next/navigation";
// import { supabaseServer } from "@/lib/supabase/server";
// import { supabaseAdmin } from "@/lib/supabase/admin";
// import type { Doctor, Patient, Visit, Medicine } from "@/types/db";
// import { formatDate } from "@/lib/utils";
// import { serverEnv } from "@/lib/env";
// import { PrintAutoLauncher, PrintTriggerButton } from "./PrintAutoLauncher";

// export const dynamic = "force-dynamic";

// async function signedUrl(path: string | null): Promise<string | null> {
//   if (!path) return null;
//   const admin = supabaseAdmin();
//   const { data } = await admin.storage
//     .from(serverEnv.supabaseAssetsBucket)
//     .createSignedUrl(path, 60 * 30);
//   return data?.signedUrl || null;
// }

// export default async function PrintPage({
//   params,
//   searchParams,
// }: {
//   params: Promise<{ id: string; vid: string }>;
//   searchParams: Promise<{ auto?: string }>;
// }) {
//   const supabase = await supabaseServer();
//   const [{ id, vid }, resolvedSearchParams] = await Promise.all([params, searchParams]);
//   const {
//     data: { user },
//   } = await supabase.auth.getUser();
//   if (!user) redirect("/login");

//   const [{ data: patient }, { data: visit }, { data: doctor }] = await Promise.all([
//     supabase.from("patients").select("*").eq("id", id).maybeSingle(),
//     supabase.from("visits").select("*").eq("id", vid).maybeSingle(),
//     supabase.from("doctors").select("*").eq("id", user.id).maybeSingle(),
//   ]);

//   if (!patient || !visit || !doctor) notFound();

//   const p = patient as Patient;
//   const v = visit as Visit;
//   const d = doctor as Doctor;

//   const [letterheadUrl, signatureUrl] = await Promise.all([
//     signedUrl(d.letterhead_url),
//     signedUrl(d.signature_url),
//   ]);

//   const meds = (v.prescription?.medicines || []).filter(
//     (m) => m.status !== "stopped",
//   );

//   const includeNotes = serverEnv.pdfIncludeDoctorNotesByDefault;

//   const vitalsLine = [
//     v.bp_systolic && v.bp_diastolic ? `BP ${v.bp_systolic}/${v.bp_diastolic} mmHg` : null,
//     v.pulse ? `Pulse ${v.pulse}` : null,
//     v.temperature_f ? `Temp ${v.temperature_f}°F` : null,
//     v.spo2 ? `SpO₂ ${v.spo2}%` : null,
//     v.weight_kg ? `Wt ${v.weight_kg} kg` : null,
//   ]
//     .filter(Boolean)
//     .join("  ·  ");

//   return (
//     <div className="bg-slate-100 py-8 print:bg-white print:py-0">
//       <PrintAutoLauncher auto={resolvedSearchParams.auto !== "0"} />

//       <div className="no-print mx-auto mb-4 flex w-full max-w-2xl items-center justify-between px-4">
//         <div className="text-sm text-slate-500">
//           Preview · A5 portrait · {formatDate(v.visit_date)}
//         </div>
//         <div className="flex items-center gap-2">
//           <PrintTriggerButton />
//         </div>
//       </div>

//       <div
//         className="print-area mx-auto w-[148mm] min-h-[210mm] bg-white p-8 text-[12px] leading-snug text-slate-900 shadow-soft print:m-0 print:shadow-none"
//         style={{ fontFamily: 'Inter, "Noto Sans Devanagari", system-ui, sans-serif' }}
//       >
//         {letterheadUrl ? (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img src={letterheadUrl} alt="Letterhead" className="mb-3 max-h-24 w-full object-contain" />
//         ) : (
//           <header className="mb-4 flex items-center justify-between border-b-2 border-brand-700 pb-3">
//             <div>
//               <div className="text-base font-bold text-slate-900">
//                 Dr. {d.full_name}
//               </div>
//               {d.qualification ? (
//                 <div className="text-[11px] text-slate-600">{d.qualification}</div>
//               ) : null}
//               {d.registration_number ? (
//                 <div className="text-[10px] text-slate-500">
//                   Reg. No: {d.registration_number}
//                 </div>
//               ) : null}
//             </div>
//             <div className="text-right text-[11px] text-slate-700">
//               {d.clinic_name ? <div className="font-semibold">{d.clinic_name}</div> : null}
//               {d.clinic_address ? (
//                 <div className="max-w-[60mm] whitespace-pre-line text-[10px] text-slate-500">
//                   {d.clinic_address}
//                 </div>
//               ) : null}
//               {d.clinic_phone ? <div className="text-[10px]">📞 {d.clinic_phone}</div> : null}
//             </div>
//           </header>
//         )}

//         <section className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 rounded-lg bg-slate-50 p-3 text-[11px]">
//           <div>
//             <span className="text-slate-500">Patient: </span>
//             <span className="font-semibold">{p.full_name}</span>
//           </div>
//           <div className="text-right">
//             <span className="text-slate-500">EMR: </span>
//             <span className="font-mono">{p.emr_number}</span>
//           </div>
//           <div>
//             {p.age != null ? (
//               <>
//                 <span className="text-slate-500">Age/Sex: </span>
//                 <span>{p.age} / {p.sex || "—"}</span>
//               </>
//             ) : null}
//           </div>
//           <div className="text-right">
//             <span className="text-slate-500">Date: </span>
//             <span>{formatDate(v.visit_date)}</span>
//           </div>
//           {p.phone ? (
//             <div>
//               <span className="text-slate-500">Phone: </span>
//               <span>{p.phone}</span>
//             </div>
//           ) : null}
//           {p.known_allergies ? (
//             <div className="col-span-2 text-rose-700">
//               <span className="font-semibold">Allergies: </span>
//               {p.known_allergies}
//             </div>
//           ) : null}
//         </section>

//         {vitalsLine ? (
//           <PrintRow label="Vitals" value={vitalsLine} />
//         ) : null}
//         <PrintRow label="Complaints" value={v.chief_complaints} />
//         <PrintRow label="History" value={v.history_present_illness} />
//         <PrintRow label="On examination" value={v.examination_findings} />
//         <PrintRow
//           label="Diagnosis"
//           value={v.confirmed_diagnosis || v.provisional_diagnosis}
//           bold
//         />
//         <PrintRow label="Investigations" value={v.investigations_ordered} />

//         {meds.length > 0 ? (
//           <div className="mt-3">
//             <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-1">
//               <span className="font-serif text-2xl leading-none text-brand-700">℞</span>
//               <span className="text-[10px] uppercase tracking-widest text-slate-500">
//                 Prescription
//               </span>
//             </div>
//             <ol className="ml-5 list-decimal space-y-1.5">
//               {meds.map((m: Medicine, i: number) => (
//                 <li key={i}>
//                   <span className="font-semibold">{m.name}</span>
//                   {medLine(m) ? (
//                     <span className="text-slate-700"> — {medLine(m)}</span>
//                   ) : null}
//                   {m.instructions ? (
//                     <div className="text-[10px] text-slate-500">↳ {m.instructions}</div>
//                   ) : null}
//                 </li>
//               ))}
//             </ol>
//           </div>
//         ) : null}

//         <PrintRow label="Advice" value={v.advice} />
//         <PrintRow
//           label="Follow-up"
//           value={
//             v.follow_up_date
//               ? `${formatDate(v.follow_up_date)}${v.follow_up_notes ? " — " + v.follow_up_notes : ""}`
//               : null
//           }
//         />
//         {includeNotes && v.doctor_notes ? (
//           <PrintRow label="Notes" value={v.doctor_notes} />
//         ) : null}

//         <footer className="mt-8 flex items-end justify-between">
//           <div className="text-[9px] italic text-slate-400">
//             AI-generated draft. Reviewed and approved by Dr. {d.full_name}.
//           </div>
//           <div className="text-right">
//             {signatureUrl ? (
//               // eslint-disable-next-line @next/next/no-img-element
//               <img
//                 src={signatureUrl}
//                 alt="Signature"
//                 className="ml-auto mb-1 max-h-12"
//               />
//             ) : (
//               <div className="mb-1 h-12 w-32 border-b border-slate-300" />
//             )}
//             <div className="text-[10px] font-semibold">Dr. {d.full_name}</div>
//             {d.registration_number ? (
//               <div className="text-[9px] text-slate-500">
//                 Reg: {d.registration_number}
//               </div>
//             ) : null}
//           </div>
//         </footer>
//       </div>

//       <div className="no-print mx-auto mt-4 max-w-2xl px-4 text-center text-[11px] text-slate-400">
//         Use Ctrl/Cmd + P to print or save as PDF. Choose A5 portrait in the print
//         dialog for best fit.
//       </div>
//     </div>
//   );
// }

// function PrintRow({
//   label,
//   value,
//   bold,
// }: {
//   label: string;
//   value: string | null | undefined;
//   bold?: boolean;
// }) {
//   if (!value) return null;
//   return (
//     <div className="mb-1.5">
//       <div className="text-[9px] uppercase tracking-wider text-slate-400">
//         {label}
//       </div>
//       <div className={`whitespace-pre-line text-[11px] ${bold ? "font-semibold text-slate-900" : "text-slate-800"}`}>
//         {value}
//       </div>
//     </div>
//   );
// }

// function medLine(m: Medicine): string {
//   return [m.dose, m.frequency, m.duration, m.route && m.route !== "PO" ? m.route : null]
//     .filter(Boolean)
//     .join(" · ");
// }




import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Doctor, Patient, Visit, Medicine, Immunization } from "@/types/db";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: patient },
    { data: visit },
    { data: doctor },
    { data: immunizationRows },
  ] =
    await Promise.all([
      supabase.from("patients").select("*").eq("id", id).maybeSingle(),
      supabase.from("visits").select("*").eq("id", vid).maybeSingle(),
      supabase.from("doctors").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("immunizations")
        .select("*")
        .eq("patient_id", id)
        .order("date_given", { ascending: false }),
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
  const immunizations = ((immunizationRows || []) as Immunization[]).filter(
    (record) =>
      record.visit_id === vid || record.date_given === v.visit_date.slice(0, 10),
  );

  const includeNotes = serverEnv.pdfIncludeDoctorNotesByDefault;

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
      <div className="bg-slate-100 py-8 print:bg-white print:py-0">
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
          .no-print {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-area {
            border: 1px solid #cbd5e1 !important;
            box-sizing: border-box !important;
            font-size: 9px !important;
          }
        }
      `}</style>

        <PrintAutoLauncher auto={resolvedSearchParams.auto !== "0"} />

        <div className="no-print mx-auto mb-4 flex w-full max-w-3xl items-center justify-between px-4">
          <div className="text-sm text-slate-500">
            Preview · A4 portrait · {formatDate(v.visit_date)}
          </div>
          <div className="flex items-center gap-2">
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
                minHeight: "297mm",
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
                  paddingBottom: "19%",
                  paddingLeft: "7%",
                  paddingRight: "7%",
                  boxSizing: "border-box",
                  minHeight: "297mm",
                  display: "flex",
                  flexDirection: "column",
                }}
                className="text-[10.5px] leading-snug text-slate-900"
              >
                {/* ── Date line (visit date, since letterhead may not show it) */}
                <div className="mb-2 flex justify-between text-[9px] text-slate-500">
                  <span>Date: <strong className="text-slate-700">{formatDate(v.visit_date)}</strong></span>
                </div>

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
                  <div className="mt-2">
                    <div className="mb-1.5 flex items-center gap-2 border-b border-slate-200 pb-1">
                      <span className="font-serif text-[18px] leading-none text-brand-700">
                        ℞
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-slate-400">
                        Prescription
                      </span>
                    </div>
                    <ol className="ml-5 list-decimal space-y-1">
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
                <div className="mt-4 pt-2 flex items-end justify-between">
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
                        className="ml-auto mb-1"
                        style={{ maxHeight: "48px", maxWidth: "120px" }}
                      />
                    ) : (
                      <div className="mb-1 h-10 w-28 border-b border-slate-400" />
                    )}
                    <div className="text-[10px] font-semibold text-slate-800">
                      Dr. {d.full_name}
                    </div>
                    {d.qualification ? (
                      <div className="text-[9px] text-slate-500">
                        {d.qualification}
                      </div>
                    ) : null}
                    {d.registration_number ? (
                      <div className="text-[9px] text-slate-500">
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
            className="print-area mx-auto w-[210mm] min-h-[297mm] bg-white p-10 text-[12px] leading-snug text-slate-900 shadow-soft print:m-0 print:p-8 print:shadow-none"
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
    <div className="mt-2">
      <div className="mb-1 flex items-center gap-2 border-b border-slate-200 pb-1">
        <span className="text-[10px] uppercase tracking-widest text-slate-400">
          Immunization
        </span>
      </div>
      <ul className="ml-4 list-disc space-y-1">
        {printable.map((record) => (
          <li key={record.id}>
            <span className="font-semibold">{record.vaccine_name}</span>
            {immunizationLine(record) ? (
              <span className="text-slate-600"> - {immunizationLine(record)}</span>
            ) : null}
            {record.next_due_date ? (
              <div className="text-[9px] leading-tight text-slate-400">
                Next due: {formatDate(record.next_due_date)}
              </div>
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
    <div className="mb-1.5">
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
