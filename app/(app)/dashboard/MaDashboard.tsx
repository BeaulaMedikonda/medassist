"use client";

// import Link from "next/link";
// import { useMemo, useState } from "react";
// import { StatCard } from "@/components/dashboard/StatCard";
// import { DashboardHero } from "@/components/dashboard/DashboardHero";
// import {
//   CheckCircleIcon,
//   ClipboardIcon,
//   ClockIcon,
//   PlusIcon,
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

// export function MaDashboard({
//   member,
//   clinic,
//   todayVisits,
//   patientById,
//   assignments,
//   doctorRoster,
//   currentUserId,
//   vitalTrendVisits,
// }: {
//   member: Doctor;
//   clinic: Clinic;
//   todayVisits: Visit[];
//   awaitingVisits: Visit[];
//   patientById: Record<string, Patient>;
//   assignments: Array<{ visit_id: string; doctor_id: string; role: string }>;
//   doctorRoster: Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>;
//   currentUserId: string;
//   vitalTrendVisits: VitalTrendVisit[];
// }) {
//   const [trendsOpen, setTrendsOpen] = useState(false);
//   const [painMapOpen, setPainMapOpen] = useState(false);
//   const queueItems = todayVisits.filter((v) =>
//     ["queued", "in_progress", "intake", "awaiting_review"].includes(v.status),
//   );

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
//   const withDoctor = todayVisits.filter((v) => {
//     const assignedDoctors = assignmentsByVisit.get(v.id) || [];
//     return v.status === "in_progress" || assignedDoctors.length > 0 || Boolean(v.doctor_id);
//   }).length;
//   const completedToday = todayVisits.filter((v) => v.status === "completed").length;
//   const pendingIntake = todayVisits.filter((v) => v.status === "intake").length;

//   return (
//     <div className="space-y-8">
//       <DashboardHero name={member.full_name} clinicName={clinic.name} waveEmoji />

//       <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         <StatCard
//           label="Today's Queue"
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
//       </section>

//       <section>
//         <div className="mb-3 flex items-center justify-between">
//           <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
//             Today's Intake Queue
//           </h2>
//           <Link href="/emr/intake" className="btn-teal">
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
//                 queueItems.map((v) => {
//                   const patient = patientById[v.patient_id];
//                   if (!patient) return null;

//                   const assigned = (assignmentsByVisit.get(v.id) || [])
//                     .map((a) => doctorById.get(a.doctor_id))
//                     .filter(Boolean);
//                   const doctorName =
//                     assigned.length > 0
//                       ? `Dr. ${assigned[0]!.full_name.split(" ")[0]}`
//                       : "Unassigned";
//                   const hasVitals = Boolean(
//                     v.bp_systolic ||
//                       v.bp_diastolic ||
//                       v.pulse ||
//                       v.temperature_f ||
//                       v.spo2 ||
//                       v.weight_kg ||
//                       v.height_cm,
//                   );

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
//                             <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
//                               {patient.age != null
//                                 ? `${patient.age}${patient.sex || ""}`
//                                 : "-"}
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
//           currentUserId={currentUserId}
//           patients={patientById}
//           visits={todayVisits}
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
//     },
//   ];

//   return (
//     <section>
//       <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
//         Quick Actions
//       </h2>
//       <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//         {modules.map((m) => (
//           <button
//             type="button"
//             key={m.title}
//             title={m.onClick ? "Open vital trends" : "Coming soon"}
//             onClick={m.onClick}
//             disabled={!m.onClick}
//             className="group relative min-h-[150px] overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white p-5 text-left shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[0_8px_24px_-10px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed dark:border-ink-800/70 dark:bg-ink-900"
//           >
//             {m.badge ? (
//               <span className="absolute right-4 top-4 rounded-full bg-[#7c3aed] px-2 py-0.5 text-[10px] font-bold text-white">
//                 {m.badge}
//               </span>
//             ) : null}
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
//   const latestVisit = selectedVisits[selectedVisits.length - 1] || null;

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
//             className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
//             aria-label="Close vital trends"
//           >
//             x
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
//               {selectedVisits.length} reading
//               {selectedVisits.length === 1 ? "" : "s"}
//               {latestVisit
//                 ? ` | Latest ${formatShortDate(latestVisit.visit_date)}`
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

// function GraphicPainMapModal({
//   clinicId,
//   currentUserId,
//   patients,
//   visits,
//   onClose,
// }: {
//   clinicId: string;
//   currentUserId: string;
//   patients: Record<string, Patient>;
//   visits: Visit[];
//   onClose: () => void;
// }) {
//   const visitOptions = useMemo(
//     () =>
//       visits
//         .map((visit) => ({ visit, patient: patients[visit.patient_id] }))
//         .filter((item) => item.patient)
//         .sort(
//           (a, b) =>
//             new Date(b.visit.visit_date).getTime() -
//             new Date(a.visit.visit_date).getTime(),
//         ),
//     [patients, visits],
//   );
//   const [selectedVisitId, setSelectedVisitId] = useState(
//     visitOptions[0]?.visit.id || "",
//   );
//   const [intensity, setIntensity] = useState(3);
//   const [painType, setPainType] = useState("Sharp");
//   const [markers, setMarkers] = useState<PainMarker[]>([]);
//   const [saving, setSaving] = useState(false);
//   const [message, setMessage] = useState<string | null>(null);

//   const selectedVisit = visitOptions.find((item) => item.visit.id === selectedVisitId);
//   const selectedPatient = selectedVisit?.patient || null;

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
//     const supabase = supabaseBrowser();
//     const { error } = await supabase.from("graphic_pain_maps").insert({
//       clinic_id: clinicId,
//       patient_id: selectedPatient.id,
//       visit_id: selectedVisit.visit.id,
//       created_by: currentUserId,
//       pain_type: painType,
//       intensity,
//       pain_locations: markers.map((marker) => marker.location),
//       marked_points: markers.map(formatMarkedPoint),
//       pain_summary: buildPainSummary(markers),
//       markers,
//     });
//     setSaving(false);

//     if (error) {
//       setMessage(error.message);
//       return;
//     }

//     await supabase
//       .from("visits")
//       .update({
//         pre_visit_summary: null,
//         pre_visit_summary_generated_at: null,
//       })
//       .eq("id", selectedVisit.visit.id);

//     setMessage("Pain map saved to Supabase.");
//     setMarkers([]);
//   }

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
//       <div className="max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-[18px] border border-slate-700 bg-[#111827] text-slate-100 shadow-2xl">
//         <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
//           <div>
//             <h2 className="text-lg font-bold">Graphic Pain Map</h2>
//             <p className="mt-1 text-sm text-slate-400">
//               Click anywhere on the body to mark a pain location. Click a marker to remove it.
//             </p>
//           </div>
//           <button
//             type="button"
//             onClick={onClose}
//             className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-800"
//           >
//             Close
//           </button>
//         </div>

//         <div className="max-h-[calc(94vh-73px)] overflow-y-auto p-5">
//           <div className="mb-5 grid gap-4 md:grid-cols-[1fr_220px]">
//             <label className="block">
//               <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
//                 Patient visit
//               </span>
//               <select
//                 value={selectedVisitId}
//                 onChange={(e) => {
//                   setSelectedVisitId(e.target.value);
//                   setMarkers([]);
//                   setMessage(null);
//                 }}
//                 className="w-full rounded-xl border border-slate-700 bg-[#1f2434] px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-teal-400"
//               >
//                 {visitOptions.length === 0 ? (
//                   <option value="">No visits available</option>
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
//               <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
//                 Pain type
//               </span>
//               <select
//                 value={painType}
//                 onChange={(e) => setPainType(e.target.value)}
//                 className="w-full rounded-xl border border-slate-700 bg-[#1f2434] px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-teal-400"
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
//                 <span className="mb-3 block text-sm font-medium text-slate-300">
//                   Pain Intensity (0-10) -{" "}
//                   <span className="font-bold text-teal-300">{intensity}</span>
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
//                 <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
//                   Legend
//                 </h3>
//                 <LegendItem color="#ef4444" label="Severe (8-10)" />
//                 <LegendItem color="#f59e0b" label="Moderate (4-7)" />
//                 <LegendItem color="#10b981" label="Mild (1-3)" />
//               </div>

//               <div>
//                 <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">
//                   Marked points
//                 </h3>
//                 {markers.length === 0 ? (
//                   <p className="text-sm text-slate-400">No markers yet</p>
//                 ) : (
//                   <ul className="space-y-2 text-sm text-slate-300">
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
//                 className="w-full rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-300 transition enabled:hover:bg-slate-800 disabled:opacity-50"
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
//                 <p className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
//                   {message}
//                 </p>
//               ) : null}
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
//     const rect = svg.getBoundingClientRect();
//     const x = ((event.clientX - rect.left) / rect.width) * 200;
//     const y = ((event.clientY - rect.top) / rect.height) * 420;
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
//       <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">
//         {title}
//       </div>
//       <svg
//         viewBox="0 0 200 420"
//         className="h-[405px] w-full rounded-xl border border-slate-700 bg-[#1f2434]"
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
//     <g fill="#2d3558" stroke={stroke} strokeWidth="2">
//       {regions.map((region) =>
//         region.shape === "ellipse" ? (
//           <ellipse
//             key={region.key}
//             cx={region.x + region.width / 2}
//             cy={region.y + region.height / 2}
//             rx={region.width / 2}
//             ry={region.height / 2}
//             className="cursor-crosshair transition hover:fill-[#33406d]"
//           />
//         ) : (
//           <rect
//             key={region.key}
//             x={region.x}
//             y={region.y}
//             width={region.width}
//             height={region.height}
//             rx="10"
//             className="cursor-crosshair transition hover:fill-[#33406d]"
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
//     { key: "left-arm", label: "Left Arm pain", shape: "rect", x: 27, y: 92, width: 25, height: 100 },
//     { key: "right-arm", label: "Right Arm pain", shape: "rect", x: 148, y: 92, width: 25, height: 100 },
//     { key: "left-hand", label: "Left Hand pain", shape: "ellipse", x: 26, y: 191, width: 26, height: 32 },
//     { key: "right-hand", label: "Right Hand pain", shape: "ellipse", x: 148, y: 191, width: 26, height: 32 },
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
//     <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
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





import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatCard } from "@/components/dashboard/StatCard";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import {
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/dashboard/icons";
import { initials } from "@/lib/dashboard-utils";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Clinic, Doctor, Patient, Visit } from "@/types/db";

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

export function MaDashboard({
  member,
  clinic,
  todayVisits,
  patientById,
  assignments,
  doctorRoster,
  currentUserId,
  vitalTrendVisits,
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
}) {
  const [trendsOpen, setTrendsOpen] = useState(false);
  const [painMapOpen, setPainMapOpen] = useState(false);
  const queueItems = todayVisits.filter((v) =>
    ["queued", "in_progress", "intake", "awaiting_review"].includes(v.status),
  );

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
  const checkedIn = queueItems.length;
  const withDoctor = todayVisits.filter((v) => {
    const assignedDoctors = assignmentsByVisit.get(v.id) || [];
    return v.status === "in_progress" || assignedDoctors.length > 0 || Boolean(v.doctor_id);
  }).length;
  const completedToday = todayVisits.filter((v) => v.status === "completed").length;
  const pendingIntake = todayVisits.filter((v) => v.status === "intake").length;

  return (
    <div className="space-y-8">
      <DashboardHero name={member.full_name} clinicName={clinic.name} waveEmoji />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's Queue"
          value={checkedIn}
          hint="patients checked in"
          icon={<UsersIcon />}
          tone="brand"
        />
        <StatCard
          label="With Doctor"
          value={withDoctor}
          hint="currently being seen"
          icon={<ClockIcon />}
          tone="sky"
        />
        <StatCard
          label="Reviewed"
          value={completedToday}
          hint="completed visits"
          icon={<CheckCircleIcon />}
          tone="accent"
        />
        <StatCard
          label="Pending Intake"
          value={pendingIntake}
          hint="vitals not captured"
          icon={<ClipboardIcon />}
          tone="amber"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-[#0f172a] dark:text-ink-100">
            Today's Intake Queue
          </h2>
          <Link href="/emr/intake" className="btn-teal">
            <PlusIcon />
            New EMR
          </Link>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-[rgba(15,23,42,0.06)] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)] dark:border-ink-800/70 dark:bg-ink-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#f7f9fc] text-[11px] font-bold uppercase tracking-wider text-[#64748b] dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-500">
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-5 py-3.5">EMR ID</th>
                <th className="px-5 py-3.5">Vitals</th>
                <th className="px-5 py-3.5">Doctor</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {queueItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-sm font-medium text-[#64748b] dark:text-ink-500"
                  >
                    No records yet.
                  </td>
                </tr>
              ) : (
                queueItems.map((v) => {
                  const patient = patientById[v.patient_id];
                  if (!patient) return null;

                  const assigned = (assignmentsByVisit.get(v.id) || [])
                    .map((a) => doctorById.get(a.doctor_id))
                    .filter(Boolean);
                  const doctorName =
                    assigned.length > 0
                      ? `Dr. ${assigned[0]!.full_name.split(" ")[0]}`
                      : "Unassigned";
                  const hasVitals = Boolean(
                    v.bp_systolic ||
                      v.bp_diastolic ||
                      v.pulse ||
                      v.temperature_f ||
                      v.spo2 ||
                      v.weight_kg ||
                      v.height_cm,
                  );

                  return (
                    <tr
                      key={v.id}
                      className="border-b border-[rgba(15,23,42,0.04)] transition-colors last:border-0 hover:bg-[#f7f9fc] dark:border-ink-800/60 dark:hover:bg-ink-800/40"
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
                            <div className="truncate text-[11px] text-[#64748b] dark:text-ink-500">
                              {patient.age != null
                                ? `${patient.age}${patient.sex || ""}`
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[12px] text-[#64748b] dark:text-ink-400">
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
                          href={`/emr/${patient.id}/visits/${v.id}/intake`}
                          className="inline-flex items-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-3 py-1 text-[12px] font-semibold text-[#0ea5a4] transition hover:border-[#0ea5a4]/40 hover:bg-[#ecfdfc] dark:border-ink-700 dark:bg-ink-900 dark:hover:bg-ink-800"
                        >
                          Intake
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

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
          currentUserId={currentUserId}
          patients={patientById}
          visits={todayVisits}
          onClose={() => setPainMapOpen(false)}
        />
      ) : null}
    </div>
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
        Quick Actions
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
            <p className="mt-2 text-[13px] leading-relaxed text-[#64748b] dark:text-ink-500">
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
  const latestVisit = selectedVisits[selectedVisits.length - 1] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl dark:border-ink-800 dark:bg-ink-950">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">
              Graphical Vital Trends
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-ink-500">
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
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
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
            <div className="text-xs font-medium text-slate-500 dark:text-ink-500">
              {selectedVisits.length} reading
              {selectedVisits.length === 1 ? "" : "s"}
              {latestVisit
                ? ` | Latest ${formatShortDate(latestVisit.visit_date)}`
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
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-ink-500 dark:hover:text-ink-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {chart.series.every((s) => s.points.length === 0) ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-16 text-center text-sm font-medium text-slate-500 dark:border-ink-700 dark:text-ink-500">
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

function GraphicPainMapModal({
  clinicId,
  currentUserId,
  patients,
  visits,
  onClose,
}: {
  clinicId: string;
  currentUserId: string;
  patients: Record<string, Patient>;
  visits: Visit[];
  onClose: () => void;
}) {
  const visitOptions = useMemo(
    () =>
      visits
        .map((visit) => ({ visit, patient: patients[visit.patient_id] }))
        .filter((item) => item.patient)
        .sort(
          (a, b) =>
            new Date(b.visit.visit_date).getTime() -
            new Date(a.visit.visit_date).getTime(),
        ),
    [patients, visits],
  );
  const [selectedVisitId, setSelectedVisitId] = useState(
    visitOptions[0]?.visit.id || "",
  );
  const [intensity, setIntensity] = useState(3);
  const [painType, setPainType] = useState("Sharp");
  const [markers, setMarkers] = useState<PainMarker[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedVisit = visitOptions.find((item) => item.visit.id === selectedVisitId);
  const selectedPatient = selectedVisit?.patient || null;

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
    const supabase = supabaseBrowser();
    const { error } = await supabase.from("graphic_pain_maps").insert({
      clinic_id: clinicId,
      patient_id: selectedPatient.id,
      visit_id: selectedVisit.visit.id,
      created_by: currentUserId,
      pain_type: painType,
      intensity,
      pain_locations: markers.map((marker) => marker.location),
      marked_points: markers.map(formatMarkedPoint),
      pain_summary: buildPainSummary(markers),
      markers,
    });
    setSaving(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    await supabase
      .from("visits")
      .update({
        pre_visit_summary: null,
        pre_visit_summary_generated_at: null,
      })
      .eq("id", selectedVisit.visit.id);

    setMessage("Pain map saved to Supabase.");
    setMarkers([]);
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
                  <option value="">No visits available</option>
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
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 200;
    const y = ((event.clientY - rect.top) / rect.height) * 420;
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
        className="h-[405px] w-full rounded-xl border border-slate-200 bg-slate-50"
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
    { key: "left-arm", label: "Left Arm pain", shape: "rect", x: 27, y: 92, width: 25, height: 100 },
    { key: "right-arm", label: "Right Arm pain", shape: "rect", x: 148, y: 92, width: 25, height: 100 },
    { key: "left-hand", label: "Left Hand pain", shape: "ellipse", x: 26, y: 191, width: 26, height: 32 },
    { key: "right-hand", label: "Right Hand pain", shape: "ellipse", x: 148, y: 191, width: 26, height: 32 },
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
      <p className="mt-3 text-xs font-medium text-slate-500 dark:text-ink-500">
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
