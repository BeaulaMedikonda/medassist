//app/(app)/pharmacy/PharmacyClient.tsx
"use client";
 
import { useEffect, useMemo, useState } from "react";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import {
  medicineComposition,
  pharmacyDash,
  searchMedicines,
  type MedicineSearchRow,
} from "@/lib/pharmacy/medicine-search";

const PHARMACY_PAGE_SIZE = 8;
 
function formatPrice(price: number | string | null | undefined) {
  if (typeof price === "number") return `Rs ${price.toFixed(2)}`;
  if (typeof price === "string" && price.trim()) return `Rs ${price}`;
  return pharmacyDash;
}
 
export function PharmacyClient() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<MedicineSearchRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
 
  useEffect(() => {
    const searchQuery = query.trim();
    if (!searchQuery) {
      setRows([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      const result = await searchMedicines(searchQuery);
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

  useEffect(() => {
    setPage(1);
  }, [query, rows.length]);
 
  const resultLabel = useMemo(() => {
    if (!query.trim()) return "Enter at least 2 characters to search the medicine master.";
    if (loading) return "Searching...";
    return `${rows.length} matches`;
  }, [loading, query, rows.length]);
  const pageData = getClientPageItems(rows, page, PHARMACY_PAGE_SIZE);
  const hasSearched = query.trim().length >= 2;
 
  return (
    <section className="premium-shell">
      <div className="page-header">
        <div>
          <p className="page-kicker">Medication operations</p>
          <h1 className="page-title">
            Pharmacy
          </h1>
          <p className="page-description">
            Search the medicine master for brand, generic, composition, pack, pricing, and prescription status.
          </p>
        </div>
      </div>
 
      <div className="table-shell">
        <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-900/70">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="block w-full lg:max-w-[760px]">
              <span className="label">Medicine search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by brand, generic, composition, or manufacturer"
                className="input-base mt-2 h-11"
              />
            </label>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-400">
              {resultLabel}
            </div>
          </div>
          {error ? (
            <div className="status-danger mt-3 rounded-xl px-4 py-3 text-sm font-semibold">
              Medicine lookup failed: {error}
            </div>
          ) : null}
        </div>
 
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Tablet / Drug</th>
                <th>Composition</th>
                <th>Manufacturer</th>
                <th>Type</th>
                <th>Pack</th>
                <th>Price</th>
                <th>Rx</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center font-semibold text-slate-500 dark:text-ink-400">
                    {hasSearched ? "No medicines matched this search." : "Start typing to search the medicine master."}
                  </td>
                </tr>
              ) : (
                pageData.pageItems.map((m) => (
                  <tr key={m.id}>
                    <td className="max-w-[260px] font-extrabold text-brand-700 dark:text-brand-300">
                      {m.name}
                    </td>
                    <td className="max-w-[360px] text-slate-800 dark:text-ink-100">
                      {medicineComposition(m)}
                    </td>
                    <td className="max-w-[260px] text-slate-800 dark:text-ink-100">
                      {m.manufacturer_name || m.manufacturer || pharmacyDash}
                    </td>
                    <td className="text-slate-800 dark:text-ink-100">{m.type || pharmacyDash}</td>
                    <td className="text-slate-800 dark:text-ink-100">{m.pack_size_label || m.pack_size || pharmacyDash}</td>
                    <td className="whitespace-nowrap text-slate-800 dark:text-ink-100">
                      {formatPrice(m.price)}
                    </td>
                    <td>
                      <span className="status-success rounded-full px-2.5 py-1 text-xs font-extrabold">
                        {m.prescription_required || m.rx_required ? "Rx" : "OTC"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <ClientPagination
          page={pageData.currentPage}
          pageSize={PHARMACY_PAGE_SIZE}
          totalItems={rows.length}
          onPageChange={setPage}
          label="medicines"
        />
      </div>
    </section>
  );
}
