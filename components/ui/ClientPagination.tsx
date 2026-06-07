"use client";

type ClientPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  label?: string;
};

export function getClientPageItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = (currentPage - 1) * pageSize;

  return {
    pageItems: items.slice(start, start + pageSize),
    pageCount,
    currentPage,
    start,
    end: Math.min(start + pageSize, items.length),
  };
}

export function ClientPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  label = "items",
}: ClientPaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="font-semibold text-slate-500 dark:text-ink-500">
        Showing {start}-{end} of {totalItems} {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="btn-secondary btn-sm"
        >
          Previous
        </button>
        <span className="min-w-24 text-center text-xs font-bold text-slate-500 dark:text-ink-500">
          Page {currentPage} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= pageCount}
          className="btn-secondary btn-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}
