import type { CryptoEvent } from "../types";
import { classifyScale, extractTokens, inferAudience } from "../classify";

const LUMA_PUBLIC_DISCOVERY = "https://api.lu.ma/discover/get-paginated-events";

interface LumaRaw {
  api_id: string;
  name?: string;
  url?: string;
  cover_url?: string;
  start_at?: string;
  end_at?: string;
  description_md?: string;
  geo_address_json?: { city?: string; country?: string; full_address?: string };
  is_online?: boolean;
  meeting_url?: string;
}

interface LumaResponse {
  entries?: { event?: LumaRaw }[];
}

export async function fetchLuma(): Promise<CryptoEvent[]> {
  const categories = ["crypto", "blockchain", "web3"];
  const results: CryptoEvent[] = [];

  for (const cat of categories) {
    const url = `${LUMA_PUBLIC_DISCOVERY}?category=${cat}&pagination_limit=50`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) {
        console.warn(`[luma] ${cat} -> ${res.status}; skipping`);
        continue;
      }
      const payload = (await res.json()) as LumaResponse;
      const entries = payload.entries ?? [];

      for (const entry of entries) {
        const r = entry.event;
        if (!r || !r.api_id || !r.start_at) continue;

        const title = r.name ?? "Untitled";
        const description = r.description_md ?? "";
        const tokens = extractTokens(`${title} ${description}`);
        const country = r.geo_address_json?.country;

        results.push({
          id: `luma:${r.api_id}`,
          source: "luma",
          source_url: r.url ? `https://lu.ma/${r.url}` : undefined,
          title,
          summary: description.replace(/\n+/g, " ").slice(0, 280) || title,
          description,
          start_date: r.start_at,
          end_date: r.end_at,
          country,
          city: r.geo_address_json?.city,
          venue: r.geo_address_json?.full_address,
          is_online: Boolean(r.is_online || r.meeting_url),
          language: "en",
          scale: classifyScale({ title, description, tokens, country }),
          tags: [cat],
          tokens,
          pricing: undefined,
          speakers: [],
          audience: inferAudience(title, description),
          image_url: r.cover_url,
          fetched_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`[luma] error for ${cat}:`, err);
    }
  }

  const seen = new Set<string>();
  return results.filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
}
