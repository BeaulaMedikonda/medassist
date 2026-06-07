import { requireProviderRole } from "@/lib/provider/auth";
import { getAuditRows } from "@/lib/provider/data";
import {
  DateText,
  PageHeader,
  Panel,
  ProviderPagination,
  type ProviderSearchParams,
  ProviderTable,
  StatusBadge,
  getPageFromSearchParams,
  paginateItems,
} from "@/app/app-provider/_components/ProviderUi";

export default async function ProviderAuditPage({
  searchParams,
}: {
  searchParams?: Promise<ProviderSearchParams>;
}) {
  await requireProviderRole("audit");
  const params = await searchParams;
  const rows = await getAuditRows();
  const page = getPageFromSearchParams(params);
  const pageData = paginateItems(rows, page, 50);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Security visibility"
        title="Audit & Security"
        description="Track provider actions for clinic lifecycle, billing, feature flags, team management, and security review."
      />

      <Panel title="Recent Audit Events">
        <ProviderTable headers={["Action", "Record Type", "Performed By", "Details", "Time"]}>
          {pageData.items.map((row) => (
            <tr key={row.id as string} className="hover:bg-slate-50">
              <td className="px-5 py-4"><StatusBadge value={row.action as string} /></td>
              <td className="px-5 py-4 text-slate-700">{row.entityLabel}</td>
              <td className="px-5 py-4 text-slate-600">{row.actorLabel}</td>
              <td className="max-w-md truncate px-5 py-4 text-xs font-semibold text-slate-500">
                {row.detailsLabel}
              </td>
              <td className="px-5 py-4"><DateText value={row.created_at} time /></td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={pageData.currentPage}
          pageSize={50}
          totalItems={rows.length}
          searchParams={params}
          label="audit events"
        />
        {rows.length === 0 ? (
          <div className="px-5 py-8 text-sm font-semibold text-slate-500">
            No audit events yet. Provider actions will appear here after approval, billing, feature, or team changes.
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
