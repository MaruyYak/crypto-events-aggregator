import type { CryptoEvent } from "../types";
import { classifyScale, extractTokens, inferAudience } from "../classify";

const CMC_EVENTS_URL = "https://pro-api.coinmarketcap.com/v1/events";

interface CmcEventRaw {
  id?: number | string;
  name?: string;
  title?: string;
  description?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  country?: string;
  city?: string;
  venue?: string;
  website?: string;
  url?: string;
  is_online?: boolean;
  coins?: { symbol?: string }[];
  speakers?: { name?: string; title?: string; bio?: string }[];
  price?: string;
  cover_image?: string;
}

export async function fetchCoinMarketCap(): Promise<CryptoEvent[]> {
  const key = process.env.CMC_API_KEY;
  if (!key) {
    console.warn("[cmc] CMC_API_KEY not set — skipping");
    return [];
  }

  const res = await fetch(CMC_EVENTS_URL, {
    headers: { "X-CMC_PRO_API_KEY": key, Accept: "application/json" },
  });

  if (res.status === 401 || res.status === 403) {
    console.warn("[cmc] events endpoint not available on this plan — skipping");
    return [];
  }
  if (res.status === 404) {
    console.warn("[cmc] /v1/events not found — endpoint may be deprecated; skipping");
    return [];
  }
  if (!res.ok) {
    throw new Error(`CMC API ${res.status}: ${await res.text()}`);
  }

  const payload = (await res.json()) as { data?: CmcEventRaw[] };
  const items = payload.data ?? [];

  return items.map((r) => {
    const title = r.name || r.title || "Untitled";
    const description = r.description ?? "";
    const tokens = (r.coins?.map((c) => c.symbol?.toUpperCase()).filter(Boolean) as string[]) ||
      extractTokens(`${title} ${description}`);
    return {
      id: `cmc:${r.id ?? title}`,
      source: "coinmarketcap",
      source_url: r.website || r.url,
      title,
      summary: description.slice(0, 280) || title,
      description,
      start_date: r.start_date || r.startDate || new Date().toISOString(),
      end_date: r.end_date || r.endDate,
      country: r.country,
      city: r.city,
      venue: r.venue,
      is_online: Boolean(r.is_online),
      language: "en",
      scale: classifyScale({ title, description, tokens, country: r.country }),
      tags: [],
      tokens,
      pricing: r.price,
      speakers: (r.speakers ?? []).map((s) => ({
        name: s.name ?? "",
        role: s.title,
        bio: s.bio,
      })),
      audience: inferAudience(title, description),
      image_url: r.cover_image,
      fetched_at: new Date().toISOString(),
    } satisfies CryptoEvent;
  });
}
