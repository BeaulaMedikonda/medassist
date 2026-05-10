"use client";

import { useEffect, useState } from "react";
import type { Doctor } from "@/types/db";
import { TextInput, TextArea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function SettingsForm({
  doctor,
  email,
  clinicName,
  inviteCode,
}: {
  doctor: Doctor;
  email: string;
  clinicName: string;
  inviteCode: string;
}) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [letterheadPreview, setLetterheadPreview] = useState<string | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [letterheadFile, setLetterheadFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    full_name: doctor.full_name || "",
    qualification: doctor.qualification || "",
    registration_number: doctor.registration_number || "",
    hpr_id: doctor.hpr_id || "",
    clinic_name: doctor.clinic_name || "",
    clinic_address: doctor.clinic_address || "",
    clinic_phone: doctor.clinic_phone || "",
  });

  useEffect(() => {
    let ignore = false;
    async function load() {
      const supabase = supabaseBrowser();
      if (doctor.signature_url) {
        const { data } = await supabase.storage
          .from("doctor-assets")
          .createSignedUrl(doctor.signature_url, 3600);
        if (!ignore) setSignaturePreview(data?.signedUrl || null);
      }
      if (doctor.letterhead_url) {
        const { data } = await supabase.storage
          .from("doctor-assets")
          .createSignedUrl(doctor.letterhead_url, 3600);
        if (!ignore) setLetterheadPreview(data?.signedUrl || null);
      }
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [doctor.id, doctor.signature_url, doctor.letterhead_url]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadAsset(file: File, kind: "signature" | "letterhead") {
    const supabase = supabaseBrowser();
    const ext = file.name.split(".").pop() || "png";
    const path = `${doctor.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("doctor-assets")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (error) throw error;
    return path;
  }

  async function save() {
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const updates: Partial<Doctor> = {
        full_name: form.full_name.trim(),
        qualification: form.qualification.trim() || null,
        registration_number: form.registration_number.trim() || null,
        hpr_id: form.hpr_id.trim() || null,
        clinic_name: form.clinic_name.trim() || null,
        clinic_address: form.clinic_address.trim() || null,
        clinic_phone: form.clinic_phone.trim() || null,
      };
      if (signatureFile)
        updates.signature_url = await uploadAsset(signatureFile, "signature");
      if (letterheadFile)
        updates.letterhead_url = await uploadAsset(letterheadFile, "letterhead");

      const { error } = await supabase
        .from("doctors")
        .update(updates)
        .eq("id", doctor.id);
      if (error) throw error;
      push({ title: "Saved", variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save";
      push({ title: "Save failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-4 grid gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:bg-ink-900/40 dark:text-ink-500 sm:grid-cols-2">
        <div>
          Signed in as <span className="font-medium text-slate-700 dark:text-ink-300">{email}</span>{" "}
          ·{" "}
          <span className="font-medium text-slate-700 dark:text-ink-300">
            {doctor.role === "doctor"
              ? "Doctor"
              : doctor.role === "medical_assistant"
                ? "Medical Assistant"
                : "Admin"}
          </span>
        </div>
        <div className="sm:text-right">
          {clinicName} ·{" "}
          <span className="font-mono text-slate-700 dark:text-ink-300">{inviteCode}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Full name"
          required
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
        />
        <TextInput
          label="Qualification"
          value={form.qualification}
          onChange={(e) => update("qualification", e.target.value)}
        />
        <TextInput
          label="Registration number"
          value={form.registration_number}
          onChange={(e) => update("registration_number", e.target.value)}
          placeholder="State Medical Council number"
        />
        <TextInput
          label="HPR ID"
          value={form.hpr_id}
          onChange={(e) => update("hpr_id", e.target.value)}
          placeholder="ABDM Healthcare Professional Registry ID"
        />
        <TextInput
          label="Clinic phone"
          className="sm:col-span-2"
          value={form.clinic_phone}
          onChange={(e) => update("clinic_phone", e.target.value)}
        />
        <TextInput
          label="Clinic name"
          className="sm:col-span-2"
          value={form.clinic_name}
          onChange={(e) => update("clinic_name", e.target.value)}
        />
        <TextArea
          label="Clinic address"
          className="sm:col-span-2"
          value={form.clinic_address}
          onChange={(e) => update("clinic_address", e.target.value)}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AssetField
          label="Signature"
          previewUrl={signaturePreview}
          file={signatureFile}
          onChange={setSignatureFile}
        />
        <AssetField
          label="Letterhead"
          previewUrl={letterheadPreview}
          file={letterheadFile}
          onChange={setLetterheadFile}
        />
      </div>

      <div className="mt-8 flex justify-end">
        <button onClick={save} disabled={busy} className="btn-primary">
          {busy ? <Spinner /> : null}
          Save changes
        </button>
      </div>
    </div>
  );
}

function AssetField({
  label,
  previewUrl,
  file,
  onChange,
}: {
  label: string;
  previewUrl: string | null;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  const localPreview = file ? URL.createObjectURL(file) : null;
  const url = localPreview || previewUrl;
  return (
    <div>
      <label className="label">{label}</label>
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-3 transition hover:border-brand-400 hover:bg-brand-50 dark:border-ink-700 dark:bg-ink-900/40 dark:hover:border-brand-500 dark:hover:bg-brand-900/20">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="mx-auto max-h-24" />
        ) : (
          <div className="py-6 text-center text-sm text-slate-500 dark:text-ink-500">
            Click to upload an image
          </div>
        )}
        <div className="mt-2 text-center text-[11px] text-slate-500 dark:text-ink-500">
          {file ? `New: ${file.name}` : url ? "Click to replace" : ""}
        </div>
      </label>
    </div>
  );
}
