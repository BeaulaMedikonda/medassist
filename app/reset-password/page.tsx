"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";

function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    const code = search.get("code");

    async function prepareResetSession() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          push({
            title: "Reset link expired",
            description: "Please request a fresh password reset email and open the newest link.",
            variant: "error",
          });
          setReady(false);
          return;
        }

        setReady(true);
        router.replace("/reset-password");
        return;
      }

      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    }

    prepareResetSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [push, router, search]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      push({ title: "Use at least 6 characters", variant: "error" });
      return;
    }

    if (password !== confirmPassword) {
      push({ title: "Passwords do not match", variant: "error" });
      return;
    }

    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      push({ title: "Password updated", description: "Sign in with your new password.", variant: "success" });
      router.replace("/login");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not update password.";
      push({ title: "Password update failed", description: message, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f0f4f8] px-4 py-12">
      <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white px-8 py-8 shadow-[0_4px_24px_-6px_rgba(15,23,42,0.12),0_1px_4px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0ea5a4]">
          Password reset
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold tracking-tight text-slate-900">
          Set a new password
        </h1>
        <p className="mt-1.5 text-sm font-medium text-slate-500">
          Enter your new staff password below.
        </p>

        {!ready ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            Open this page from the password reset email link. If the link expired, request a new reset email.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                New password
              </span>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-base h-12 rounded-2xl px-4"
                required
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-slate-500">
                Confirm password
              </span>
              <input
                type="password"
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="input-base h-12 rounded-2xl px-4"
                required
              />
            </label>

            <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
              {busy ? <Spinner /> : null}
              Update Password
            </button>
          </form>
        )}

        <Link href="/login" className="btn-secondary mt-4 h-11 w-full text-[13px]">
          Back to Login
        </Link>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}
