import Link from "next/link";

export function FeatureDisabled({ featureName }: { featureName: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center justify-center">
      <section className="w-full rounded-lg border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-lg font-black text-amber-700">
          !
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
          Feature Not Enabled
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          {featureName} is not enabled for your clinic. Contact your app provider to enable this module.
        </p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Back to Dashboard
        </Link>
      </section>
    </div>
  );
}
