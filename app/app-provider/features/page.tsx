import { requireProviderRole } from "@/lib/provider/auth";
import { getFeatureFlagRows } from "@/lib/provider/data";
import { PageHeader, Panel } from "@/app/app-provider/_components/ProviderUi";
import { FeatureFlagsClient } from "./FeatureFlagsClient";

export default async function ProviderFeaturesPage() {
  const { admin } = await requireProviderRole("features");
  const canEdit = admin.role === "platform_owner" || admin.role === "platform_admin";
  const rows = await getFeatureFlagRows();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module control"
        title="Feature Flags"
        description="Enable or disable major MedAssist modules per clinic."
      />

      <Panel title="Clinic Modules">
        <FeatureFlagsClient rows={rows} canEdit={canEdit} />
      </Panel>
    </div>
  );
}
