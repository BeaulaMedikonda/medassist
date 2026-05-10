"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextInput, TextArea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { InviteCodeBox } from "@/components/dashboard/InviteCodeBox";
import type { Clinic } from "@/types/db";

export function ClinicSettingsForm({ clinic }: { clinic: Clinic }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    name: clinic.name || "",
    city: clinic.city || "",
    state: clinic.state || "",
    phone: clinic.phone || "",
    email: clinic.email || "",
    address: clinic.address || "",
    established_year:
      clinic.established_year != null ? String(clinic.established_year) : "",
    letterhead_header: clinic.letterhead_header || "",
    letterhead_footer:
      clinic.letterhead_footer ||
      "AI-generated drafts reviewed and approved by the doctor. This prescription is valid for 30 days from date of issue.",
  });

  function update<K extends keyof typeof form>(key: K, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function save() {
    if (!form.name.trim()) {
      push({ title: "Clinic name is required", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/clinic", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          established_year: form.established_year
            ? parseInt(form.established_year, 10) || null
            : null,
          letterhead_header: form.letterhead_header.trim() || null,
          letterhead_footer: form.letterhead_footer.trim() || null,
        }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error || "Save failed");
      push({ title: "Clinic settings saved", variant: "success" });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save";
      push({ title: "Save failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="card p-6 lg:col-span-2 sm:p-8">
        <div className="mb-1 flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">Clinic profile</h2>
          <span className="badge bg-violet-100 text-violet-700">Admin only</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-ink-500">
          These details appear on the prescription letterhead and the admin dashboard.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextInput
            label="Clinic name"
            className="sm:col-span-2"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Sunrise Multispeciality Clinic"
          />
          <TextInput
            label="City"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
          <TextInput
            label="State"
            value={form.state}
            onChange={(e) => update("state", e.target.value)}
          />
          <TextInput
            label="Phone"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <TextInput
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <TextArea
            label="Address"
            className="sm:col-span-2"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
          <TextInput
            label="Established year"
            type="number"
            min={1900}
            max={2100}
            value={form.established_year}
            onChange={(e) => update("established_year", e.target.value)}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-ink-100">Prescription letterhead</h3>
          <p className="text-xs text-slate-500 dark:text-ink-500">
            Header text appears at the top of each printed prescription. Footer text is the medico-legal disclaimer.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4">
            <TextInput
              label="Letterhead header"
              value={form.letterhead_header}
              onChange={(e) => update("letterhead_header", e.target.value)}
              placeholder="e.g. Sunrise Multispeciality Clinic — Hyderabad"
            />
            <TextArea
              label="Footer disclaimer"
              value={form.letterhead_footer}
              onChange={(e) => update("letterhead_footer", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={save} disabled={busy} className="btn-primary">
            {busy ? <Spinner /> : null}
            Save clinic settings
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <InviteCodeBox clinicId={clinic.id} initialCode={clinic.invite_code} />
        <div className="card p-5 text-xs text-slate-500 dark:text-ink-500">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-ink-100">Need to add staff?</h3>
          <p className="mt-1">
            Share the invite code above. New members enter it during onboarding so they're added to this clinic.
          </p>
          <a
            href="/settings/team"
            className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:underline"
          >
            Manage team →
          </a>
        </div>
      </div>
    </div>
  );
}
