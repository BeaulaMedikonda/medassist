"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Spinner";

export function InviteCodeBox({
  clinicId,
  initialCode,
  onChange,
}: {
  clinicId: string;
  initialCode: string;
  onChange?: (next: string) => void;
}) {
  const [code, setCode] = useState(initialCode);
  const [regenerating, setRegen] = useState(false);
  const { push } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      push({ title: "Invite code copied", variant: "success" });
    } catch {
      push({ title: "Could not copy", variant: "error" });
    }
  }

  async function regenerate() {
    if (
      !confirm(
        "Regenerate the invite code? The current code will stop working immediately.",
      )
    ) {
      return;
    }
    setRegen(true);
    try {
      const res = await fetch("/api/clinic/regenerate-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId }),
      });
      const j = (await res.json()) as { invite_code?: string; error?: string };
      if (!res.ok || !j.invite_code) {
        throw new Error(j.error || "Could not regenerate code");
      }
      setCode(j.invite_code);
      onChange?.(j.invite_code);
      push({ title: "New invite code generated", variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed";
      push({ title: "Could not regenerate", description: msg, variant: "error" });
    } finally {
      setRegen(false);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        Staff invite code
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-ink-500">
        Share this code with new staff so they can join during sign-up.
      </p>
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-brand-300 bg-brand-50 dark:border-brand-700/50 dark:bg-brand-900/20 px-4 py-3">
        <code className="flex-1 truncate font-mono text-sm font-bold text-brand-800 dark:text-brand-300">
          {code}
        </code>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100 dark:bg-ink-900 dark:text-brand-300 dark:ring-brand-800/60 dark:hover:bg-ink-800"
        >
          Copy
        </button>
      </div>
      <button
        onClick={regenerate}
        disabled={regenerating}
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-ink-400 hover:text-slate-900 dark:text-ink-100 disabled:opacity-50"
      >
        {regenerating ? <Spinner /> : null}
        Regenerate code
      </button>
    </div>
  );
}
