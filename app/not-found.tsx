import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <div className="text-6xl">🩺</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Page not found</h1>
        <p className="mt-1 text-sm text-slate-500">
          The patient or visit you're looking for couldn't be located.
        </p>
        <Link href="/emr" className="btn-primary mt-6 inline-flex">
          Back to EMR list
        </Link>
      </div>
    </div>
  );
}
