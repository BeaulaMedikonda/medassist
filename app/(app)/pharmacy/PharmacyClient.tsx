//app/(app)/pharmacy/PharmacyClient.tsx
"use client";
 
import { useEffect, useMemo, useState } from "react";
import {
  medicineComposition,
  pharmacyDash,
  searchMedicines,
  type MedicineSearchRow,
} from "@/lib/pharmacy/medicine-search";
 
function formatPrice(price: number | string | null | undefined) {
  if (typeof price === "number") return `Rs ${price.toFixed(2)}`;
  if (typeof price === "string" && price.trim()) return `Rs ${price}`;
  return pharmacyDash;
}
 
export function PharmacyClient() {
  const [query, setQuery] = useState("para");
  const [rows, setRows] = useState<MedicineSearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const result = await searchMedicines(query);
      if (!cancelled) {
        setRows(result.data);
        setError(result.error);
        setLoading(false);
      }
    }, 250);
 
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);
 
  const resultLabel = useMemo(() => {
    if (loading) return "Searching...";
    return `${rows.length} matches`;
  }, [loading, rows.length]);
 
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-ink-50">
          Pharmacy / Drugs
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-ink-400">
          Medicine master, prescribing lookup, inventory and medication safety.
        </p>
      </div>
 
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-900/70">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-400">
            Search tablets and medicines
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand, generic or composition"
            className="mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-50"
          />
          <div className="mt-3 text-sm text-slate-500 dark:text-ink-400">{resultLabel}</div>
          {error ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              Medicine API call failed: {error}
            </div>
          ) : null}
        </div>
 
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-ink-800">
            <thead className="bg-slate-100 text-left text-xs font-extrabold uppercase tracking-wide text-slate-600 dark:bg-ink-800 dark:text-ink-300">
              <tr>
                <th className="px-4 py-3">Tablet / Drug</th>
                <th className="px-4 py-3">Composition</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Pack</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Rx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-ink-800">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center font-semibold text-slate-500 dark:text-ink-400">
                    No records yet.
                  </td>
                </tr>
              ) : (
                rows.map((m) => (
                  <tr key={m.id} className="bg-white hover:bg-slate-50 dark:bg-ink-900 dark:hover:bg-ink-800/70">
                    <td className="max-w-[260px] px-4 py-4 font-extrabold text-teal-700 dark:text-teal-300">
                      {m.name}
                    </td>
                    <td className="max-w-[360px] px-4 py-4 text-slate-800 dark:text-ink-100">
                      {medicineComposition(m)}
                    </td>
                    <td className="max-w-[260px] px-4 py-4 text-slate-800 dark:text-ink-100">
                      {m.manufacturer_name || m.manufacturer || pharmacyDash}
                    </td>
                    <td className="px-4 py-4 text-slate-800 dark:text-ink-100">{m.type || pharmacyDash}</td>
                    <td className="px-4 py-4 text-slate-800 dark:text-ink-100">{m.pack_size_label || m.pack_size || pharmacyDash}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-800 dark:text-ink-100">
                      {formatPrice(m.price)}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        {m.prescription_required || m.rx_required ? "Rx" : "OTC"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
