import { requireProviderRole } from "@/lib/provider/auth";
import { getUsageRows } from "@/lib/provider/data";
import {
  DateText,
  Money,
  PageHeader,
  Panel,
  ProviderPagination,
  type ProviderSearchParams,
  ProviderTable,
  StatCard,
  StatGrid,
  getPageFromSearchParams,
  paginateItems,
} from "@/app/app-provider/_components/ProviderUi";

export default async function ProviderUsagePage({
  searchParams,
}: {
  searchParams?: Promise<ProviderSearchParams>;
}) {
  await requireProviderRole("usage");
  const params = await searchParams;
  const { rows, totalsByClinic } = await getUsageRows();
  const clinicCostPage = getPageFromSearchParams(params, "clinicCostPage");
  const usagePage = getPageFromSearchParams(params, "usagePage");
  const clinicCostPageData = paginateItems(totalsByClinic, clinicCostPage, 25);
  const usagePageData = paginateItems(rows, usagePage, 50);
  const totalCost = rows.reduce((sum, row) => sum + row.costInr, 0);
  const claudeCalls = rows.filter((row) => String(row.service).startsWith("claude")).length;
  const sarvamCalls = rows.filter((row) => row.service === "sarvam_stt").length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI and API telemetry"
        title="API Usage & Cost"
        description="Track Claude, Sarvam, and other metered platform usage per clinic."
      />

      <StatGrid>
        <StatCard label="Tracked calls" value={rows.length} detail="Latest 1,000 usage events" />
        <StatCard label="Estimated cost" value={`INR ${totalCost.toFixed(2)}`} detail="Based on stored event cost" />
        <StatCard label="Claude calls" value={claudeCalls} detail="Extraction and summary calls" />
        <StatCard label="Sarvam calls" value={sarvamCalls} detail="Transcription calls" />
      </StatGrid>

      <Panel title="Cost By Clinic">
        <ProviderTable headers={["Clinic", "Calls", "Estimated Cost"]}>
          {clinicCostPageData.items.map((row) => (
            <tr key={row.clinicName} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-black text-slate-950">{row.clinicName}</td>
              <td className="px-5 py-4 text-slate-700">{row.calls}</td>
              <td className="px-5 py-4"><Money value={Number(row.costInr.toFixed(2))} /></td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={clinicCostPageData.currentPage}
          pageSize={25}
          totalItems={totalsByClinic.length}
          searchParams={params}
          paramName="clinicCostPage"
          label="clinics"
        />
      </Panel>

      <Panel title="Recent Usage Events">
        <ProviderTable headers={["Clinic", "Service", "Operation", "Tokens / Audio", "Cost", "Created"]}>
          {usagePageData.items.map((row) => (
            <tr key={row.id as string} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-black text-slate-950">{row.clinicName}</td>
              <td className="px-5 py-4 text-slate-700">{row.service as string}</td>
              <td className="px-5 py-4 text-slate-600">{(row.operation as string) || "Unknown"}</td>
              <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                {row.service === "sarvam_stt"
                  ? `${Number(row.audio_duration_seconds || 0).toFixed(0)} sec`
                  : `${Number(row.input_tokens || 0)} in / ${Number(row.output_tokens || 0)} out`}
              </td>
              <td className="px-5 py-4"><Money value={Number(row.costInr.toFixed(2))} /></td>
              <td className="px-5 py-4"><DateText value={row.created_at} time /></td>
            </tr>
          ))}
        </ProviderTable>
        <ProviderPagination
          page={usagePageData.currentPage}
          pageSize={50}
          totalItems={rows.length}
          searchParams={params}
          paramName="usagePage"
          label="events"
        />
      </Panel>
    </div>
  );
}

