"use client";

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

export function PreVisitSummary({
  visitId,
  initialSummary,
  initialGeneratedAt,
}: {
  visitId: string;
  initialSummary: string | null;
  initialGeneratedAt: string | null;
}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function generate(force: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/pre-visit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, force }),
      });
      const j = (await res.json()) as {
        summary?: string;
        error?: string;
        cached?: boolean;
      };
      if (!res.ok) throw new Error(j.error || `Failed (${res.status})`);
      if (j.summary) {
        setSummary(j.summary);
        setGeneratedAt(new Date().toISOString());
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Could not generate summary");
    } finally {
      setBusy(false);
    }
  }

  // Auto-generate the first time the doctor lands on the review screen if missing.
  useEffect(() => {
    if (!summary && !busy) {
      void generate(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card border-brand-200 bg-gradient-to-br from-brand-50/70 to-white p-4 dark:border-brand-900/40 dark:from-brand-900/20 dark:to-ink-900 sm:p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-soft">
            <svg viewBox="0 0 20 20" className="h-4 w-4">
              <path
                d="M10 2a4 4 0 014 4v1a5 5 0 011.5 8.4 1 1 0 01-1 .1A5 5 0 0110 12a5 5 0 01-4.5 3.5 1 1 0 01-1-.1A5 5 0 016 7V6a4 4 0 014-4z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
              Pre-visit AI brief
            </div>
            <div className="text-[11px] text-slate-500 dark:text-ink-500">
              Vitals + last 2 visits across the clinic
            </div>
          </div>
        </div>
        <button
          onClick={() => generate(true)}
          disabled={busy}
          className="text-[11px] font-medium text-brand-700 hover:underline disabled:opacity-50"
        >
          {busy ? "Refreshing…" : summary ? "Refresh" : "Generate"}
        </button>
      </div>

      {err ? (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {err}
        </div>
      ) : null}

      {busy && !summary ? (
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-ink-500">
          <Spinner /> Reading vitals & history…
        </div>
      ) : summary ? (
        <SummaryView text={summary} />
      ) : !err ? (
        <p className="text-sm text-slate-500 dark:text-ink-500">No summary yet.</p>
      ) : null}

      {generatedAt ? (
        <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-400 dark:text-ink-600">
          Generated {new Date(generatedAt).toLocaleString("en-IN")}
        </div>
      ) : null}
    </section>
  );
}

// Tiny markdown renderer for the four-section brief: handles **bold**, headings (lines starting with **),
// and bullet lines starting with "- ".
function SummaryView({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-3 text-sm leading-relaxed text-slate-800 dark:text-ink-200">
      {blocks.map((b, i) => (
        <Block key={i} text={b} />
      ))}
    </div>
  );
}

function Block({ text }: { text: string }) {
  const lines = text.split("\n");
  const headingMatch = lines[0].match(/^\*\*(.+?)\*\*\s*(.*)$/);
  if (headingMatch) {
    const heading = headingMatch[1];
    const sameLineRest = headingMatch[2].trim();
    const body = [sameLineRest, ...lines.slice(1)].filter(Boolean).join("\n");
    return (
      <div>
        <div className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-brand-800">
          {heading.replace(/^—\s*/, "")}
        </div>
        <FormattedBody body={body} />
      </div>
    );
  }
  return <FormattedBody body={text} />;
}

function FormattedBody({ body }: { body: string }) {
  const lines = body.split("\n").map((l) => l.trim()).filter(Boolean);
  const allBullets = lines.length > 0 && lines.every((l) => l.startsWith("- ") || l.startsWith("* "));
  if (allBullets) {
    return (
      <ul className="ml-5 list-disc space-y-0.5">
        {lines.map((l, i) => (
          <li key={i}>{renderInline(l.replace(/^[-*]\s+/, ""))}</li>
        ))}
      </ul>
    );
  }
  return (
    <p className="whitespace-pre-line">
      {lines.map((l, i) => (
        <span key={i}>
          {renderInline(l)}
          {i < lines.length - 1 ? "\n" : ""}
        </span>
      ))}
    </p>
  );
}

function renderInline(line: string): React.ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="font-semibold text-slate-900 dark:text-ink-100">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}
