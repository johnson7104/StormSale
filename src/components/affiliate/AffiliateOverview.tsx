import { useCallback, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  Copy,
  Download,
  Link2,
  QrCode,
  ShieldCheck,
  Globe2,
  Calendar,
} from "lucide-react";
import { useWeb3 } from "../../context/Web3Context";

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

async function createEncryptedAffiliateUrl(affiliate: string, campaignId: string) {
  if (!globalThis.crypto?.subtle) throw new Error("Secure link generation requires HTTPS.");

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(
    JSON.stringify({ v: 1, affiliate, campaignId, createdAt: new Date().toISOString() }),
  );
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", key));
  const params = new URLSearchParams({
    ref: `v1.${toBase64Url(iv)}.${toBase64Url(new Uint8Array(ciphertext))}`,
  });
  const url = new URL(window.location.origin);
  url.search = params.toString();
  url.hash = `key=${toBase64Url(rawKey)}`;
  return url.toString();
}

const AffiliateLinkGenerator = () => {
  const { userAddress } = useWeb3();
  const [campaignId, setCampaignId] = useState("");
  const [affiliateOverride, setAffiliateOverride] = useState<string | null>(null);
  const affiliateAddress = affiliateOverride ?? userAddress ?? "";
  const [shareUrl, setShareUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const generate = useCallback(async () => {
    setMessage("");
    setShareUrl("");
    setQrDataUrl("");
    if (!affiliateAddress.trim() || !campaignId.trim()) {
      setMessage("Enter an affiliate wallet and campaign ID to create a link.");
      return;
    }
    setIsGenerating(true);
    try {
      const nextUrl = await createEncryptedAffiliateUrl(affiliateAddress.trim(), campaignId.trim());
      const qr = await QRCode.toDataURL(nextUrl, {
        errorCorrectionLevel: "H",
        margin: 2,
        width: 220,
        color: { dark: "#18181b", light: "#ffffff" },
      });
      setShareUrl(nextUrl);
      setQrDataUrl(qr);
      setMessage("Encrypted link and QR code are ready.");
    } catch {
      setMessage("Could not create your link. Use a secure (HTTPS) connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [affiliateAddress, campaignId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link copied to clipboard.");
    } catch {
      setMessage("Clipboard access is unavailable. Select and copy the link below.");
    }
  };

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900/50">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/70 bg-gradient-to-r from-indigo-50/80 to-white dark:from-indigo-500/10 dark:to-zinc-900/40">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white">
              Encrypted link & QR code
            </CardTitle>
            <CardDescription className="mt-1 text-zinc-500 dark:text-zinc-400">
              Create a private, campaign-specific tracking link to share anywhere.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="affiliate-wallet"
                className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Affiliate wallet
              </label>
              <input
                id="affiliate-wallet"
                value={affiliateAddress}
                onChange={(event) => setAffiliateOverride(event.target.value)}
                placeholder="G... wallet address"
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <label
                htmlFor="campaign-id"
                className="mb-1.5 block text-xs font-semibold text-zinc-600 dark:text-zinc-300"
              >
                Campaign ID
              </label>
              <input
                id="campaign-id"
                value={campaignId}
                onChange={(event) => setCampaignId(event.target.value)}
                placeholder="e.g. spring-launch"
                className="w-full h-11 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-3.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <Button
              onClick={generate}
              disabled={isGenerating}
              className="h-11 w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold"
            >
              <QrCode className="mr-2 h-4 w-4" />
              {isGenerating
                ? "Generating secure link…"
                : shareUrl
                  ? "Generate a new link"
                  : "Generate link & QR code"}
            </Button>
            {message && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs text-zinc-500 dark:text-zinc-400"
              >
                {message}
              </p>
            )}
            {shareUrl && (
              <div className="space-y-2">
                <label
                  htmlFor="share-link"
                  className="block text-xs font-semibold text-zinc-600 dark:text-zinc-300"
                >
                  Your share link
                </label>
                <div className="flex gap-2">
                  <input
                    id="share-link"
                    readOnly
                    value={shareUrl}
                    className="min-w-0 flex-1 h-10 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 px-3 text-xs text-zinc-600 dark:text-zinc-300"
                  />
                  <Button
                    variant="outline"
                    onClick={copyLink}
                    aria-label="Copy affiliate link"
                    className="h-10 rounded-lg px-3"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>
                AES-256-GCM encrypts your affiliate and campaign details. The key stays in the URL
                fragment and is not sent with the request.
              </span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-700 bg-slate-50/70 dark:bg-zinc-950/40 p-5 text-center">
            {qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt="QR code for encrypted affiliate tracking link"
                  className="h-[180px] w-[180px] rounded-xl bg-white p-2 shadow-sm"
                />
                <p className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                  Scan to open your affiliate link
                </p>
                <a
                  href={qrDataUrl}
                  download="stormsale-affiliate-qr.png"
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:border-indigo-400"
                >
                  <Download className="h-3.5 w-3.5" /> Download QR
                </a>
              </>
            ) : (
              <>
                <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl bg-white dark:bg-zinc-900 text-slate-300 dark:text-zinc-700">
                  <QrCode className="h-16 w-16" strokeWidth={1.25} />
                </div>
                <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                  Your QR code appears here
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

type GeoClick = {
  country: string;
  iso: string;
  clicks: number;
  conversions: number;
  x: number;
  y: number;
};

const GEO_DATA: GeoClick[] = [
  { country: "United States", iso: "US", clicks: 4820, conversions: 168, x: 22, y: 38 },
  { country: "United Kingdom", iso: "GB", clicks: 2140, conversions: 92, x: 46, y: 30 },
  { country: "Germany", iso: "DE", clicks: 1890, conversions: 71, x: 50, y: 33 },
  { country: "India", iso: "IN", clicks: 1620, conversions: 58, x: 68, y: 48 },
  { country: "Brazil", iso: "BR", clicks: 1240, conversions: 39, x: 32, y: 68 },
  { country: "Canada", iso: "CA", clicks: 980, conversions: 34, x: 20, y: 28 },
  { country: "Australia", iso: "AU", clicks: 760, conversions: 22, x: 82, y: 74 },
  { country: "Japan", iso: "JP", clicks: 640, conversions: 19, x: 84, y: 36 },
  { country: "Nigeria", iso: "NG", clicks: 520, conversions: 14, x: 50, y: 55 },
  { country: "Mexico", iso: "MX", clicks: 410, conversions: 11, x: 17, y: 50 },
];

const DATE_RANGES = [
  { id: "7d", label: "7 days", factor: 0.25 },
  { id: "30d", label: "30 days", factor: 1 },
  { id: "90d", label: "90 days", factor: 2.4 },
] as const;

const CAMPAIGN_FILTERS = [
  { id: "all", label: "All campaigns", factor: 1 },
  { id: "spring-launch", label: "Spring Launch", factor: 0.55 },
  { id: "web3-masterclass", label: "Web3 Masterclass", factor: 0.3 },
] as const;

const GeoHeatmap = () => {
  const [rangeId, setRangeId] = useState<(typeof DATE_RANGES)[number]["id"]>("30d");
  const [campaignId, setCampaignId] = useState<(typeof CAMPAIGN_FILTERS)[number]["id"]>("all");

  const rangeFactor = DATE_RANGES.find((r) => r.id === rangeId)?.factor ?? 1;
  const campaignFactor = CAMPAIGN_FILTERS.find((c) => c.id === campaignId)?.factor ?? 1;

  const scaled = useMemo(
    () =>
      GEO_DATA.map((row) => ({
        ...row,
        clicks: Math.round(row.clicks * rangeFactor * campaignFactor),
        conversions: Math.round(row.conversions * rangeFactor * campaignFactor),
      })),
    [rangeFactor, campaignFactor],
  );

  const maxClicks = useMemo(
    () => Math.max(1, ...scaled.map((row) => row.clicks)),
    [scaled],
  );

  const topCountries = useMemo(
    () =>
      [...scaled]
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 5),
    [scaled],
  );

  const totalClicks = useMemo(() => scaled.reduce((sum, row) => sum + row.clicks, 0), [scaled]);
  const totalConversions = useMemo(
    () => scaled.reduce((sum, row) => sum + row.conversions, 0),
    [scaled],
  );

  return (
    <Card className="overflow-hidden border border-slate-200 dark:border-zinc-800 shadow-sm rounded-2xl bg-white dark:bg-zinc-900/50">
      <CardHeader className="border-b border-slate-100 dark:border-zinc-800/70 bg-gradient-to-r from-sky-50/80 to-white dark:from-sky-500/10 dark:to-zinc-900/40">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-sky-600/20">
              <Globe2 className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white">
                Real-time click heatmap
              </CardTitle>
              <CardDescription className="mt-1 text-zinc-500 dark:text-zinc-400">
                Clicks aggregated by country ISO code — no raw PII stored.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-500" />
              <select
                aria-label="Date range"
                value={rangeId}
                onChange={(e) => setRangeId(e.target.value as (typeof DATE_RANGES)[number]["id"])}
                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-200 outline-none"
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-2.5 py-1.5">
              <Target className="h-3.5 w-3.5 text-zinc-500" />
              <select
                aria-label="Campaign filter"
                value={campaignId}
                onChange={(e) =>
                  setCampaignId(e.target.value as (typeof CAMPAIGN_FILTERS)[number]["id"])
                }
                className="bg-transparent text-xs font-semibold text-zinc-700 dark:text-zinc-200 outline-none"
              >
                {CAMPAIGN_FILTERS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5 md:p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60">
            <svg
              viewBox="0 0 100 100"
              role="img"
              aria-label="World map heatmap of clicks by country"
              className="h-full w-full"
            >
              <defs>
                <radialGradient id="heatGradient">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#f43f5e" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="transparent" />
              <g className="transition-opacity duration-500">
                {scaled.map((row) => {
                  const radius = 4 + (row.clicks / maxClicks) * 12;
                  const opacity = 0.25 + (row.clicks / maxClicks) * 0.75;
                  const conversionRate = row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0;
                  return (
                    <g key={row.iso}>
                      <circle
                        cx={row.x}
                        cy={row.y}
                        r={radius * 2.2}
                        fill="url(#heatGradient)"
                        className="transition-all duration-500 ease-out"
                        opacity={opacity * 0.6}
                      />
                      <circle
                        cx={row.x}
                        cy={row.y}
                        r={radius}
                        fill="#f43f5e"
                        className="transition-all duration-500 ease-out cursor-pointer"
                        opacity={opacity}
                      >
                        <title>
                          {`${row.country} (${row.iso}): ${row.clicks.toLocaleString()} clicks, ${row.conversions.toLocaleString()} conversions (${conversionRate.toFixed(1)}%)`}
                        </title>
                      </circle>
                    </g>
                  );
                })}
              </g>
            </svg>
            <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-lg bg-white/90 dark:bg-zinc-900/90 px-3 py-2 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 shadow-sm">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-red-500/40" /> Low
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500">
                  Clicks
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
                  {totalClicks.toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60 p-3">
                <p className="text-[10px] uppercase tracking-wide font-semibold text-zinc-500">
                  Conversions
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">
                  {totalConversions.toLocaleString()}
                </p>
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                Top 5 countries
              </h3>
              <ul className="space-y-2">
                {topCountries.map((row, index) => {
                  const rate = row.clicks > 0 ? (row.conversions / row.clicks) * 100 : 0;
                  return (
                    <li
                      key={row.iso}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-200">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500">
                          {index + 1}
                        </span>
                        {row.country}
                      </span>
                      <span className="text-right">
                        <span className="block text-xs font-semibold text-zinc-900 dark:text-white">
                          {row.clicks.toLocaleString()} clicks
                        </span>
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                          {rate.toFixed(1)}% conversion
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GeoHeatmap;