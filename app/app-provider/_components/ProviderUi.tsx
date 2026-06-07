import Link from "next/link";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

export type ProviderSearchParams = Record<string, string | string[] | undefined>;

export function getPageFromSearchParams(
  searchParams: ProviderSearchParams | undefined,
  paramName = "page",
) {
  const raw = searchParams?.[paramName];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    pageCount,
    start,
    end: Math.min(start + pageSize, items.length),
  };
}

export function PageHeader({
  title,
  eyebrow,
  description,
  action,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="premium-panel mb-6 px-5 py-5 lg:flex lg:items-end lg:justify-between lg:gap-4">
      <div>
        {eyebrow ? (
          <div className="page-kicker">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="page-title mt-1">
          {title}
        </h1>
        {description ? (
          <p className="page-description leading-6">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="mt-4 shrink-0 lg:mt-0">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="card p-4">
      <div className="label-sm">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-ink-50">{value}</div>
      {detail ? <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-ink-500">{detail}</div> : null}
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="table-shell">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-ink-800 dark:bg-ink-900/70">
        <h2 className="text-sm font-black text-slate-950 dark:text-ink-50">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatusBadge({ value }: { value: string | null | undefined }) {
  const normalized = (value || "unknown").replace(/_/g, " ");
  const tone =
    value === "active" || value === "paid" || value === "completed" || value === "passed"
      ? "status-success"
      : value === "pending_approval"
        ? "status-warning"
        : value === "trial" || value === "warning" || value === "not_started"
          ? "status-warning"
          : value === "overdue" || value === "past_due" || value === "failed" || value === "suspended"
            ? "status-danger"
            : "status-neutral";

  return (
    <span className={cn("inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-wide", tone)}>
      {normalized}
    </span>
  );
}

export function ProviderTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="premium-table min-w-[820px]">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function ProviderPagination({
  page,
  pageSize,
  totalItems,
  searchParams,
  paramName = "page",
  label = "rows",
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  searchParams?: ProviderSearchParams;
  paramName?: string;
  label?: string;
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();

    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, item));
        return;
      }
      params.set(key, value);
    });

    if (nextPage <= 1) {
      params.delete(paramName);
    } else {
      params.set(paramName, String(nextPage));
    }

    const query = params.toString();
    return query ? `?${query}` : "?";
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-3 text-sm dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold text-slate-500 dark:text-ink-500">
        Showing {start}-{end} of {totalItems} {label}
      </div>
      <div className="flex items-center gap-2">
        {currentPage <= 1 ? (
          <span className="btn-secondary btn-sm pointer-events-none opacity-50">Previous</span>
        ) : (
          <Link href={hrefFor(currentPage - 1)} className="btn-secondary btn-sm">
            Previous
          </Link>
        )}
        <span className="min-w-24 text-center text-xs font-bold text-slate-500 dark:text-ink-500">
          Page {currentPage} of {pageCount}
        </span>
        {currentPage >= pageCount ? (
          <span className="btn-secondary btn-sm pointer-events-none opacity-50">Next</span>
        ) : (
          <Link href={hrefFor(currentPage + 1)} className="btn-secondary btn-sm">
            Next
          </Link>
        )}
      </div>
    </div>
  );
}

export function DetailLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="premium-action"
    >
      Open
    </Link>
  );
}

export function DateText({ value, time = false }: { value: unknown; time?: boolean }) {
  const text = time ? formatDateTime(value as string | null) : formatDate(value as string | null);
  return <span className="whitespace-nowrap text-slate-600 dark:text-ink-400">{text}</span>;
}

export function Money({ value }: { value: number }) {
  return <span className="font-black text-slate-950 dark:text-ink-50">INR {value.toLocaleString("en-IN")}</span>;
}
