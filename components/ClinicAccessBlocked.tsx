import type { ClinicSubscriptionState } from "@/lib/clinic-subscription";

export function ClinicAccessBlocked({
  clinicName,
  subscription,
}: {
  clinicName: string;
  subscription: ClinicSubscriptionState;
}) {
  const statusLabel = subscription.status.replace(/_/g, " ");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
      <section className="w-full rounded-lg border border-rose-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-lg font-black text-rose-700">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Clinic Access Restricted
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          {clinicName} is currently marked as {statusLabel}. Contact your app provider to restore access.
        </p>
      </section>
    </div>
  );
}
