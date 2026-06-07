export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center dark:border-ink-800 dark:bg-ink-900">
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-slate-900 dark:text-ink-100">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-ink-500">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
