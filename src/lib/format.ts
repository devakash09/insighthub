/** Shared number/date formatting so every surface renders values identically. */

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US");
const currencyFull = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const currencyCents = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const MINUS = "−";
const EM_DASH = "—";

export function formatNumber(n: number): string {
  return whole.format(Math.round(n));
}

export function formatCompact(n: number): string {
  return Math.abs(n) >= 10_000 ? compact.format(n) : whole.format(Math.round(n));
}

export function formatCurrency(n: number, opts?: { cents?: boolean }): string {
  return opts?.cents ? currencyCents.format(n) : currencyFull.format(n);
}

export function formatCurrencyCompact(n: number): string {
  return Math.abs(n) >= 10_000 ? `$${compact.format(n)}` : currencyFull.format(n);
}

export function formatPercent(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

/** Signed delta, e.g. "+18.4%" / "-3.2%". */
export function formatDelta(pct: number | null): string {
  if (pct === null || !Number.isFinite(pct)) return EM_DASH;
  const sign = pct > 0 ? "+" : pct < 0 ? MINUS : "";
  return `${sign}${Math.abs(pct).toFixed(1)}%`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return `${m}m ${rem.toString().padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${(m % 60).toString().padStart(2, "0")}m`;
}

export function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(d: Date | string): string {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatRelative(d: Date | string): string {
  const diffMs = Date.now() - new Date(d).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

/** Percentage change between two values; null when the base is 0. */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
