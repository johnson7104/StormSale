import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs));
}

export interface ClickAggregate {
  iso: string;
  clicks: number;
  conversions: number;
}

export interface CountryMetric extends ClickAggregate {
  conversionRate: number;
}

export function aggregateClicksByCountry(
  rows: Array<{ iso: string; clicks?: number; conversions?: number }>,
): ClickAggregate[] {
  const map = new Map<string, ClickAggregate>();
  for (const row of rows) {
    const iso = row.iso.toUpperCase();
    if (!/^[A-Z]{2}$/.test(iso)) continue;
    const existing = map.get(iso) ?? { iso, clicks: 0, conversions: 0 };
    existing.clicks += row.clicks ?? 0;
    existing.conversions += row.conversions ?? 0;
    map.set(iso, existing);
  }
  return Array.from(map.values());
}

export function rankTopCountries(
  aggregates: ClickAggregate[],
  limit = 5,
): CountryMetric[] {
  return aggregates
    .map((a) => ({
      ...a,
      conversionRate: a.clicks > 0 ? (a.conversions / a.clicks) * 100 : 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, limit);
}

export function heatColor(intensity: number): string {
  const t = Math.max(0, Math.min(intensity, 1));
  const r = Math.round(255 * t);
  const b = Math.round(255 * (1 - t));
  return `rgb(${r}, 60, ${b})`;
}
