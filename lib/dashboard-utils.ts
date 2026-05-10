export function greeting(now: Date = new Date()) {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?";
}

export function diffMinutes(later: string | Date, earlier: string | Date) {
  const a = typeof later === "string" ? new Date(later) : later;
  const b = typeof earlier === "string" ? new Date(earlier) : earlier;
  return Math.max(0, Math.round((a.getTime() - b.getTime()) / 60000));
}

export function avgMinutes(pairs: Array<[string | Date, string | Date]>) {
  if (pairs.length === 0) return 0;
  const total = pairs.reduce((s, [a, b]) => s + diffMinutes(a, b), 0);
  return Math.round(total / pairs.length);
}
