import type { CryptoEvent } from "../types";
import { classifyScale, extractTokens } from "../classify";

const COINDAR_URL = "https://coindar.org/api/v2/events";

interface CoindarRaw {
  id: number;
  caption: string;
  coin_symbol?: string;
  coin_name?: string;
  date_start: string;
  date_end?: string;
  source?: string;
  proof?: string;
  tags?: string;
}

export async function fetchCoindar(): Promise<CryptoEvent[]> {
  const token = process.env.COINDAR_TOKEN;
  if (!token) {
    console.warn("[coindar] COINDAR_TOKEN not set — skipping");
    return [];
  }

  const url = `${COINDAR_URL}?access_token=${encodeURIComponent(token)}&filter_date_start=${new Date().toISOString().slice(0, 10)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Coindar API ${res.status}: ${await res.text()}`);
  const raw = (await res.json()) as CoindarRaw[];

  return raw.map((r) => {
    const tokens = r.coin_symbol ? [r.coin_symbol.toUpperCase()] : extractTokens(r.caption);
    const title = r.caption ?? "Untitled";
    return {
      id: `coindar:${r.id}`,
      source: "coindar",
      source_url: r.source || r.proof,
      title,
      summary: title,
      description: undefined,
      start_date: r.date_start,
      end_date: r.date_end,
      country: undefined,
      city: undefined,
      venue: undefined,
      is_online: true,
      language: "en",
      scale: classifyScale({ title, tokens }),
      tags: r.tags ? r.tags.split(",").map((t) => t.trim()) : [],
      tokens,
      pricing: undefined,
      speakers: [],
      audience: undefined,
      image_url: undefined,
      fetched_at: new Date().toISOString(),
    } satisfies CryptoEvent;
  });
}
