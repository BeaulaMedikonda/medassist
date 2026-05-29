//app/onboarding/OnboardingForm.tsx
"use client";
 
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TextInput, TextArea } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
 
type ClinicMode = "create" | "join";
type Role = "doctor" | "medical_assistant" | "admin";
 
export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [step, setStep] = useState<"clinic" | "profile">("clinic");
  const [busy, setBusy] = useState(false);
 
  const [mode, setMode] = useState<ClinicMode>("create");
  // Clinic creator becomes the admin by default; joiners pick doctor or medical assistant.
  const [role, setRole] = useState<Role>("doctor");
  const effectiveRole: Role = mode === "create" ? "admin" : role;
 
  // Clinic step
  const [clinicForm, setClinicForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [inviteCode, setInviteCode] = useState("");
 
  // Profile step
  const [profile, setProfile] = useState({
    full_name: "",
    qualification: "",
    registration_number: "",
    clinic_phone: "",
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
 
  // Carries the resolved clinic_id between steps
  const [clinicId, setClinicId] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState<string>("");
 
  async function exitOnboarding() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }
 
  function randomInvite() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let s = "";
    for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
 
  async function submitClinic(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      if (mode === "create") {
        if (!clinicForm.name.trim()) throw new Error("Clinic name is required");
        const { data, error } = await supabase
          .from("clinics")
          .insert({
            name: clinicForm.name.trim(),
            address: clinicForm.address.trim() || null,
            phone: clinicForm.phone.trim() || null,
            invite_code: randomInvite(),
          })
          .select("id, name, invite_code")
          .single();
        if (error || !data) throw new Error(error?.message || "Could not create clinic");
        const c = data as { id: string; name: string; invite_code: string };
        setClinicId(c.id);
        setClinicName(c.name);
      } else {
        const code = inviteCode.trim().toUpperCase();
        if (!code) throw new Error("Invite code is required");
        const { data, error } = await supabase
          .from("clinics")
          .select("id, name")
          .eq("invite_code", code)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error("No clinic found for that invite code");
        const c = data as { id: string; name: string };
        setClinicId(c.id);
        setClinicName(c.name);
      }
      setStep("profile");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not continue";
      push({ title: "Setup failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }
 
  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!clinicId) {
      push({ title: "Pick a clinic first", variant: "error" });
      return;
    }
    if (!profile.full_name.trim()) {
      push({ title: "Your name is required", variant: "error" });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          clinicName,
          role: effectiveRole,
          profile,
          signature:
            effectiveRole !== "medical_assistant" && signatureFile
              ? await fileToPayload(signatureFile)
              : null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || "Could not save profile");
      }
 
      push({
        title: "Welcome!",
        description: `Joined ${clinicName} as ${effectiveRole}`,
        variant: "success",
      });
      router.replace("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, "Could not save profile");
      push({ title: "Setup failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }
 
  if (step === "clinic") {
    return (
      <form onSubmit={submitClinic} className="card p-6 sm:p-8">
        <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setMode("create")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "create"
                ? "bg-white text-slate-900 dark:text-ink-100 shadow-soft"
                : "text-slate-600 dark:text-ink-400 hover:bg-slate-50"
            }`}
          >
            Create new clinic
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === "join"
                ? "bg-white text-slate-900 dark:text-ink-100 shadow-soft"
                : "text-slate-600 dark:text-ink-400 hover:bg-slate-50"
            }`}
          >
            Join existing clinic
          </button>
        </div>
 
        {mode === "create" ? (
          <div className="space-y-4">
            <TextInput
              label="Clinic name"
              required
              value={clinicForm.name}
              onChange={(e) => setClinicForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Asha Care Clinic"
              hint="An invite code will be generated so colleagues can join."
            />
            <TextArea
              label="Clinic address"
              value={clinicForm.address}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, address: e.target.value }))
              }
              placeholder="Street, area, city, state, PIN"
            />
            <TextInput
              label="Clinic phone"
              value={clinicForm.phone}
              onChange={(e) =>
                setClinicForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="+91 ..."
            />
          </div>
        ) : (
          <div className="space-y-4">
            <TextInput
              label="Invite code"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABCD1234"
              hint="Ask your clinic admin for the 8-character code."
              className="font-mono uppercase tracking-widest"
            />
          </div>
        )}
 
        <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={exitOnboarding} disabled={busy} className="btn-ghost">
            Back to login
          </button>
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? <Spinner /> : null}
            Continue
          </button>
        </div>
      </form>
    );
  }
 
  // Profile step
  return (
    <form onSubmit={submitProfile} className="card p-6 sm:p-8">
      <div className="mb-1 text-xs uppercase tracking-wide text-slate-400 dark:text-ink-600">
        Joining
      </div>
      <div className="mb-5 text-base font-semibold text-slate-900 dark:text-ink-100">
        {clinicName}
      </div>
 
      {mode === "create" ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <span className="font-semibold">You'll be the clinic admin.</span> You
          can add doctors and medical assistants from Settings → Team after this.
        </div>
      ) : (
        <div className="mb-6">
          <label className="label">Your role</label>
          <div className="grid grid-cols-2 gap-2">
            {(["doctor", "medical_assistant"] as Role[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                  role === r
                    ? "border-brand-500 bg-brand-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                  {r === "doctor" ? "Doctor" : "Medical Assistant"}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-ink-500">
                  {r === "doctor"
                    ? "Sees patients, records consultations, prescribes."
                    : "Creates EMRs, captures vitals, assigns to doctors."}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
 
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput
          label="Full name"
          required
          className="sm:col-span-2"
          value={profile.full_name}
          onChange={(e) =>
            setProfile((p) => ({ ...p, full_name: e.target.value }))
          }
          placeholder={role === "doctor" ? "e.g. Asha Krishnan" : "Your name"}
        />
        {effectiveRole !== "medical_assistant" ? (
          <>
            <TextInput
              label="Qualification"
              value={profile.qualification}
              onChange={(e) =>
                setProfile((p) => ({ ...p, qualification: e.target.value }))
              }
              placeholder="MBBS, MD (Gen Med)"
            />
            <TextInput
              label="Registration number"
              value={profile.registration_number}
              onChange={(e) =>
                setProfile((p) => ({
                  ...p,
                  registration_number: e.target.value,
                }))
              }
              placeholder="State medical council reg. no."
            />
            <FileField
              label="Signature image (optional now, add in Settings later)"
              file={signatureFile}
              onChange={setSignatureFile}
            />
          </>
        ) : (
          <TextInput
            label="Phone (optional)"
            value={profile.clinic_phone}
            onChange={(e) =>
              setProfile((p) => ({ ...p, clinic_phone: e.target.value }))
            }
            placeholder="+91 ..."
          />
        )}
      </div>
 
      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setStep("clinic")}
          className="btn-ghost"
          disabled={busy}
        >
          Back
        </button>
        <button type="button" onClick={exitOnboarding} className="btn-ghost" disabled={busy}>
          Back to login
        </button>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? <Spinner /> : null}
          Save & enter app
        </button>
      </div>
    </form>
  );
}
 
function getErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
 
async function fileToPayload(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    type: file.type,
    data: dataUrl.split(",")[1] || "",
  };
}
 
function FileField({
  label,
  file,
  onChange,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div className="sm:col-span-2">
      <label className="label">{label}</label>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center hover:border-brand-400 hover:bg-brand-50">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
        <span className="text-sm font-medium text-slate-700 dark:text-ink-300">
          {file ? file.name : "Click to upload"}
        </span>
      </label>
    </div>
  );
}
 
 