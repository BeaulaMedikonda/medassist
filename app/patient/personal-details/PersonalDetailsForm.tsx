"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Patient } from "@/types/db";

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  address: string;
  blood_group: string;
  known_allergies: string;
  chronic_conditions: string;
  emergency_contact: string;
};

export function PersonalDetailsForm({ patient }: { patient: Patient }) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<FormState>({
    full_name: patient.full_name || "",
    phone: patient.phone || "",
    email: patient.email || "",
    address: patient.address || "",
    blood_group: patient.blood_group || "",
    known_allergies: patient.known_allergies || "",
    chronic_conditions: patient.chronic_conditions || "",
    emergency_contact: patient.emergency_contact || "",
  });

  function update(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    try {
      const res = await fetch("/api/patient/personal-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Could not submit details");
      }

      push({
        title: "Details submitted",
        description: "Clinic staff can review this before updating your official EMR record.",
        variant: "success",
      });
    } catch (err: unknown) {
      push({
        title: "Submission failed",
        description: err instanceof Error ? err.message : "Could not submit details",
        variant: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full Name" value={form.full_name} onChange={(value) => update("full_name", value)} />
        <Field label="Phone" value={form.phone} onChange={(value) => update("phone", value)} />
        <Field label="Email" type="email" value={form.email} onChange={(value) => update("email", value)} />
        <Field label="Blood Group" value={form.blood_group} onChange={(value) => update("blood_group", value)} />
        <Field label="Known Allergies" value={form.known_allergies} onChange={(value) => update("known_allergies", value)} />
        <Field label="Chronic Conditions" value={form.chronic_conditions} onChange={(value) => update("chronic_conditions", value)} />
        <Field label="Emergency Contact" value={form.emergency_contact} onChange={(value) => update("emergency_contact", value)} />
        <Field label="Address" value={form.address} onChange={(value) => update("address", value)} />
      </div>

      <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm font-semibold text-slate-600">
        Your submission will not directly overwrite the clinic EMR. Staff should review it first.
      </div>

      <button
        type="submit"
        disabled={busy}
        className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#2563eb] px-4 text-sm font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(37,99,235,0.85)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-8"
      >
        {busy ? "Submitting..." : "Submit Details"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition focus:border-[#0ea5a4] focus:ring-4 focus:ring-[#0ea5a4]/10"
      />
    </label>
  );
}
