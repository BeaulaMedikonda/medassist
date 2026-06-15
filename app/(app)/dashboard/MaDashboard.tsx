// "use client";

// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { useEffect, useMemo, useState } from "react";
// import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
// import { StatCard } from "@/components/dashboard/StatCard";
// import { DashboardHero } from "@/components/dashboard/DashboardHero";
// import {
//   CheckCircleIcon,
//   ClipboardIcon,
//   ClockIcon,
//   GlobeIcon,
//   // PlusIcon,
//   UsersIcon,
// } from "@/components/dashboard/icons";
// import { initials } from "@/lib/dashboard-utils";
// import { supabaseBrowser } from "@/lib/supabase/browser";
// import type { Clinic, Doctor, Patient, Visit } from "@/types/db";

// type VitalTrendVisit = Pick<
//   Visit,
//   | "id"
//   | "patient_id"
//   | "visit_date"
//   | "bp_systolic"
//   | "bp_diastolic"
//   | "pulse"
//   | "temperature_f"
//   | "spo2"
//   | "weight_kg"
// >;

// type TrendTab = "bp" | "spo2" | "weight" | "pulse" | "temperature";
// type ChartPoint = { date: string; value: number };
// type ChartSeries = {
//   label: string;
//   color: string;
//   points: ChartPoint[];
// };
// type PainMarker = {
//   id: string;
//   side: "front" | "back";
//   location: string;
//   x: number;
//   y: number;
//   intensity: number;
//   painType: string;
// };
// type PainRegion = {
//   key: string;
//   label: string;
//   shape: "rect" | "ellipse";
//   x: number;
//   y: number;
//   width: number;
//   height: number;
// };
// type SavedPainMap = {
//   id: string;
//   pain_type: string | null;
//   intensity: number | null;
//   pain_summary: string | null;
//   marked_points: string[] | null;
//   created_at: string;
// };

// export function MaDashboard({
//   member,
//   clinic,
//   todayVisits,
//   currentQueueVisits,
//   patientById,
//   assignments,
//   doctorRoster,
//   currentUserId,
//   vitalTrendVisits,
//   portalRequestCount,
//   hasOldPortalRequest,
//   initialPainMapPatientId = "",
//   initialPainMapOpen = false,
//   initialPainMapReturnTo = "",
// }: {
//   member: Doctor;
//   clinic: Clinic;
//   todayVisits: Visit[];
//   currentQueueVisits: Visit[];
//   patientById: Record<string, Patient>;
//   assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
//   doctorRoster: Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
//   currentUserId: string;
//   vitalTrendVisits: VitalTrendVisit[];
//   portalRequestCount: number;
//   hasOldPortalRequest: boolean;
//   initialPainMapPatientId?: string;
//   initialPainMapOpen?: boolean;
//   initialPainMapReturnTo?: string;
// }) {
//   const [trendsOpen, setTrendsOpen] = useState(false);
//   const [painMapOpen, setPainMapOpen] = useState(initialPainMapOpen);
//   const painMapVisits = useMemo(
//     () => currentQueueVisits.filter((v) =>
//       ["queued", "intake", "in_progress", "awaiting_review"].includes(v.status),
//     ),
//     [currentQueueVisits],
//   );
//   const queueItems = currentQueueVisits.filter((v) =>
//     ["queued", "in_progress", "intake", "awaiting_review"].includes(v.status),
//   );

//   useEffect(() => {
//     if (initialPainMapOpen) setPainMapOpen(true);
//   }, [initialPainMapOpen]);

//   const assignmentsByVisit = new Map<
//     string,
//     Array<{ doctor_id: string; role: string }>
//   >();
//   for (const a of assignments) {
//     const list = assignmentsByVisit.get(a.visit_id) || [];
//     list.push(a);
//     assignmentsByVisit.set(a.visit_id, list);
//   }

//   const doctorById = new Map(doctorRoster.map((d) => [d.id, d]));
//   const checkedIn = queueItems.length;
//   const withDoctor = queueItems.filter((v) => v.status === "in_progress").length;
//   const completedToday = todayVisits.filter((v) => v.status === "completed").length;
//   const pendingIntake = queueItems.filter((v) => !hasVisitVitals(v)).length;
//   const todayMidnight = new Date();
//   todayMidnight.setHours(0, 0, 0, 0);

//   const [queuePage, setQueuePage] = useState(1);
//   const queuePageData = getClientPageItems(queueItems, queuePage, 10);

//   return (
//     <div className="space-y-8">
//       <DashboardHero name={member.full_name} clinicName={clinic.name} waveEmoji />

//       {/* Quick-action shortcuts */}
//       <div className="flex flex-wrap gap-2">
//         <Link
//           href="/emr/new"
//           className="inline-flex items-center gap-2 rounded-xl border border-[#0ea5a4]/25 bg-teal-50 px-4 py-2.5 text-[13px] font-bold text-[#0f8f83] transition hover:bg-teal-100 dark:border-teal-800/40 dark:bg-teal-900/20 dark:text-teal-300 dark:hover:bg-teal-900/40"
//         >
//           <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
//           New Intake
//         </Link>
//         <Link
//           href="/emr"
//           className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
//         >
//           <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="9" r="5"/><path d="M16 16l-3-3"/></svg>
//           Find Patient
//         </Link>
//         <Link
//           href="/appointments"
//           className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:bg-ink-800"
//         >
//           <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="14" height="13" rx="2"/><path d="M7 2v4M13 2v4M3 8h14"/></svg>
//           Appointments
//         </Link>
//         {portalRequestCount > 0 && (
//           <Link
//             href="/patient-portal-requests"
//             className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-[13px] font-bold text-violet-700 transition hover:bg-violet-100 dark:border-violet-800/40 dark:bg-violet-900/20 dark:text-violet-300"
//           >
//             <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="10" cy="10" r="8"/><path d="M10 6v4l2 2"/></svg>
//             Portal Requests
//             <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
//               {portalRequestCount}
//             </span>
//           </Link>
//         )}
//       </div>

//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-5">
//         <StatCard
//           label="Current Queue"
//           value={checkedIn}
//           hint="patients checked in"
//           icon={<UsersIcon />}
//           tone="brand"
//         />
//         <StatCard
//           label="With Doctor"
//           value={withDoctor}
//           hint="currently being seen"
//           icon={<ClockIcon />}
//           tone="sky"
//         />
//         <StatCard
//           label="Reviewed"
//           value={completedToday}
//           hint="completed visits"
//           icon={<CheckCircleIcon />}
//           tone="accent"
//         />
//         <StatCard
//           label="Pending Intake"
//           value={pendingIntake}
//           hint="vitals not captured"
//           icon={<ClipboardIcon />}
//           tone="amber"
//         />
//         <StatCard
//           label="Portal Requests"
//           value={portalRequestCount}
//           hint="awaiting doctor assignment"
//           icon={<GlobeIcon />}
//           tone={portalRequestCount === 0 ? "slate" : hasOldPortalRequest ? "amber" : "violet"}
//           href="/patient-portal-requests"
//         />
//       </section>

//       <section>
//         <div className="mb-3 flex items-center justify-between">
//           <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
//             Current Intake Queue
//           </h2>
//           <Link href="/emr/new" className="btn-teal">
//             <PlusIcon />
//             New EMR
//           </Link>
//         </div>

//         <div className="overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800/70 dark:bg-ink-900">
//           <table className="w-full text-left text-sm">
//             <thead>
//               <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#f7f9fc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-500">
//                 <th className="px-5 py-3.5">Patient</th>
//                 <th className="px-5 py-3.5">EMR ID</th>
//                 <th className="px-5 py-3.5">Vitals</th>
//                 <th className="px-5 py-3.5">Doctor</th>
//                 <th className="px-5 py-3.5">Status</th>
//                 <th className="px-5 py-3.5 text-right">Action</th>
//               </tr>
//             </thead>
//             <tbody>

//               {queueItems.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="px-5 py-16 text-center text-sm font-medium text-[#64748b] dark:text-ink-500"
//                   >
//                     No records yet.
//                   </td>
//                 </tr>
//               ) : (
//                 queuePageData.pageItems.map((v) => {
//                   const patient = patientById[v.patient_id];
//                   if (!patient) return null;

//                   const assigned = (assignmentsByVisit.get(v.id) || [])
//                     .map((a) => doctorById.get(a.doctor_id))
//                     .filter(Boolean);
//                   const doctorName =
//                     assigned.length > 0
//                       ? `Dr. ${assigned[0]!.full_name.split(" ")[0]}`
//                       : "Unassigned";
//                   const hasVitals = hasVisitVitals(v);
//                   const carriedOver = carriedOverLabel(v.visit_date, todayMidnight);

//                   return (
//                     <tr
//                       key={v.id}
//                       className="border-b border-[rgba(15,23,42,0.04)] transition-colors last:border-0 hover:bg-[#f7f9fc] dark:border-ink-800/60 dark:hover:bg-ink-800/40"
//                     >
//                       <td className="px-5 py-3.5">
//                         <div className="flex items-center gap-3">
//                           <span
//                             className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
//                             style={{
//                               background:
//                                 "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
//                             }}
//                           >
//                             {initials(patient.full_name)}
//                           </span>
//                           <div className="min-w-0">
//                             <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
//                               {patient.full_name}
//                             </div>
//                             <div className="flex items-center gap-1.5 text-[11px] text-[#64748b] dark:text-ink-500">
//                               {patient.age != null || patient.sex ? (
//                                 <span>{patient.age != null ? `${patient.age}${patient.sex || ""}` : patient.sex}</span>
//                               ) : null}
//                               {carriedOver && (
//                                 <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
//                                   {carriedOver}
//                                 </span>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b] dark:text-ink-400">
//                         {patient.emr_number}
//                       </td>
//                       <td className="px-5 py-3.5">
//                         <span
//                           className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
//                             hasVitals
//                               ? "bg-[#ecfdf5] text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300"
//                               : "bg-[#fff7ed] text-[#ea580c] dark:bg-amber-900/30 dark:text-amber-300"
//                           }`}
//                         >
//                           {hasVitals ? "Captured" : "Pending"}
//                         </span>
//                       </td>
//                       <td className="px-5 py-3.5 text-[#334155] dark:text-ink-300">
//                         {doctorName}
//                       </td>
//                       <td className="px-5 py-3.5">
//                         <StatusPill status={v.status} />
//                       </td>
//                       <td className="px-5 py-3.5 text-right">
//                         <Link
//                           href={`/emr/${patient.id}/visits/${v.id}/intake`}
//                           className="inline-flex items-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1 text-[12px] font-semibold text-[#0ea5a4] transition hover:border-[#0ea5a4]/40 hover:bg-[#ecfdfc] dark:border-ink-700 dark:bg-ink-900 dark:hover:bg-ink-800"
//                         >
//                           Intake
//                         </Link>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//           <ClientPagination
//             page={queuePageData.currentPage}
//             pageSize={10}
//             totalItems={queueItems.length}
//             onPageChange={setQueuePage}
//             label="patients"
//           />
//         </div>
//       </section>

//       <QuickActions
//         onOpenVitalTrends={() => setTrendsOpen(true)}
//         onOpenPainMap={() => setPainMapOpen(true)}
//       />

//       {trendsOpen ? (
//         <VitalTrendsModal
//           patients={patientById}
//           visits={vitalTrendVisits}
//           onClose={() => setTrendsOpen(false)}
//         />
//       ) : null}

//       {painMapOpen ? (
//         <GraphicPainMapModal
//           clinicId={clinic.id}
//           patients={patientById}
//           visits={painMapVisits}
//           initialPatientId={initialPainMapPatientId}
//           returnTo={initialPainMapReturnTo}
//           onClose={() => setPainMapOpen(false)}
//         />
//       ) : null}
//     </div>
//   );
// }

// function QuickActions({
//   onOpenVitalTrends,
//   onOpenPainMap,
// }: {
//   onOpenVitalTrends: () => void;
//   onOpenPainMap: () => void;
// }) {
//   const router = useRouter();

//   const modules = [
//     {
//       icon: "Chart",
//       title: "Graphical Vital Trends",
//       text: "BP, weight, SpO2 trend charts over time",
//       onClick: onOpenVitalTrends,
//     },
//     {
//       icon: "Pain",
//       title: "Graphic Pain Map",
//       text: "Patient marks pain locations on a body diagram",
//       onClick: onOpenPainMap,
//     },
//     {
//       icon: "Vax",
//       title: "Immunization Registry",
//       text: "Record and report patient vaccination history with CVX",
//       onClick: () => router.push("/immunizations"),
//     },
//   ];

//   return (
//     <section>
//       <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
//         Clinical Tools
//       </h2>
//       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
//         {modules.map((m) => (
//           <button
//             type="button"
//             key={m.title}
//             title={`Open ${m.title}`}
//             onClick={m.onClick}
//             className="group relative min-h-[150px] overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white p-5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-10px_rgba(15,23,42,0.16)] dark:border-ink-800/70 dark:bg-ink-900"
//           >
//             <div className="mb-4 inline-flex rounded-full bg-[#ecfdfc] px-3 py-1 text-xs font-bold text-[#0f948f] dark:bg-teal-900/30 dark:text-teal-200">
//               {m.icon}
//             </div>
//             <h3 className="text-[15px] font-semibold text-[#0f172a] dark:text-ink-100">
//               {m.title}
//             </h3>
//             <p className="mt-2 text-[13px] leading-relaxed text-[#64748b] dark:text-ink-500">
//               {m.text}
//             </p>
//           </button>
//         ))}
//       </div>
//     </section>
//   );
// }

// function VitalTrendsModal({
//   patients,
//   visits,
//   onClose,
// }: {
//   patients: Record<string, Patient>;
//   visits: VitalTrendVisit[];
//   onClose: () => void;
// }) {
//   const [activeTab, setActiveTab] = useState<TrendTab>("bp");
//   const patientOptions = useMemo(() => {
//     const ids = Array.from(new Set(visits.map((v) => v.patient_id)));
//     return ids
//       .map((id) => patients[id])
//       .filter(Boolean)
//       .sort((a, b) => a.full_name.localeCompare(b.full_name));
//   }, [patients, visits]);
//   const [selectedPatientId, setSelectedPatientId] = useState(
//     patientOptions[0]?.id || "",
//   );

//   const selectedPatient = patients[selectedPatientId] || patientOptions[0] || null;
//   const selectedVisits = useMemo(() => {
//     if (!selectedPatient) return [];
//     return visits
//       .filter((v) => v.patient_id === selectedPatient.id)
//       .sort(
//         (a, b) =>
//           new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime(),
//       );
//   }, [selectedPatient, visits]);
//   const chart = getChartSeries(activeTab, selectedVisits);
//   const readingVisits = useMemo(
//     () => getReadingVisits(activeTab, selectedVisits),
//     [activeTab, selectedVisits],
//   );
//   const latestReadingVisit = readingVisits[readingVisits.length - 1] || null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
//       <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-950">
//         <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-ink-800">
//           <div>
//             <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">
//               Graphical Vital Trends
//             </h2>
//             <p className="mt-1 text-xs font-medium text-slate-500 dark:text-ink-500">
//               Last 30 days from saved intake visits
//             </p>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
//             aria-label="Close vital trends"
//           >
//             <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
//               <path d="M5 5l10 10M15 5L5 15" />
//             </svg>
//           </button>
//         </div>

//         <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-5 py-5">
//           <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
//             <label className="block">
//               <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
//                 Patient
//               </span>
//               <select
//                 value={selectedPatient?.id || ""}
//                 onChange={(e) => setSelectedPatientId(e.target.value)}
//                 className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
//               >
//                 {patientOptions.length === 0 ? (
//                   <option value="">No vital records</option>
//                 ) : null}
//                 {patientOptions.map((p) => (
//                   <option key={p.id} value={p.id}>
//                     {p.full_name} - {p.emr_number}
//                   </option>
//                 ))}
//               </select>
//             </label>
//             <div className="text-xs font-medium text-slate-500 dark:text-ink-500">
//               {readingVisits.length} reading
//               {readingVisits.length === 1 ? "" : "s"}
//               {latestReadingVisit
//                 ? ` | Latest ${formatShortDate(latestReadingVisit.visit_date)}`
//                 : ""}
//             </div>
//           </div>

//           <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-ink-800">
//             {[
//               ["bp", "BP"],
//               ["spo2", "SpO2"],
//               ["weight", "Weight"],
//               ["pulse", "Pulse"],
//               ["temperature", "Temp"],
//             ].map(([key, label]) => (
//               <button
//                 key={key}
//                 type="button"
//                 onClick={() => setActiveTab(key as TrendTab)}
//                 className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition ${
//                   activeTab === key
//                     ? "border-[#0ea5a4] text-[#0f948f]"
//                     : "border-transparent text-slate-500 hover:text-slate-800 dark:text-ink-500 dark:hover:text-ink-200"
//                 }`}
//               >
//                 {label}
//               </button>
//             ))}
//           </div>

//           {chart.series.every((s) => s.points.length === 0) ? (
//             <div className="rounded-xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm font-medium text-slate-500 dark:border-ink-700 dark:text-ink-500">
//               No saved {chart.title.toLowerCase()} readings for this patient yet.
//             </div>
//           ) : (
//             <TrendChart chart={chart} />
//           )}

//           <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
//             {chart.warning}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function getReadingVisits(tab: TrendTab, visits: VitalTrendVisit[]) {
//   return visits.filter((visit) => {
//     if (tab === "bp") {
//       return visit.bp_systolic != null || visit.bp_diastolic != null;
//     }
//     if (tab === "spo2") return visit.spo2 != null;
//     if (tab === "weight") return visit.weight_kg != null;
//     if (tab === "pulse") return visit.pulse != null;
//     return visit.temperature_f != null;
//   });
// }

// function GraphicPainMapModal({
//   clinicId,
//   patients,
//   visits,
//   initialPatientId,
//   returnTo,
//   onClose,
// }: {
//   clinicId: string;
//   patients: Record<string, Patient>;
//   visits: Visit[];
//   initialPatientId?: string;
//   returnTo?: string;
//   onClose: () => void;
// }) {
//   const router = useRouter();
//   const [contextPatient, setContextPatient] = useState<Patient | null>(null);
//   const [contextVisits, setContextVisits] = useState<Visit[]>([]);
//   const [contextLoading, setContextLoading] = useState(false);
//   const mergedPatients = useMemo(
//     () =>
//       contextPatient
//         ? { ...patients, [contextPatient.id]: contextPatient }
//         : patients,
//     [contextPatient, patients],
//   );
//   const mergedVisits = useMemo(() => {
//     if (contextVisits.length === 0) return visits;
//     const byId = new Map<string, Visit>();
//     for (const visit of [...visits, ...contextVisits]) {
//       byId.set(visit.id, visit);
//     }
//     return Array.from(byId.values());
//   }, [contextVisits, visits]);
//   const visitOptions = useMemo(
//     () => {
//       const scopedVisits = initialPatientId
//         ? mergedVisits.filter((visit) => visit.patient_id === initialPatientId)
//         : mergedVisits;
//       return scopedVisits
//         .map((visit) => ({ visit, patient: mergedPatients[visit.patient_id] }))
//         .filter((item) => item.patient)
//         .sort(
//           (a, b) =>
//             new Date(b.visit.visit_date).getTime() -
//             new Date(a.visit.visit_date).getTime(),
//         );
//     },
//     [initialPatientId, mergedPatients, mergedVisits],
//   );
//   const [selectedVisitId, setSelectedVisitId] = useState(
//     visitOptions[0]?.visit.id || "",
//   );
//   const [intensity, setIntensity] = useState(3);
//   const [painType, setPainType] = useState("Sharp");
//   const [markers, setMarkers] = useState<PainMarker[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState<string | null>(null);
//   const [savedMaps, setSavedMaps] = useState<SavedPainMap[]>([]);
//   const [loadingSavedMaps, setLoadingSavedMaps] = useState(false);

//   const selectedVisit = visitOptions.find((item) => item.visit.id === selectedVisitId);
//   const selectedPatient = selectedVisit?.patient || null;

//   useEffect(() => {
//     if (!initialPatientId) return;
//     if (visitOptions.length > 0) return;

//     const patientId = initialPatientId;
//     let cancelled = false;
//     async function loadContext() {
//       setContextLoading(true);
//       const res = await fetch(
//         `/api/pain-maps/context?patientId=${encodeURIComponent(patientId)}`,
//       );
//       const result = (await res.json().catch(() => ({}))) as {
//         patient?: Patient;
//         visits?: Visit[];
//         error?: string;
//       };
//       if (cancelled) return;
//       if (res.ok) {
//         setContextPatient(result.patient || null);
//         setContextVisits(result.visits || []);
//         setMessage(null);
//       } else {
//         setMessage(result.error || "Could not load patient visits.");
//       }
//       setContextLoading(false);
//     }

//     void loadContext();
//     return () => {
//       cancelled = true;
//     };
//   }, [initialPatientId, visitOptions.length]);

//   useEffect(() => {
//     if (!selectedVisitId && visitOptions[0]?.visit.id) {
//       setSelectedVisitId(visitOptions[0].visit.id);
//     }
//   }, [selectedVisitId, visitOptions]);

//   useEffect(() => {
//     if (!selectedPatient) {
//       setSavedMaps([]);
//       return;
//     }

//     const selectedPatientId = selectedPatient.id;
//     let cancelled = false;
//     async function loadSavedMaps() {
//       setLoadingSavedMaps(true);
//       const { data } = await supabaseBrowser()
//         .from("graphic_pain_maps")
//         .select("id, pain_type, intensity, pain_summary, marked_points, created_at")
//         .eq("clinic_id", clinicId)
//         .eq("patient_id", selectedPatientId)
//         .order("created_at", { ascending: false })
//         .limit(5);

//       if (!cancelled) {
//         setSavedMaps((data || []) as SavedPainMap[]);
//         setLoadingSavedMaps(false);
//       }
//     }

//     void loadSavedMaps();
//     return () => {
//       cancelled = true;
//     };
//   }, [clinicId, selectedPatient]);

//   async function savePainMap() {
//     setMessage(null);
//     if (!selectedVisit || !selectedPatient) {
//       setMessage("Select a patient visit before saving.");
//       return;
//     }
//     if (markers.length === 0) {
//       setMessage("Mark at least one pain location before saving.");
//       return;
//     }

//     setSaving(true);
//     const res = await fetch("/api/pain-maps/create", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         patientId: selectedPatient.id,
//         visitId: selectedVisit.visit.id,
//         painType,
//         intensity,
//         painLocations: markers.map((marker) => marker.location),
//         markedPoints: markers.map(formatMarkedPoint),
//         painSummary: buildPainSummary(markers),
//         markers,
//       }),
//     });
//     const result = (await res.json().catch(() => ({}))) as {
//       error?: string;
//       painMap?: SavedPainMap;
//     };
//     setSaving(false);

//     if (!res.ok) {
//       setMessage(result.error || "Could not save pain map.");
//       return;
//     }

//     setMessage("Pain map saved to Supabase.");
//     if (result.painMap) {
//       setSavedMaps((current) => [result.painMap as SavedPainMap, ...current].slice(0, 5));
//     }
//     setMarkers([]);
//     if (returnTo) {
//       const nextUrl = new URL(returnTo, window.location.origin);
//       nextUrl.searchParams.set(
//         "painMapSummary",
//         `${markers.length} marker${markers.length === 1 ? "" : "s"} - ${painType} - ${intensity}/10`,
//       );
//       router.replace(`${nextUrl.pathname}${nextUrl.search}`);
//     }
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm">
//       <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[18px] border border-slate-200 bg-white text-slate-900 shadow-2xl">
//         <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
//           <div>
//             <h2 className="text-lg font-bold">Graphic Pain Map</h2>
//             <p className="mt-1 text-sm text-slate-500">
//               Click anywhere on the body to mark a pain location. Click a marker to remove it.
//             </p>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
//           >
//             Close
//           </button>
//         </div>

//         <div className="max-h-[calc(94vh-73px)] overflow-y-auto p-5">
//           <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
//             <label className="block">
//               <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
//                 Patient visit
//               </span>
//               <select
//                 value={selectedVisitId}
//                 onChange={(e) => {
//                   setSelectedVisitId(e.target.value);
//                   setMarkers([]);
//                   setMessage(null);
//                 }}
//                 className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
//               >
//                 {visitOptions.length === 0 ? (
//                   <option value="">
//                     {contextLoading ? "Loading visits..." : "No visits available"}
//                   </option>
//                 ) : null}
//                 {visitOptions.map(({ visit, patient }) => (
//                   <option key={visit.id} value={visit.id}>
//                     {patient!.full_name} - {patient!.emr_number} -{" "}
//                     {formatShortDate(visit.visit_date)}
//                   </option>
//                 ))}
//               </select>
//             </label>

//             <label className="block">
//               <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
//                 Pain type
//               </span>
//               <select
//                 value={painType}
//                 onChange={(e) => setPainType(e.target.value)}
//                 className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
//               >
//                 <option>Sharp</option>
//                 <option>Dull</option>
//                 <option>Burning</option>
//                 <option>Cramping</option>
//                 <option>Throbbing</option>
//                 <option>Numbness</option>
//               </select>
//             </label>
//           </div>

//           <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
//             <div>
//               <div className="grid gap-5 sm:grid-cols-2">
//                 <BodyMap
//                   side="front"
//                   title="FRONT"
//                   markers={markers}
//                   intensity={intensity}
//                   painType={painType}
//                   onAdd={(marker) => setMarkers((prev) => [...prev, marker])}
//                   onRemove={(id) =>
//                     setMarkers((prev) => prev.filter((marker) => marker.id !== id))
//                   }
//                 />
//                 <BodyMap
//                   side="back"
//                   title="BACK"
//                   markers={markers}
//                   intensity={intensity}
//                   painType={painType}
//                   onAdd={(marker) => setMarkers((prev) => [...prev, marker])}
//                   onRemove={(id) =>
//                     setMarkers((prev) => prev.filter((marker) => marker.id !== id))
//                   }
//                 />
//               </div>

//               <label className="mt-6 block">
//                 <span className="mb-3 block text-sm font-medium text-slate-700">
//                   Pain Intensity (0-10) -{" "}
//                   <span className="font-bold text-teal-600">{intensity}</span>
//                 </span>
//                 <input
//                   type="range"
//                   min={0}
//                   max={10}
//                   value={intensity}
//                   onChange={(e) => setIntensity(Number(e.target.value))}
//                   className="w-full accent-teal-400"
//                 />
//               </label>
//             </div>

//             <aside className="space-y-5">
//               <div>
//                 <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
//                   Legend
//                 </h3>
//                 <LegendItem color="#ef4444" label="Severe (8-10)" />
//                 <LegendItem color="#f59e0b" label="Moderate (4-7)" />
//                 <LegendItem color="#10b981" label="Mild (1-3)" />
//               </div>

//               <div>
//                 <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
//                   Marked points
//                 </h3>
//                 {markers.length === 0 ? (
//                   <p className="text-sm text-slate-500">No markers yet</p>
//                 ) : (
//                   <ul className="space-y-2 text-sm text-slate-700">
//                     {markers.map((marker, index) => (
//                       <li key={marker.id}>
//                         {index + 1}. {marker.location} - {marker.painType} -{" "}
//                         {marker.intensity}/10
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setMarkers([])}
//                 disabled={markers.length === 0}
//                 className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition enabled:hover:bg-slate-50 disabled:opacity-50"
//               >
//                 Clear All
//               </button>

//               <button
//                 type="button"
//                 onClick={savePainMap}
//                 disabled={saving || markers.length === 0 || !selectedVisit}
//                 className="w-full rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white transition enabled:hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 {saving ? "Saving..." : "Save Pain Map"}
//               </button>

//               {message ? (
//                 <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
//                   {message}
//                 </p>
//               ) : null}

//               <div>
//                 <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
//                   Saved pain maps
//                 </h3>
//                 {loadingSavedMaps ? (
//                   <p className="text-sm text-slate-500">Loading saved maps...</p>
//                 ) : savedMaps.length === 0 ? (
//                   <p className="text-sm text-slate-500">No saved pain maps for this patient.</p>
//                 ) : (
//                   <ul className="space-y-2">
//                     {savedMaps.map((map) => (
//                       <li
//                         key={map.id}
//                         className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
//                       >
//                         <div className="font-bold text-slate-900">
//                           {formatShortDate(map.created_at)} - {map.pain_type || "Pain"}{" "}
//                           {map.intensity != null ? `${map.intensity}/10` : ""}
//                         </div>
//                         <div className="mt-1 text-xs leading-relaxed text-slate-600">
//                           {map.pain_summary ||
//                             map.marked_points?.slice(0, 2).join("; ") ||
//                             "Pain map saved"}
//                         </div>
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//               </div>
//             </aside>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function BodyMap({
//   side,
//   title,
//   markers,
//   intensity,
//   painType,
//   onAdd,
//   onRemove,
// }: {
//   side: "front" | "back";
//   title: string;
//   markers: PainMarker[];
//   intensity: number;
//   painType: string;
//   onAdd: (marker: PainMarker) => void;
//   onRemove: (id: string) => void;
// }) {
//   const sideMarkers = markers.filter((marker) => marker.side === side);

//   function handleClick(event: React.MouseEvent<SVGSVGElement>) {
//     const svg = event.currentTarget;
//     const screenMatrix = svg.getScreenCTM();
//     if (!screenMatrix) return;

//     const point = svg.createSVGPoint();
//     point.x = event.clientX;
//     point.y = event.clientY;
//     const svgPoint = point.matrixTransform(screenMatrix.inverse());
//     const x = svgPoint.x;
//     const y = svgPoint.y;
//     const location = getPainLocation(side, x, y);
//     if (!location) return;

//     onAdd({
//       id: crypto.randomUUID(),
//       side,
//       location,
//       x: Number(x.toFixed(2)),
//       y: Number(y.toFixed(2)),
//       intensity,
//       painType,
//     });
//   }

//   return (
//     <div>
//       <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
//         {title}
//       </div>
//       <svg
//         viewBox="0 0 200 420"
//         preserveAspectRatio="xMidYMid meet"
//         className="aspect-[10/21] h-auto max-h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
//         onClick={handleClick}
//         role="img"
//         aria-label={`${title} body pain map`}
//       >
//         <BodyShape side={side} />
//         {sideMarkers.map((marker) => (
//           <circle
//             key={marker.id}
//             cx={marker.x}
//             cy={marker.y}
//             r="7"
//             fill={markerColor(marker.intensity)}
//             stroke="#ffffff"
//             strokeWidth="2"
//             onClick={(event) => {
//               event.stopPropagation();
//               onRemove(marker.id);
//             }}
//           >
//             <title>
//               {marker.location}: {marker.painType} pain, {marker.intensity}/10
//             </title>
//           </circle>
//         ))}
//       </svg>
//     </div>
//   );
// }

// function BodyShape({ side }: { side: "front" | "back" }) {
//   const stroke = side === "front" ? "#3b82f6" : "#6366f1";
//   const labelColor = side === "front" ? "#93c5fd" : "#a5b4fc";
//   const regions = getPainRegions(side);

//   return (
//     <g fill="#e0f2fe" stroke={stroke} strokeWidth="2">
//       {regions.map((region) =>
//         region.shape === "ellipse" ? (
//           <ellipse
//             key={region.key}
//             cx={region.x + region.width / 2}
//             cy={region.y + region.height / 2}
//             rx={region.width / 2}
//             ry={region.height / 2}
//             className="cursor-crosshair transition hover:fill-[#bae6fd]"
//           />
//         ) : (
//           <rect
//             key={region.key}
//             x={region.x}
//             y={region.y}
//             width={region.width}
//             height={region.height}
//             rx="10"
//             className="cursor-crosshair transition hover:fill-[#bae6fd]"
//           />
//         ),
//       )}
//       <text
//         x="100"
//         y="150"
//         textAnchor="middle"
//         fill={labelColor}
//         stroke="none"
//         fontSize="10"
//       >
//         {side === "front" ? "Chest" : "Upper Back"}
//       </text>
//       <text
//         x="100"
//         y="193"
//         textAnchor="middle"
//         fill={labelColor}
//         stroke="none"
//         fontSize="10"
//       >
//         {side === "front" ? "Abdomen" : "Lower Back"}
//       </text>
//       <text x="79" y="293" textAnchor="middle" fill={labelColor} stroke="none" fontSize="9">
//         {side === "front" ? "L-Thigh" : "L-Glute"}
//       </text>
//       <text x="121" y="293" textAnchor="middle" fill={labelColor} stroke="none" fontSize="9">
//         {side === "front" ? "R-Thigh" : "R-Glute"}
//       </text>
//     </g>
//   );
// }

// function getPainRegions(side: "front" | "back"): PainRegion[] {
//   const upperTorso = side === "front" ? "Chest pain" : "Upper Back pain";
//   const lowerTorso = side === "front" ? "Abdomen pain" : "Lower Back pain";
//   const leftUpperLeg = side === "front" ? "Left Thigh pain" : "Left Glute pain";
//   const rightUpperLeg = side === "front" ? "Right Thigh pain" : "Right Glute pain";

//   return [
//     { key: "head", label: "Head pain", shape: "ellipse", x: 70, y: 10, width: 60, height: 64 },
//     { key: "neck", label: "Neck pain", shape: "rect", x: 91, y: 72, width: 18, height: 18 },
//     { key: "left-shoulder", label: "Left Shoulder pain", shape: "ellipse", x: 40, y: 78, width: 42, height: 44 },
//     { key: "right-shoulder", label: "Right Shoulder pain", shape: "ellipse", x: 118, y: 78, width: 42, height: 44 },
//     { key: "left-hand", label: "Left Hand pain", shape: "ellipse", x: 18, y: 184, width: 36, height: 46 },
//     { key: "right-hand", label: "Right Hand pain", shape: "ellipse", x: 146, y: 184, width: 36, height: 46 },
//     { key: "left-arm", label: "Left Arm pain", shape: "rect", x: 27, y: 92, width: 25, height: 100 },
//     { key: "right-arm", label: "Right Arm pain", shape: "rect", x: 148, y: 92, width: 25, height: 100 },
//     { key: "upper-torso", label: upperTorso, shape: "rect", x: 55, y: 90, width: 90, height: 75 },
//     { key: "lower-torso", label: lowerTorso, shape: "rect", x: 55, y: 155, width: 90, height: 55 },
//     { key: "pelvis", label: side === "front" ? "Pelvis pain" : "Sacral pain", shape: "rect", x: 60, y: 210, width: 80, height: 42 },
//     { key: "left-thigh", label: leftUpperLeg, shape: "rect", x: 62, y: 252, width: 35, height: 82 },
//     { key: "right-thigh", label: rightUpperLeg, shape: "rect", x: 103, y: 252, width: 35, height: 82 },
//     { key: "left-leg", label: "Left Lower Leg pain", shape: "rect", x: 66, y: 334, width: 29, height: 66 },
//     { key: "right-leg", label: "Right Lower Leg pain", shape: "rect", x: 105, y: 334, width: 29, height: 66 },
//     { key: "left-foot", label: "Left Foot pain", shape: "ellipse", x: 62, y: 397, width: 36, height: 16 },
//     { key: "right-foot", label: "Right Foot pain", shape: "ellipse", x: 102, y: 397, width: 36, height: 16 },
//   ];
// }

// function getPainLocation(side: "front" | "back", x: number, y: number) {
//   const region = getPainRegions(side).find((item) => {
//     if (item.shape === "rect") {
//       return (
//         x >= item.x &&
//         x <= item.x + item.width &&
//         y >= item.y &&
//         y <= item.y + item.height
//       );
//     }

//     const cx = item.x + item.width / 2;
//     const cy = item.y + item.height / 2;
//     const rx = item.width / 2;
//     const ry = item.height / 2;
//     return ((x - cx) ** 2) / rx ** 2 + ((y - cy) ** 2) / ry ** 2 <= 1;
//   });

//   return region ? `${side} ${region.label}` : null;
// }

// function LegendItem({ color, label }: { color: string; label: string }) {
//   return (
//     <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
//       <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
//       {label}
//     </div>
//   );
// }

// function markerColor(intensity: number) {
//   if (intensity >= 8) return "#ef4444";
//   if (intensity >= 4) return "#f59e0b";
//   return "#10b981";
// }

// function formatMarkedPoint(marker: PainMarker) {
//   return `${marker.location} - ${marker.painType} - ${marker.intensity}/10`;
// }

// function buildPainSummary(markers: PainMarker[]) {
//   return markers.map(formatMarkedPoint).join("; ");
// }

// function getChartSeries(tab: TrendTab, visits: VitalTrendVisit[]) {
//   const configs = {
//     bp: {
//       title: "Blood pressure",
//       unit: "mmHg",
//       normal: "Normal: 90/60 - 120/80 mmHg",
//       warning: `${
//         visits.filter(
//           (v) => (v.bp_systolic || 0) > 120 || (v.bp_diastolic || 0) > 80,
//         ).length
//       } BP readings above normal range in the past 30 days.`,
//       series: [
//         {
//           label: "Systolic",
//           color: "#ef4444",
//           points: visits
//             .filter((v) => v.bp_systolic != null)
//             .map((v) => ({ date: v.visit_date, value: v.bp_systolic! })),
//         },
//         {
//           label: "Diastolic",
//           color: "#3b82f6",
//           points: visits
//             .filter((v) => v.bp_diastolic != null)
//             .map((v) => ({ date: v.visit_date, value: v.bp_diastolic! })),
//         },
//       ],
//     },
//     spo2: singleSeries(
//       "SpO2",
//       "%",
//       "Normal: 95 - 100%",
//       visits,
//       "spo2",
//       "#0ea5a4",
//       (v) =>
//         `${v.filter((n) => n < 95).length} SpO2 readings below normal range in the past 30 days.`,
//     ),
//     weight: singleSeries(
//       "Weight",
//       "kg",
//       "Trend only: compare against the patient's baseline.",
//       visits,
//       "weight_kg",
//       "#8b5cf6",
//       () => "Weight trend is stored from each intake visit for longitudinal review.",
//     ),
//     pulse: singleSeries(
//       "Pulse",
//       "bpm",
//       "Normal: 60 - 100 bpm",
//       visits,
//       "pulse",
//       "#f97316",
//       (v) =>
//         `${v.filter((n) => n < 60 || n > 100).length} pulse readings outside normal range in the past 30 days.`,
//     ),
//     temperature: singleSeries(
//       "Temperature",
//       "F",
//       "Normal: below 100 F",
//       visits,
//       "temperature_f",
//       "#dc2626",
//       (v) =>
//         `${v.filter((n) => n >= 100).length} temperature readings at or above 100 F in the past 30 days.`,
//     ),
//   };

//   return configs[tab];
// }

// function singleSeries<K extends keyof VitalTrendVisit>(
//   title: string,
//   unit: string,
//   normal: string,
//   visits: VitalTrendVisit[],
//   key: K,
//   color: string,
//   warning: (values: number[]) => string,
// ) {
//   const points = visits
//     .filter((v) => typeof v[key] === "number")
//     .map((v) => ({ date: v.visit_date, value: v[key] as number }));

//   return {
//     title,
//     unit,
//     normal,
//     warning: warning(points.map((p) => p.value)),
//     series: [{ label: title, color, points }],
//   };
// }

// function TrendChart({
//   chart,
// }: {
//   chart: {
//     title: string;
//     unit: string;
//     normal: string;
//     series: ChartSeries[];
//   };
// }) {
//   const width = 680;
//   const height = 280;
//   const pad = { top: 22, right: 28, bottom: 48, left: 50 };
//   const allPoints = chart.series.flatMap((s) => s.points);
//   const values = allPoints.map((p) => p.value);
//   const minValue = Math.min(...values);
//   const maxValue = Math.max(...values);
//   const valuePadding = Math.max(5, (maxValue - minValue || 10) * 0.2);
//   const yMin = Math.floor(minValue - valuePadding);
//   const yMax = Math.ceil(maxValue + valuePadding);
//   const dates = Array.from(new Set(allPoints.map((p) => p.date))).sort(
//     (a, b) => new Date(a).getTime() - new Date(b).getTime(),
//   );
//   const plotWidth = width - pad.left - pad.right;
//   const plotHeight = height - pad.top - pad.bottom;
//   const xForDate = (date: string) => {
//     const index = dates.indexOf(date);
//     return (
//       pad.left +
//       (dates.length <= 1 ? plotWidth / 2 : (index / (dates.length - 1)) * plotWidth)
//     );
//   };
//   const yForValue = (value: number) =>
//     pad.top + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;
//   const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
//     Math.round(yMax - (yMax - yMin) * ratio),
//   );

//   return (
//     <div>
//       <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
//         <svg
//           viewBox={`0 0 ${width} ${height}`}
//           className="h-[280px] min-w-[620px] w-full"
//           role="img"
//           aria-label={`${chart.title} trend chart`}
//         >
//           {yTicks.map((tick) => {
//             const y = yForValue(tick);
//             return (
//               <g key={tick}>
//                 <line
//                   x1={pad.left}
//                   x2={width - pad.right}
//                   y1={y}
//                   y2={y}
//                   stroke="#e2e8f0"
//                   strokeWidth="1"
//                 />
//                 <text
//                   x={pad.left - 8}
//                   y={y + 4}
//                   textAnchor="end"
//                   className="fill-slate-400 text-[11px]"
//                 >
//                   {tick}
//                 </text>
//               </g>
//             );
//           })}
//           <text x={pad.left} y={14} className="fill-slate-500 text-[11px]">
//             {chart.unit}
//           </text>
//           {chart.series.map((series) => {
//             const points = series.points.map((p) => ({
//               x: xForDate(p.date),
//               y: yForValue(p.value),
//               value: p.value,
//               date: p.date,
//             }));
//             const path = points
//               .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
//               .join(" ");

//             return (
//               <g key={series.label}>
//                 <path
//                   d={path}
//                   fill="none"
//                   stroke={series.color}
//                   strokeWidth="3"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//                 {points.map((p) => (
//                   <g key={`${series.label}-${p.date}-${p.value}`}>
//                     <circle cx={p.x} cy={p.y} r="4" fill={series.color} />
//                     <title>
//                       {series.label}: {p.value} on {formatShortDate(p.date)}
//                     </title>
//                   </g>
//                 ))}
//               </g>
//             );
//           })}
//           {dates.map((date, index) => {
//             if (dates.length > 6 && index % Math.ceil(dates.length / 6) !== 0) {
//               return null;
//             }

//             return (
//               <text
//                 key={date}
//                 x={xForDate(date)}
//                 y={height - 18}
//                 textAnchor="middle"
//                 className="fill-slate-400 text-[11px]"
//               >
//                 {formatShortDate(date)}
//               </text>
//             );
//           })}
//         </svg>
//       </div>
//       <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-ink-400">
//         {chart.series.map((series) => (
//           <span key={series.label} className="inline-flex items-center gap-2">
//             <span
//               className="h-2.5 w-2.5 rounded-full"
//               style={{ backgroundColor: series.color }}
//             />
//             {series.label}
//           </span>
//         ))}
//       </div>
//       <p className="mt-3 text-xs font-medium text-slate-500 dark:text-ink-500">
//         {chart.normal}
//       </p>
//     </div>
//   );
// }

// function formatShortDate(date: string) {
//   return new Intl.DateTimeFormat("en", {
//     month: "short",
//     day: "numeric",
//   }).format(new Date(date));
// }

// function hasVisitVitals(visit: Visit) {
//   return (
//     visit.bp_systolic != null ||
//     visit.bp_diastolic != null ||
//     visit.pulse != null ||
//     visit.temperature_f != null ||
//     visit.spo2 != null ||
//     visit.weight_kg != null ||
//     visit.height_cm != null
//   );
// }

// function carriedOverLabel(visitDate: string, todayMidnight: Date): string | null {
//   const date = new Date(visitDate);
//   date.setHours(0, 0, 0, 0);
//   const diffDays = Math.floor(
//     (todayMidnight.getTime() - date.getTime()) / 86_400_000,
//   );
//   if (diffDays <= 0) return null;
//   if (diffDays === 1) return "Since yesterday";
//   return `${diffDays}d waiting`;
// }

// function StatusPill({ status }: { status: Visit["status"] }) {
//   const map: Record<Visit["status"], { cls: string; label: string }> = {
//     intake: {
//       cls: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400",
//       label: "Intake",
//     },
//     queued: {
//       cls: "bg-[#ecfeff] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",
//       label: "In Queue",
//     },
//     in_progress: {
//       cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
//       label: "With Doctor",
//     },
//     awaiting_review: {
//       cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
//       label: "Draft",
//     },
//     completed: {
//       cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
//       label: "Done",
//     },
//     cancelled: {
//       cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
//       label: "Cancelled",
//     },
//   };
//   const { cls, label } = map[status];

//   return (
//     <span
//       className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
//     >
//       {label}
//     </span>
//   );
// }

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import {
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  GlobeIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/dashboard/icons";
import { initials } from "@/lib/dashboard-utils";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Clinic, Doctor, Patient, Visit } from "@/types/db";

const QUEUE_PAGE_SIZE = 10;

type VitalTrendVisit = Pick<
  Visit,
  | "id"
  | "patient_id"
  | "visit_date"
  | "bp_systolic"
  | "bp_diastolic"
  | "pulse"
  | "temperature_f"
  | "spo2"
  | "weight_kg"
>;

type TrendTab = "bp" | "spo2" | "weight" | "pulse" | "temperature";
type ChartPoint = { date: string; value: number };
type ChartSeries = {
  label: string;
  color: string;
  points: ChartPoint[];
};
type QueueFilter = "today" | "withDoctor" | "reviewed" | "pendingIntake";
type PainMarker = {
  id: string;
  side: "front" | "back";
  location: string;
  x: number;
  y: number;
  intensity: number;
  painType: string;
};
type PainRegion = {
  key: string;
  label: string;
  shape: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
};
type SavedPainMap = {
  id: string;
  pain_type: string | null;
  intensity: number | null;
  pain_summary: string | null;
  marked_points: string[] | null;
  created_at: string;
};

const doctorCardTones = ["brand", "sky", "accent", "violet", "amber", "rose"] as const;
const queueFilterTitles: Record<QueueFilter, string> = {
  today: "Current Intake Queue",
  withDoctor: "With Doctor",
  reviewed: "Reviewed Patients",
  pendingIntake: "Pending Intake",
};

export function MaDashboard({
  member,
  clinic,
  todayVisits,
  awaitingVisits,
  patientById,
  assignments,
  doctorRoster,
  currentUserId,
  vitalTrendVisits,
  portalRequestCount,
  hasOldPortalRequest,
  initialPainMapPatientId = "",
  initialPainMapVisitId = "",
  initialPainMapOpen = false,
  initialPainMapReturnTo = "",
}: {
  member: Doctor;
  clinic: Clinic;
  todayVisits: Visit[];
  awaitingVisits: Visit[];
  patientById: Record<string, Patient>;
  assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
  doctorRoster: Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
  currentUserId: string;
  vitalTrendVisits: VitalTrendVisit[];
  portalRequestCount: number;
  hasOldPortalRequest: boolean;
  initialPainMapPatientId?: string;
  initialPainMapVisitId?: string;
  initialPainMapOpen?: boolean;
  initialPainMapReturnTo?: string;
}) {
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [painMapOpen, setPainMapOpen] = useState(initialPainMapOpen);
  const [queuePage, setQueuePage] = useState(1);
  const [selectedDoctorQueueId, setSelectedDoctorQueueId] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<QueueFilter | null>(null);
  const painMapVisits = useMemo(() => {
    const byId = new Map<string, Visit>();
    for (const visit of [...todayVisits, ...awaitingVisits]) {
      byId.set(visit.id, visit);
    }
    return Array.from(byId.values());
  }, [todayVisits, awaitingVisits]);
  const queueItems = [...todayVisits, ...awaitingVisits].filter(
    (visit, index, visits) =>
      visits.findIndex((item) => item.id === visit.id) === index &&
      ["queued", "in_progress", "intake", "awaiting_review"].includes(visit.status),
  );

  useEffect(() => {
    if (initialPainMapOpen) setPainMapOpen(true);
  }, [initialPainMapOpen]);

  const assignmentsByVisit = new Map<
    string,
    Array<{ doctor_id: string; role: string }>
  >();
  for (const a of assignments) {
    const list = assignmentsByVisit.get(a.visit_id) || [];
    list.push(a);
    assignmentsByVisit.set(a.visit_id, list);
  }

  const doctorById = new Map(doctorRoster.map((d) => [d.id, d]));
  const assignedDoctorIdsForVisit = (visit: Visit) => {
    const assignedDoctorIds = new Set(
      (assignmentsByVisit.get(visit.id) || []).map((assignment) => assignment.doctor_id),
    );
    if (visit.doctor_id) assignedDoctorIds.add(visit.doctor_id);
    return assignedDoctorIds;
  };
  const hasDoctorAssigned = (visit: Visit) => assignedDoctorIdsForVisit(visit).size > 0;
  const checkedIn = queueItems.length;
  const withDoctorItems = queueItems.filter(
    (visit) => visit.status === "in_progress" || hasDoctorAssigned(visit),
  );
  const withDoctor = withDoctorItems.length;
  const reviewedItems = todayVisits.filter((v) => v.status === "completed");
  const completedToday = todayVisits.filter((v) => v.status === "completed").length;
  const pendingIntakeItems = queueItems.filter((v) => !hasVisitVitals(v));
  const pendingIntake = pendingIntakeItems.length;
  const doctorQueueCards = doctorRoster.map((doctor, index) => {
    const count = queueItems.filter((visit) => assignedDoctorIdsForVisit(visit).has(doctor.id)).length;

    return {
      doctor,
      count,
      tone: doctorCardTones[index % doctorCardTones.length],
    };
  });
  const unassignedQueueCount = queueItems.filter((visit) => !hasDoctorAssigned(visit)).length;
  const filterRows: Record<QueueFilter, Visit[]> = {
    today: queueItems,
    withDoctor: withDoctorItems,
    reviewed: reviewedItems,
    pendingIntake: pendingIntakeItems,
  };
  const filteredQueueItems = queueFilter
    ? filterRows[queueFilter].filter((visit) => {
    if (!selectedDoctorQueueId) return true;

    const assignedDoctorIds = assignedDoctorIdsForVisit(visit);
    if (selectedDoctorQueueId === "unassigned") {
      return assignedDoctorIds.size === 0;
    }

    return assignedDoctorIds.has(selectedDoctorQueueId);
      })
    : [];
  const selectedDoctor = selectedDoctorQueueId
    ? doctorRoster.find((doctor) => doctor.id === selectedDoctorQueueId)
    : null;
  const queueTitle = queueFilter ? queueFilterTitles[queueFilter] : "Current Intake Queue";
  const intakeQueueTitle = selectedDoctor
    ? `${queueTitle} - Dr. ${selectedDoctor.full_name.split(" ")[0] || selectedDoctor.full_name}`
    : selectedDoctorQueueId === "unassigned"
      ? `${queueTitle} - Unassigned`
      : queueTitle;
  const queuePageData = getClientPageItems(filteredQueueItems, queuePage, QUEUE_PAGE_SIZE);

  function selectQueueFilter(nextFilter: QueueFilter) {
    const resolvedFilter = queueFilter === nextFilter ? null : nextFilter;
    setQueueFilter(resolvedFilter);
    setQueuePage(1);
    if (!resolvedFilter || resolvedFilter === "today") {
      setSelectedDoctorQueueId(null);
    }
  }

  return (
    <div className="space-y-8">
      <DashboardHero name={member.full_name} clinicName={clinic.name} waveEmoji />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-5">
        <button
          type="button"
          onClick={() => selectQueueFilter("today")}
          aria-pressed={queueFilter === "today"}
          className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
            queueFilter === "today" ? "ring-2 ring-[#0ea5a4]/40" : ""
          }`}
        >
          <StatCard
            label="Current Queue"
            value={checkedIn}
            hint="patients checked in"
            icon={<UsersIcon />}
            tone="brand"
          />
        </button>
        <button
          type="button"
          onClick={() => selectQueueFilter("withDoctor")}
          aria-pressed={queueFilter === "withDoctor"}
          className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
            queueFilter === "withDoctor" ? "ring-2 ring-[#0ea5a4]/40" : ""
          }`}
        >
          <StatCard
            label="With Doctor"
            value={withDoctor}
            hint="assigned or in progress"
            icon={<ClockIcon />}
            tone="sky"
          />
        </button>
        <button
          type="button"
          onClick={() => selectQueueFilter("reviewed")}
          aria-pressed={queueFilter === "reviewed"}
          className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
            queueFilter === "reviewed" ? "ring-2 ring-[#0ea5a4]/40" : ""
          }`}
        >
          <StatCard
            label="Reviewed"
            value={completedToday}
            hint="completed visits"
            icon={<CheckCircleIcon />}
            tone="accent"
          />
        </button>
        <button
          type="button"
          onClick={() => selectQueueFilter("pendingIntake")}
          aria-pressed={queueFilter === "pendingIntake"}
          className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
            queueFilter === "pendingIntake" ? "ring-2 ring-[#0ea5a4]/40" : ""
          }`}
        >
          <StatCard
            label="Pending Intake"
            value={pendingIntake}
            hint="vitals not captured"
            icon={<ClipboardIcon />}
            tone="amber"
          />
        </button>
        <StatCard
          label="Portal Requests"
          value={portalRequestCount}
          hint="awaiting doctor assignment"
          icon={<GlobeIcon />}
          tone={portalRequestCount === 0 ? "slate" : hasOldPortalRequest ? "amber" : "violet"}
          href="/patient-portal-requests"
        />
      </section>

      <div className="flex justify-end">
        <Link href="/emr/new" className="btn-teal">
          <PlusIcon />
          New EMR
        </Link>
      </div>

      {queueFilter ? (
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
              Doctor-wise Queue
            </h2>
            <span className="text-right text-[12px] font-semibold text-[#64748b] dark:text-ink-300">
              active patients assigned today
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[1200px]:grid-cols-4">
            {doctorQueueCards.map(({ doctor, count, tone }) => (
              <button
                key={doctor.id}
                type="button"
                onClick={() => {
                  setSelectedDoctorQueueId((current) =>
                    current === doctor.id ? null : doctor.id,
                  );
                  setQueuePage(1);
                }}
                aria-pressed={selectedDoctorQueueId === doctor.id}
                className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
                  selectedDoctorQueueId === doctor.id ? "ring-2 ring-[#0ea5a4]/40" : ""
                }`}
              >
                <StatCard
                  label={`Dr. ${doctor.full_name.split(" ")[0] || doctor.full_name}`}
                  value={count}
                  hint="patients assigned"
                  icon={<UsersIcon />}
                  tone={tone}
                />
              </button>
            ))}
            {unassignedQueueCount > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctorQueueId((current) =>
                    current === "unassigned" ? null : "unassigned",
                  );
                  setQueuePage(1);
                }}
                aria-pressed={selectedDoctorQueueId === "unassigned"}
                className={`rounded-[18px] text-left transition focus:outline-none focus:ring-4 focus:ring-[#0ea5a4]/20 ${
                  selectedDoctorQueueId === "unassigned" ? "ring-2 ring-[#0ea5a4]/40" : ""
                }`}
              >
                <StatCard
                  label="Unassigned"
                  value={unassignedQueueCount}
                  hint="waiting for doctor"
                  icon={<ClockIcon />}
                  tone="slate"
                />
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {queueFilter ? (
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
              {intakeQueueTitle}
            </h2>
            {selectedDoctorQueueId ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctorQueueId(null);
                  setQueuePage(1);
                }}
                className="text-[12px] font-extrabold text-[#0f8f83] transition hover:text-[#0b766f]"
              >
                Show all
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800/70 dark:bg-ink-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#f7f9fc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:border-ink-700 dark:bg-ink-900/60 dark:text-ink-300">
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-5 py-3.5">EMR ID</th>
                <th className="px-5 py-3.5">Vitals</th>
                <th className="px-5 py-3.5">Doctor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueueItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-sm font-medium text-[#64748b] dark:text-ink-300"
                  >
                    No records yet.
                  </td>
                </tr>
              ) : (
                queuePageData.pageItems.map((v) => {
                  const patient = patientById[v.patient_id];
                  if (!patient) return null;

                  const assigned = (assignmentsByVisit.get(v.id) || [])
                    .map((a) => doctorById.get(a.doctor_id))
                    .filter(Boolean);
                  const doctorName =
                    assigned.length > 0
                      ? `Dr. ${assigned[0]!.full_name.split(" ")[0]}`
                      : "Unassigned";
                  const hasVitals = hasVisitVitals(v);
                  const actionHref =
                    v.status === "completed"
                      ? `/emr/${patient.id}?source=dashboard&section=completedPatients`
                      : `/emr/${patient.id}/visits/${v.id}/intake`;
                  const actionLabel = v.status === "completed" ? "View" : "Intake";

                  return (
                    <tr
                      key={v.id}
                      className="border-b border-[rgba(15,23,42,0.04)] transition-colors last:border-0 hover:bg-[#f7f9fc] dark:border-ink-700/70 dark:hover:bg-ink-800/55"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white"
                            style={{
                              background:
                                "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                            }}
                          >
                            {initials(patient.full_name)}
                          </span>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[#0f172a] dark:text-ink-100">
                              {patient.full_name}
                            </div>
                            <div className="truncate text-[11px] text-[#64748b] dark:text-ink-300">
                              {patient.age != null
                                ? `${patient.age}${patient.sex || ""}`
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b] dark:text-ink-300">
                        {patient.emr_number}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            hasVitals
                              ? "bg-[#ecfdf5] text-[#059669] dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-[#fff7ed] text-[#ea580c] dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {hasVitals ? "Captured" : "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-[#334155] dark:text-ink-300">
                        {doctorName}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusPill status={v.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={actionHref}
                          className="inline-flex items-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1 text-[12px] font-semibold text-[#0ea5a4] transition hover:border-[#0ea5a4]/40 hover:bg-[#ecfdfc] dark:border-ink-700 dark:bg-ink-900 dark:hover:bg-ink-800"
                        >
                          {actionLabel}
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <ClientPagination
            page={queuePageData.currentPage}
            pageSize={QUEUE_PAGE_SIZE}
            totalItems={filteredQueueItems.length}
            onPageChange={setQueuePage}
            label="patients"
          />
        </div>
      </section>
      ) : null}

      <QuickActions
        onOpenVitalTrends={() => setTrendsOpen(true)}
        onOpenPainMap={() => setPainMapOpen(true)}
      />

      {trendsOpen ? (
        <VitalTrendsModal
          patients={patientById}
          visits={vitalTrendVisits}
          onClose={() => setTrendsOpen(false)}
        />
      ) : null}

      {painMapOpen ? (
        <GraphicPainMapModal
          clinicId={clinic.id}
          patients={patientById}
          visits={painMapVisits}
          initialPatientId={initialPainMapPatientId}
          initialVisitId={initialPainMapVisitId}
          returnTo={initialPainMapReturnTo}
          onClose={() => setPainMapOpen(false)}
        />
      ) : null}
    </div>
  );
}

function hasVisitVitals(visit: Visit) {
  return (
    visit.bp_systolic != null ||
    visit.bp_diastolic != null ||
    visit.pulse != null ||
    visit.temperature_f != null ||
    visit.spo2 != null ||
    visit.weight_kg != null ||
    visit.height_cm != null
  );
}

function QuickActions({
  onOpenVitalTrends,
  onOpenPainMap,
}: {
  onOpenVitalTrends: () => void;
  onOpenPainMap: () => void;
}) {
  const router = useRouter();

  const modules = [
    {
      icon: "Chart",
      title: "Graphical Vital Trends",
      text: "BP, weight, SpO2 trend charts over time",
      onClick: onOpenVitalTrends,
    },
    {
      icon: "Pain",
      title: "Graphic Pain Map",
      text: "Patient marks pain locations on a body diagram",
      onClick: onOpenPainMap,
    },
    {
      icon: "Vax",
      title: "Immunization Registry",
      text: "Record and report patient vaccination history with CVX",
      onClick: () => router.push("/immunizations"),
    },
  ];

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
        Clinical Tools
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <button
            type="button"
            key={m.title}
            title={`Open ${m.title}`}
            onClick={m.onClick}
            className="group relative min-h-[150px] overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white p-5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-10px_rgba(15,23,42,0.16)] dark:border-ink-800/70 dark:bg-ink-900"
          >
            <div className="mb-4 inline-flex rounded-full bg-[#ecfdfc] px-3 py-1 text-xs font-bold text-[#0f948f] dark:bg-teal-900/30 dark:text-teal-200">
              {m.icon}
            </div>
            <h3 className="text-[15px] font-semibold text-[#0f172a] dark:text-ink-100">
              {m.title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#64748b] dark:text-ink-300">
              {m.text}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}

function VitalTrendsModal({
  patients,
  visits,
  onClose,
}: {
  patients: Record<string, Patient>;
  visits: VitalTrendVisit[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TrendTab>("bp");
  const patientOptions = useMemo(() => {
    const ids = Array.from(new Set(visits.map((v) => v.patient_id)));
    return ids
      .map((id) => patients[id])
      .filter(Boolean)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [patients, visits]);
  const [selectedPatientId, setSelectedPatientId] = useState(
    patientOptions[0]?.id || "",
  );

  const selectedPatient = patients[selectedPatientId] || patientOptions[0] || null;
  const selectedVisits = useMemo(() => {
    if (!selectedPatient) return [];
    return visits
      .filter((v) => v.patient_id === selectedPatient.id)
      .sort(
        (a, b) =>
          new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime(),
      );
  }, [selectedPatient, visits]);
  const chart = getChartSeries(activeTab, selectedVisits);
  const readingVisits = useMemo(
    () => getReadingVisits(activeTab, selectedVisits),
    [activeTab, selectedVisits],
  );
  const latestReadingVisit = readingVisits[readingVisits.length - 1] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">
              Graphical Vital Trends
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-ink-300">
              Last 30 days from saved intake visits
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            aria-label="Close vital trends"
          >
            x
          </button>
        </div>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto px-5 py-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-300">
                Patient
              </span>
              <select
                value={selectedPatient?.id || ""}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#0ea5a4] focus:ring-2 focus:ring-[#0ea5a4]/20 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
              >
                {patientOptions.length === 0 ? (
                  <option value="">No vital records</option>
                ) : null}
                {patientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name} - {p.emr_number}
                  </option>
                ))}
              </select>
            </label>
            <div className="text-xs font-medium text-slate-500 dark:text-ink-300">
              {readingVisits.length} reading
              {readingVisits.length === 1 ? "" : "s"}
              {latestReadingVisit
                ? ` | Latest ${formatShortDate(latestReadingVisit.visit_date)}`
                : ""}
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto border-b border-slate-200 dark:border-ink-800">
            {[
              ["bp", "BP"],
              ["spo2", "SpO2"],
              ["weight", "Weight"],
              ["pulse", "Pulse"],
              ["temperature", "Temp"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key as TrendTab)}
                className={`shrink-0 border-b-2 px-3 py-2 text-sm font-semibold transition ${
                  activeTab === key
                    ? "border-[#0ea5a4] text-[#0f948f]"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-ink-300 dark:hover:text-ink-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {chart.series.every((s) => s.points.length === 0) ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm font-medium text-slate-500 dark:border-ink-700 dark:text-ink-300">
              No saved {chart.title.toLowerCase()} readings for this patient yet.
            </div>
          ) : (
            <TrendChart chart={chart} />
          )}

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {chart.warning}
          </div>
        </div>
      </div>
    </div>
  );
}

function getReadingVisits(tab: TrendTab, visits: VitalTrendVisit[]) {
  return visits.filter((visit) => {
    if (tab === "bp") {
      return visit.bp_systolic != null || visit.bp_diastolic != null;
    }
    if (tab === "spo2") return visit.spo2 != null;
    if (tab === "weight") return visit.weight_kg != null;
    if (tab === "pulse") return visit.pulse != null;
    return visit.temperature_f != null;
  });
}

function GraphicPainMapModal({
  clinicId,
  patients,
  visits,
  initialPatientId,
  initialVisitId,
  returnTo,
  onClose,
}: {
  clinicId: string;
  patients: Record<string, Patient>;
  visits: Visit[];
  initialPatientId?: string;
  initialVisitId?: string;
  returnTo?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [contextPatient, setContextPatient] = useState<Patient | null>(null);
  const [contextVisits, setContextVisits] = useState<Visit[]>([]);
  const [contextLoading, setContextLoading] = useState(false);
  const mergedPatients = useMemo(
    () =>
      contextPatient
        ? { ...patients, [contextPatient.id]: contextPatient }
        : patients,
    [contextPatient, patients],
  );
  const mergedVisits = useMemo(() => {
    if (contextVisits.length === 0) return visits;
    const byId = new Map<string, Visit>();
    for (const visit of [...visits, ...contextVisits]) {
      byId.set(visit.id, visit);
    }
    return Array.from(byId.values());
  }, [contextVisits, visits]);
  const visitOptions = useMemo(
    () => {
      const scopedVisits = initialPatientId
        ? mergedVisits.filter((visit) => visit.patient_id === initialPatientId)
        : mergedVisits;
      return scopedVisits
        .map((visit) => ({ visit, patient: mergedPatients[visit.patient_id] }))
        .filter((item) => item.patient)
        .sort(
          (a, b) =>
            new Date(b.visit.visit_date).getTime() -
            new Date(a.visit.visit_date).getTime(),
        );
    },
    [initialPatientId, mergedPatients, mergedVisits],
  );
  const [selectedVisitId, setSelectedVisitId] = useState(initialVisitId || visitOptions[0]?.visit.id || "");
  const [intensity, setIntensity] = useState(3);
  const [painType, setPainType] = useState("Sharp");
  const [markers, setMarkers] = useState<PainMarker[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [savedMaps, setSavedMaps] = useState<SavedPainMap[]>([]);
  const [loadingSavedMaps, setLoadingSavedMaps] = useState(false);

  const selectedVisit = visitOptions.find((item) => item.visit.id === selectedVisitId);
  const selectedPatient = selectedVisit?.patient || null;

  useEffect(() => {
    if (!initialPatientId) return;
    if (visitOptions.length > 0) return;

    const patientId = initialPatientId;
    let cancelled = false;
    async function loadContext() {
      setContextLoading(true);
      const res = await fetch(
        `/api/pain-maps/context?patientId=${encodeURIComponent(patientId)}`,
      );
      const result = (await res.json().catch(() => ({}))) as {
        patient?: Patient;
        visits?: Visit[];
        error?: string;
      };
      if (cancelled) return;
      if (res.ok) {
        setContextPatient(result.patient || null);
        setContextVisits(result.visits || []);
        setMessage(null);
      } else {
        setMessage(result.error || "Could not load patient visits.");
      }
      setContextLoading(false);
    }

    void loadContext();
    return () => {
      cancelled = true;
    };
  }, [initialPatientId, visitOptions.length]);

  useEffect(() => {
    if (initialVisitId && visitOptions.some((item) => item.visit.id === initialVisitId)) {
      setSelectedVisitId(initialVisitId);
      return;
    }
    if (!selectedVisitId && visitOptions[0]?.visit.id) {
      setSelectedVisitId(visitOptions[0].visit.id);
    }
  }, [initialVisitId, selectedVisitId, visitOptions]);

  useEffect(() => {
    if (!selectedPatient) {
      setSavedMaps([]);
      return;
    }

    const selectedPatientId = selectedPatient.id;
    let cancelled = false;
    async function loadSavedMaps() {
      setLoadingSavedMaps(true);
      const { data } = await supabaseBrowser()
        .from("graphic_pain_maps")
        .select("id, pain_type, intensity, pain_summary, marked_points, created_at")
        .eq("clinic_id", clinicId)
        .eq("patient_id", selectedPatientId)
        .order("created_at", { ascending: false })
        .limit(5);

      if (!cancelled) {
        setSavedMaps((data || []) as SavedPainMap[]);
        setLoadingSavedMaps(false);
      }
    }

    void loadSavedMaps();
    return () => {
      cancelled = true;
    };
  }, [clinicId, selectedPatient]);

  async function savePainMap() {
    setMessage(null);
    if (!selectedVisit || !selectedPatient) {
      setMessage("Select a patient visit before saving.");
      return;
    }
    if (markers.length === 0) {
      setMessage("Mark at least one pain location before saving.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/pain-maps/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: selectedPatient.id,
        visitId: selectedVisit.visit.id,
        painType,
        intensity,
        painLocations: markers.map((marker) => marker.location),
        markedPoints: markers.map(formatMarkedPoint),
        painSummary: buildPainSummary(markers),
        markers,
      }),
    });
    const result = (await res.json().catch(() => ({}))) as {
      error?: string;
      painMap?: SavedPainMap;
    };
    setSaving(false);

    if (!res.ok) {
      setMessage(result.error || "Could not save pain map.");
      return;
    }

    void fetch("/api/pre-visit-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitId: selectedVisit.visit.id,
        force: true,
      }),
    });

    setMessage("Pain map saved to Supabase.");
    if (result.painMap) {
      setSavedMaps((current) => [result.painMap as SavedPainMap, ...current].slice(0, 5));
    }
    setMarkers([]);
    if (returnTo) {
      const nextUrl = new URL(returnTo, window.location.origin);
      nextUrl.searchParams.set(
        "painMapSummary",
        `${markers.length} marker${markers.length === 1 ? "" : "s"} - ${painType} - ${intensity}/10`,
      );
      router.replace(`${nextUrl.pathname}${nextUrl.search}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[18px] border border-slate-200 bg-white text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold">Graphic Pain Map</h2>
            <p className="mt-1 text-sm text-slate-500">
              Click anywhere on the body to mark a pain location. Click a marker to remove it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(94vh-73px)] overflow-y-auto p-5">
          <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Patient visit
              </span>
              <select
                value={selectedVisitId}
                onChange={(e) => {
                  setSelectedVisitId(e.target.value);
                  setMarkers([]);
                  setMessage(null);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                {visitOptions.length === 0 ? (
                  <option value="">
                    {contextLoading ? "Loading visits..." : "No visits available"}
                  </option>
                ) : null}
                {visitOptions.map(({ visit, patient }) => (
                  <option key={visit.id} value={visit.id}>
                    {patient!.full_name} - {patient!.emr_number} -{" "}
                    {formatShortDate(visit.visit_date)}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pain type
              </span>
              <select
                value={painType}
                onChange={(e) => setPainType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              >
                <option>Sharp</option>
                <option>Dull</option>
                <option>Burning</option>
                <option>Cramping</option>
                <option>Throbbing</option>
                <option>Numbness</option>
              </select>
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
            <div>
              <div className="grid gap-5 sm:grid-cols-2">
                <BodyMap
                  side="front"
                  title="FRONT"
                  markers={markers}
                  intensity={intensity}
                  painType={painType}
                  onAdd={(marker) => setMarkers((prev) => [...prev, marker])}
                  onRemove={(id) =>
                    setMarkers((prev) => prev.filter((marker) => marker.id !== id))
                  }
                />
                <BodyMap
                  side="back"
                  title="BACK"
                  markers={markers}
                  intensity={intensity}
                  painType={painType}
                  onAdd={(marker) => setMarkers((prev) => [...prev, marker])}
                  onRemove={(id) =>
                    setMarkers((prev) => prev.filter((marker) => marker.id !== id))
                  }
                />
              </div>

              <label className="mt-6 block">
                <span className="mb-3 block text-sm font-medium text-slate-700">
                  Pain Intensity (0-10) -{" "}
                  <span className="font-bold text-teal-600">{intensity}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-teal-400"
                />
              </label>
            </div>

            <aside className="space-y-5">
              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Legend
                </h3>
                <LegendItem color="#ef4444" label="Severe (8-10)" />
                <LegendItem color="#f59e0b" label="Moderate (4-7)" />
                <LegendItem color="#10b981" label="Mild (1-3)" />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Marked points
                </h3>
                {markers.length === 0 ? (
                  <p className="text-sm text-slate-500">No markers yet</p>
                ) : (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {markers.map((marker, index) => (
                      <li key={marker.id}>
                        {index + 1}. {marker.location} - {marker.painType} -{" "}
                        {marker.intensity}/10
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMarkers([])}
                disabled={markers.length === 0}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition enabled:hover:bg-slate-50 disabled:opacity-50"
              >
                Clear All
              </button>

              <button
                type="button"
                onClick={savePainMap}
                disabled={saving || markers.length === 0 || !selectedVisit}
                className="w-full rounded-xl bg-teal-500 px-3 py-2 text-sm font-bold text-white transition enabled:hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Pain Map"}
              </button>

              {message ? (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {message}
                </p>
              ) : null}

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Saved pain maps
                </h3>
                {loadingSavedMaps ? (
                  <p className="text-sm text-slate-500">Loading saved maps...</p>
                ) : savedMaps.length === 0 ? (
                  <p className="text-sm text-slate-500">No saved pain maps for this patient.</p>
                ) : (
                  <ul className="space-y-2">
                    {savedMaps.map((map) => (
                      <li
                        key={map.id}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                      >
                        <div className="font-bold text-slate-900">
                          {formatShortDate(map.created_at)} - {map.pain_type || "Pain"}{" "}
                          {map.intensity != null ? `${map.intensity}/10` : ""}
                        </div>
                        <div className="mt-1 text-xs leading-relaxed text-slate-600">
                          {map.pain_summary ||
                            map.marked_points?.slice(0, 2).join("; ") ||
                            "Pain map saved"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function BodyMap({
  side,
  title,
  markers,
  intensity,
  painType,
  onAdd,
  onRemove,
}: {
  side: "front" | "back";
  title: string;
  markers: PainMarker[];
  intensity: number;
  painType: string;
  onAdd: (marker: PainMarker) => void;
  onRemove: (id: string) => void;
}) {
  const sideMarkers = markers.filter((marker) => marker.side === side);

  function handleClick(event: React.MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget;
    const screenMatrix = svg.getScreenCTM();
    if (!screenMatrix) return;

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const svgPoint = point.matrixTransform(screenMatrix.inverse());
    const x = svgPoint.x;
    const y = svgPoint.y;
    const location = getPainLocation(side, x, y);
    if (!location) return;

    onAdd({
      id: crypto.randomUUID(),
      side,
      location,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      intensity,
      painType,
    });
  }

  return (
    <div>
      <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <svg
        viewBox="0 0 200 420"
        preserveAspectRatio="xMidYMid meet"
        className="aspect-[10/21] h-auto max-h-[70vh] w-full rounded-xl border border-slate-200 bg-slate-50"
        onClick={handleClick}
        role="img"
        aria-label={`${title} body pain map`}
      >
        <BodyShape side={side} />
        {sideMarkers.map((marker) => (
          <circle
            key={marker.id}
            cx={marker.x}
            cy={marker.y}
            r="7"
            fill={markerColor(marker.intensity)}
            stroke="#ffffff"
            strokeWidth="2"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(marker.id);
            }}
          >
            <title>
              {marker.location}: {marker.painType} pain, {marker.intensity}/10
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function BodyShape({ side }: { side: "front" | "back" }) {
  const stroke = side === "front" ? "#3b82f6" : "#6366f1";
  const labelColor = side === "front" ? "#93c5fd" : "#a5b4fc";
  const regions = getPainRegions(side);

  return (
    <g fill="#e0f2fe" stroke={stroke} strokeWidth="2">
      {regions.map((region) =>
        region.shape === "ellipse" ? (
          <ellipse
            key={region.key}
            cx={region.x + region.width / 2}
            cy={region.y + region.height / 2}
            rx={region.width / 2}
            ry={region.height / 2}
            className="cursor-crosshair transition hover:fill-[#bae6fd]"
          />
        ) : (
          <rect
            key={region.key}
            x={region.x}
            y={region.y}
            width={region.width}
            height={region.height}
            rx="10"
            className="cursor-crosshair transition hover:fill-[#bae6fd]"
          />
        ),
      )}
      <text
        x="100"
        y="150"
        textAnchor="middle"
        fill={labelColor}
        stroke="none"
        fontSize="10"
      >
        {side === "front" ? "Chest" : "Upper Back"}
      </text>
      <text
        x="100"
        y="193"
        textAnchor="middle"
        fill={labelColor}
        stroke="none"
        fontSize="10"
      >
        {side === "front" ? "Abdomen" : "Lower Back"}
      </text>
      <text x="79" y="293" textAnchor="middle" fill={labelColor} stroke="none" fontSize="9">
        {side === "front" ? "L-Thigh" : "L-Glute"}
      </text>
      <text x="121" y="293" textAnchor="middle" fill={labelColor} stroke="none" fontSize="9">
        {side === "front" ? "R-Thigh" : "R-Glute"}
      </text>
    </g>
  );
}

function getPainRegions(side: "front" | "back"): PainRegion[] {
  const upperTorso = side === "front" ? "Chest pain" : "Upper Back pain";
  const lowerTorso = side === "front" ? "Abdomen pain" : "Lower Back pain";
  const leftUpperLeg = side === "front" ? "Left Thigh pain" : "Left Glute pain";
  const rightUpperLeg = side === "front" ? "Right Thigh pain" : "Right Glute pain";

  return [
    { key: "head", label: "Head pain", shape: "ellipse", x: 70, y: 10, width: 60, height: 64 },
    { key: "neck", label: "Neck pain", shape: "rect", x: 91, y: 72, width: 18, height: 18 },
    { key: "left-shoulder", label: "Left Shoulder pain", shape: "ellipse", x: 40, y: 78, width: 42, height: 44 },
    { key: "right-shoulder", label: "Right Shoulder pain", shape: "ellipse", x: 118, y: 78, width: 42, height: 44 },
    { key: "left-hand", label: "Left Hand pain", shape: "ellipse", x: 18, y: 184, width: 36, height: 46 },
    { key: "right-hand", label: "Right Hand pain", shape: "ellipse", x: 146, y: 184, width: 36, height: 46 },
    { key: "left-arm", label: "Left Arm pain", shape: "rect", x: 27, y: 92, width: 25, height: 100 },
    { key: "right-arm", label: "Right Arm pain", shape: "rect", x: 148, y: 92, width: 25, height: 100 },
    { key: "upper-torso", label: upperTorso, shape: "rect", x: 55, y: 90, width: 90, height: 75 },
    { key: "lower-torso", label: lowerTorso, shape: "rect", x: 55, y: 155, width: 90, height: 55 },
    { key: "pelvis", label: side === "front" ? "Pelvis pain" : "Sacral pain", shape: "rect", x: 60, y: 210, width: 80, height: 42 },
    { key: "left-thigh", label: leftUpperLeg, shape: "rect", x: 62, y: 252, width: 35, height: 82 },
    { key: "right-thigh", label: rightUpperLeg, shape: "rect", x: 103, y: 252, width: 35, height: 82 },
    { key: "left-leg", label: "Left Lower Leg pain", shape: "rect", x: 66, y: 334, width: 29, height: 66 },
    { key: "right-leg", label: "Right Lower Leg pain", shape: "rect", x: 105, y: 334, width: 29, height: 66 },
    { key: "left-foot", label: "Left Foot pain", shape: "ellipse", x: 62, y: 397, width: 36, height: 16 },
    { key: "right-foot", label: "Right Foot pain", shape: "ellipse", x: 102, y: 397, width: 36, height: 16 },
  ];
}

function getPainLocation(side: "front" | "back", x: number, y: number) {
  const region = getPainRegions(side).find((item) => {
    if (item.shape === "rect") {
      return (
        x >= item.x &&
        x <= item.x + item.width &&
        y >= item.y &&
        y <= item.y + item.height
      );
    }

    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const rx = item.width / 2;
    const ry = item.height / 2;
    return ((x - cx) ** 2) / rx ** 2 + ((y - cy) ** 2) / ry ** 2 <= 1;
  });

  return region ? `${side} ${region.label}` : null;
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
      <span className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}

function markerColor(intensity: number) {
  if (intensity >= 8) return "#ef4444";
  if (intensity >= 4) return "#f59e0b";
  return "#10b981";
}

function formatMarkedPoint(marker: PainMarker) {
  return `${marker.location} - ${marker.painType} - ${marker.intensity}/10`;
}

function buildPainSummary(markers: PainMarker[]) {
  return markers.map(formatMarkedPoint).join("; ");
}

function getChartSeries(tab: TrendTab, visits: VitalTrendVisit[]) {
  const configs = {
    bp: {
      title: "Blood pressure",
      unit: "mmHg",
      normal: "Normal: 90/60 - 120/80 mmHg",
      warning: `${
        visits.filter(
          (v) => (v.bp_systolic || 0) > 120 || (v.bp_diastolic || 0) > 80,
        ).length
      } BP readings above normal range in the past 30 days.`,
      series: [
        {
          label: "Systolic",
          color: "#ef4444",
          points: visits
            .filter((v) => v.bp_systolic != null)
            .map((v) => ({ date: v.visit_date, value: v.bp_systolic! })),
        },
        {
          label: "Diastolic",
          color: "#3b82f6",
          points: visits
            .filter((v) => v.bp_diastolic != null)
            .map((v) => ({ date: v.visit_date, value: v.bp_diastolic! })),
        },
      ],
    },
    spo2: singleSeries(
      "SpO2",
      "%",
      "Normal: 95 - 100%",
      visits,
      "spo2",
      "#0ea5a4",
      (v) =>
        `${v.filter((n) => n < 95).length} SpO2 readings below normal range in the past 30 days.`,
    ),
    weight: singleSeries(
      "Weight",
      "kg",
      "Trend only: compare against the patient's baseline.",
      visits,
      "weight_kg",
      "#8b5cf6",
      () => "Weight trend is stored from each intake visit for longitudinal review.",
    ),
    pulse: singleSeries(
      "Pulse",
      "bpm",
      "Normal: 60 - 100 bpm",
      visits,
      "pulse",
      "#f97316",
      (v) =>
        `${v.filter((n) => n < 60 || n > 100).length} pulse readings outside normal range in the past 30 days.`,
    ),
    temperature: singleSeries(
      "Temperature",
      "F",
      "Normal: below 100 F",
      visits,
      "temperature_f",
      "#dc2626",
      (v) =>
        `${v.filter((n) => n >= 100).length} temperature readings at or above 100 F in the past 30 days.`,
    ),
  };

  return configs[tab];
}

function singleSeries<K extends keyof VitalTrendVisit>(
  title: string,
  unit: string,
  normal: string,
  visits: VitalTrendVisit[],
  key: K,
  color: string,
  warning: (values: number[]) => string,
) {
  const points = visits
    .filter((v) => typeof v[key] === "number")
    .map((v) => ({ date: v.visit_date, value: v[key] as number }));

  return {
    title,
    unit,
    normal,
    warning: warning(points.map((p) => p.value)),
    series: [{ label: title, color, points }],
  };
}

function TrendChart({
  chart,
}: {
  chart: {
    title: string;
    unit: string;
    normal: string;
    series: ChartSeries[];
  };
}) {
  const width = 680;
  const height = 280;
  const pad = { top: 22, right: 28, bottom: 48, left: 50 };
  const allPoints = chart.series.flatMap((s) => s.points);
  const values = allPoints.map((p) => p.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valuePadding = Math.max(5, (maxValue - minValue || 10) * 0.2);
  const yMin = Math.floor(minValue - valuePadding);
  const yMax = Math.ceil(maxValue + valuePadding);
  const dates = Array.from(new Set(allPoints.map((p) => p.date))).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;
  const xForDate = (date: string) => {
    const index = dates.indexOf(date);
    return (
      pad.left +
      (dates.length <= 1 ? plotWidth / 2 : (index / (dates.length - 1)) * plotWidth)
    );
  };
  const yForValue = (value: number) =>
    pad.top + ((yMax - value) / (yMax - yMin || 1)) * plotHeight;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(yMax - (yMax - yMin) * ratio),
  );

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-ink-800 dark:bg-ink-900">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[280px] min-w-[620px] w-full"
          role="img"
          aria-label={`${chart.title} trend chart`}
        >
          {yTicks.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[11px]"
                >
                  {tick}
                </text>
              </g>
            );
          })}
          <text x={pad.left} y={14} className="fill-slate-500 text-[11px]">
            {chart.unit}
          </text>
          {chart.series.map((series) => {
            const points = series.points.map((p) => ({
              x: xForDate(p.date),
              y: yForValue(p.value),
              value: p.value,
              date: p.date,
            }));
            const path = points
              .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
              .join(" ");

            return (
              <g key={series.label}>
                <path
                  d={path}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {points.map((p) => (
                  <g key={`${series.label}-${p.date}-${p.value}`}>
                    <circle cx={p.x} cy={p.y} r="4" fill={series.color} />
                    <title>
                      {series.label}: {p.value} on {formatShortDate(p.date)}
                    </title>
                  </g>
                ))}
              </g>
            );
          })}
          {dates.map((date, index) => {
            if (dates.length > 6 && index % Math.ceil(dates.length / 6) !== 0) {
              return null;
            }

            return (
              <text
                key={date}
                x={xForDate(date)}
                y={height - 18}
                textAnchor="middle"
                className="fill-slate-400 text-[11px]"
              >
                {formatShortDate(date)}
              </text>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold text-slate-600 dark:text-ink-400">
        {chart.series.map((series) => (
          <span key={series.label} className="inline-flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            {series.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-ink-300">
        {chart.normal}
      </p>
    </div>
  );
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function StatusPill({ status }: { status: Visit["status"] }) {
  const map: Record<Visit["status"], { cls: string; label: string }> = {
    intake: {
      cls: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400",
      label: "Intake",
    },
    queued: {
      cls: "bg-[#ecfeff] text-[#0891b2] dark:bg-sky-900/40 dark:text-sky-300",
      label: "In Queue",
    },
    in_progress: {
      cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
      label: "With Doctor",
    },
    awaiting_review: {
      cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
      label: "Draft",
    },
    completed: {
      cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
      label: "Done",
    },
    cancelled: {
      cls: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
      label: "Cancelled",
    },
  };
  const { cls, label } = map[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
