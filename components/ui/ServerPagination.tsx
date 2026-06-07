import Link from "next/link";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function getPageFromParams(searchParams: SearchParamsRecord | undefined, paramName = "page") {
  const raw = searchParams?.[paramName];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value || 1);
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}

export function paginateServerItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    currentPage,
    pageCount,
    start,
    end: Math.min(start + pageSize, items.length),
  };
}

export function ServerPagination({
  page,
  pageSize,
  totalItems,
  searchParams,
  paramName = "page",
  label = "items",
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  searchParams?: SearchParamsRecord;
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
      } else {
        params.set(key, value);
      }
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
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold text-slate-500">
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
        <span className="min-w-24 text-center text-xs font-bold text-slate-500">
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
