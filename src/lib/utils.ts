import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** A geo-heatmap data point aggregated by country ISO code. */
export interface ClickHeatmapPoint {
  /** ISO- 3166-1 alpha-2 country code (e.g. "US"). */
  countryIso: string;
  countryName: string;
  clicks: number;
  conversions: number;
}

export interface ClickHeatmapRaw {
  countryIso: string;
  clicks: number;
  conversions: number;
}

export interface ClickHeatmapFilter {
  startDate?: Date | string;
  endDate?: Date | string;
  campaignLinkId?: string;
}

export interface CountryRanking extends ClickHeatmapPoint {
  rank: number;
  conversionRate: number;
}

const ISO_COUNTRY_CODE_REGEX = /^[A-Za-z]{2}$/;

/**
 * Normalizes a country code to an uppercase ISO 3166-1 alpha-2 code.
 * Returns null for invalid or missing codes so that raw or malformed
 * geolocation values are never stored or rendered.
 */
export function normalizeCountryIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const trimmed = iso.trim().toUpperCase();
  return ISO_COUNTRY_CODE_REGEX.test(trimmed) ? trimmed : null;
}

function toTimestamp(value: Date | string | undefined): number | null {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

/**
 * Aggregates raw click/conversion rows by country ISO code.
 * Rows with missing or invalid country codes are dropped rather than
 * being attributed to a fake country, keeping the heatmap free of PII and of residual raw geodata.
 */
export function aggregateClicksByCountry(
  rows: ClickHeatmapRaw[],
): ClickHeatmapPoint[] {
  const buckets = new Map<string, ClickHeatmapPoint>();

  for (const row of rows) {
    const iso = normalizeCountryIso(row.countryIso);
    if (!iso) continue;

    const clicks = Number.isFinite(row.clicks) ? Math.max(0, Math.floor(row.clicks)) : 0;
    const conversions = Number.isFinite(row.conversions)
      ? Math.max(0, Math.floor(row.conversions))
      : 0;

    const existing = buckets.get(iso);
    if (existing) {
      existing.clicks += clicks;
      existing.conversions += conversions;
    } else {
      buckets.set(iso, {
        countryIso: iso,
        countryName: iso,
        clicks,
        conversions,
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) => b.clicks - a.clicks);
}

/**
 * Filters raw click rows by date range and optional campaign link.
 * Rows are expected to carry an ISO date string or Date in `occurredAt`.
 */
export function filterClickRows(
  rows: (ClickHeatmapRaw & { occurredAt?: Date | string; campaignLinkId?: string })[],
  filter: ClickHeatmapFilter,
): (ClickHeatmapRaw & { occurredAt?: Date | string; campaignLinkId?: string })[] {
  const start = toTimestamp(filter.startDate);
  const end = toTimestamp(filter.endDate);
  const campaignLinkId = filter.campaignLinkId?.trim() || null;

  return rows.filter((row) => {
    if (campaignLinkId && row.campaignLinkId !== campaignLinkId) {
      return false;
    }

    if (start === null && end === null) return true;

    const occurredAt = toTimestamp(row.occurredAt);
    if (occurredAt === null) return false;
    if (start !== null && occurredAt < start) return false;
    if (end !== null && occurredAt > end) return false;
    return true;
  });
}

/**
 * Ranks countries by click volume and attaches conversion percentages.
 * Returns the top `Limit` countries (default 5).
 */
export function rankTopCountries(
  points: ClickHeatmapPoint[],
  limit = 5,
): CountryRanking[] {
  const sorted = [...points].sort((a, b) => b.clicks - a.clicks).slice(0, Math.max(0, limit));

  return sorted.map((point, index) => ({
    ...point,
    rank: index + 1,
    conversionRate:
      point.clicks > 0 ? (point.conversions / point.clicks) * 100 : 0,
  }));
}

/**
 * Returns the maximum click volume across points, used to scale
 * heatmap cluster radii/opacity in the SVG map.
 */
export function maxClickVolume(points: ClickHeatmapPoint[]): number {
  return points.reduce((max, point) => Math.max(max, point.clicks), 0);
}
