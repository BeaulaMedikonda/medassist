"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = "lg",
  hideCloseButton = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  hideCloseButton?: boolean;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const widths: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/60 p-0 backdrop-blur-sm dark:bg-ink-975/70 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-t-2xl bg-white shadow-deep ring-1 ring-slate-200 animate-slideUp dark:bg-ink-900 dark:ring-ink-800 sm:rounded-xl",
          widths[maxWidth],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-ink-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">{title}</h2>
          {!hideCloseButton ? (
            <button
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-200"
              aria-label="Close"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          ) : null}
        </div>
        <div className="max-h-[80vh] overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
