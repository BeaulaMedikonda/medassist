import { supabaseAdmin } from "@/lib/supabase/admin";

export type ProviderAuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logProviderAudit({
  actorId,
  action,
  entityType,
  entityId,
  metadata = {},
}: ProviderAuditInput) {
  const { error } = await supabaseAdmin().from("audit_events").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId || null,
    metadata,
  } as never);

  if (error) {
    console.warn("Provider audit log failed", error.message);
  }
}
