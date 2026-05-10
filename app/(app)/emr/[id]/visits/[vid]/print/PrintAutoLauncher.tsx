"use client";

import { useEffect } from "react";

export function PrintAutoLauncher({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    // small delay so fonts/images settle
    const t = window.setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(t);
  }, [auto]);
  return null;
}

export function PrintTriggerButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary">
      Print
    </button>
  );
}
