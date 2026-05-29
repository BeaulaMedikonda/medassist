"use client";

import { useMemo, useState } from "react";

const PURPOSES = [
  "Referral",
  "Lab request",
  "Imaging request",
  "Insurance document",
  "Medical records",
  "Other",
];

export function FaxClient({
  clinicName,
  senderName,
}: {
  clinicName: string;
  senderName: string;
}) {
  const [recipient, setRecipient] = useState("");
  const [faxNumber, setFaxNumber] = useState("");
  const [patientName, setPatientName] = useState("");
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [pages, setPages] = useState("1");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);

  const coverSheet = useMemo(() => {
    const lines = [
      "FAX COVER SHEET",
      "",
      `From: ${clinicName}`,
      `Prepared by: ${senderName}`,
      `To: ${recipient || "Recipient"}`,
      `Fax: ${faxNumber || "Fax number"}`,
      `Patient: ${patientName || "Patient name"}`,
      `Purpose: ${purpose}`,
      `Pages including cover: ${pages || "1"}`,
      "",
      "Notes:",
      notes.trim() || "No additional notes.",
      "",
      "Confidential medical information. If received in error, please notify the sender and destroy this document.",
    ];

    return lines.join("\n");
  }, [clinicName, faxNumber, notes, pages, patientName, purpose, recipient, senderName]);

  async function copyCoverSheet() {
    await navigator.clipboard.writeText(coverSheet);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Fax</h1>
        <p className="text-sm text-slate-500 dark:text-ink-500">
          Prepare a clinic fax cover sheet for referrals, reports, and records.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                Recipient
              </span>
              <input
                value={recipient}
                onChange={(event) => setRecipient(event.target.value)}
                className="input-base"
                placeholder="Hospital, lab, insurer..."
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                Fax number
              </span>
              <input
                value={faxNumber}
                onChange={(event) => setFaxNumber(event.target.value)}
                className="input-base"
                placeholder="+91 ..."
              />
            </label>

            <label>
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                Patient
              </span>
              <input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="input-base"
                placeholder="Patient name"
              />
            </label>

            <div className="grid grid-cols-[1fr_120px] gap-3">
              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                  Purpose
                </span>
                <select
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="input-base"
                >
                  {PURPOSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                  Pages
                </span>
                <input
                  value={pages}
                  onChange={(event) => setPages(event.target.value)}
                  className="input-base"
                  inputMode="numeric"
                />
              </label>
            </div>

            <label className="md:col-span-2">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="input-base min-h-[180px] resize-y"
                placeholder="Add instructions, requested documents, or callback details."
              />
            </label>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Cover sheet
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => void copyCoverSheet()} className="btn-secondary">
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" onClick={() => window.print()} className="btn-primary">
                Print
              </button>
            </div>
          </div>
          <pre className="min-h-[420px] whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-800 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-200">
            {coverSheet}
          </pre>
        </aside>
      </div>
    </div>
  );
}
