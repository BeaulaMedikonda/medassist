import { requireProviderRole } from "@/lib/provider/auth";
import { publicEnv, serverEnv } from "@/lib/env";
import { getProviderStats } from "@/lib/provider/data";
import { PageHeader, Panel, StatCard, StatGrid, StatusBadge } from "@/app/app-provider/_components/ProviderUi";

export default async function ProviderSystemPage() {
  await requireProviderRole("system");
  const stats = await getProviderStats();
  const checks = [
    { label: "Supabase URL", ok: Boolean(publicEnv.supabaseUrl), detail: publicEnv.supabaseUrl || "Missing" },
    { label: "Supabase anon key", ok: Boolean(publicEnv.supabaseAnonKey), detail: publicEnv.supabaseAnonKey ? "Configured" : "Missing" },
    { label: "Service role key", ok: Boolean(serverEnv.supabaseServiceRoleKey), detail: serverEnv.supabaseServiceRoleKey ? "Configured" : "Missing" },
    { label: "Anthropic API key", ok: Boolean(serverEnv.anthropicApiKey), detail: serverEnv.anthropicApiKey ? "Configured" : "Missing" },
    { label: "Sarvam API key", ok: Boolean(serverEnv.sarvamApiKey), detail: serverEnv.sarvamApiKey ? "Configured" : "Missing" },
    { label: "Whisper service", ok: Boolean(serverEnv.whisperServiceUrl), detail: serverEnv.whisperServiceUrl || "Optional / not configured" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="System Health"
        description="Basic provider health view for environment readiness and platform activity."
      />

      <StatGrid>
        <StatCard label="Clinics" value={stats.totalClinics} detail={`${stats.activeClinics} active or trial`} />
        <StatCard label="Pending approval" value={stats.pendingClinics} detail="Awaiting provider decision" />
        <StatCard label="Blocked clinics" value={stats.blockedClinics} detail="Expired, suspended, or cancelled" />
        <StatCard label="API events" value={stats.apiCallsThisMonth} detail="Tracked this month" />
        <StatCard label="Visits this month" value={stats.monthlyVisits} detail="Clinical workflow volume" />
        <StatCard label="Estimated API cost" value={`INR ${stats.monthlyApiCostInr.toFixed(2)}`} detail="This month" />
      </StatGrid>

      <Panel title="Configuration Checks">
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-950">{check.label}</div>
                <div className="mt-1 truncate text-xs font-semibold text-slate-500">{check.detail}</div>
              </div>
              <StatusBadge value={check.ok ? "active" : "failed"} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}


