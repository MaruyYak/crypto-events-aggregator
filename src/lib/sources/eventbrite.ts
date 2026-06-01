import type { CryptoEvent } from "../types";
import { classifyScale, extractTokens, inferAudience } from "../classify";

const SEARCH_URL = "https://www.eventbriteapi.com/v3/events/search/";

interface EventbriteRaw {
  id: string;
  name: { text: string };
  description: { text: string };
  start: { utc: string };
  end?: { utc: string };
  url: string;
  online_event?: boolean;
  venue?: { address?: { country?: string; city?: string }; name?: string };
  logo?: { url?: string };
  is_free?: boolean;
}

export async function fetchEventbrite(): Promise<CryptoEvent[]> {
  const token = process.env.EVENTBRITE_TOKEN;
  if (!token) {
    console.warn("[eventbrite] EVENTBRITE_TOKEN not set — skipping");
    return [];
  }

  const queries = ["crypto", "blockchain", "web3", "bitcoin", "ethereum"];
  const results: CryptoEvent[] = [];

  for (const q of queries) {
    const url = `${SEARCH_URL}?q=${encodeURIComponent(q)}&expand=venue&start_date.range_start=${new Date().toISOString()}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.status === 404 || res.status === 410) {
      console.warn("[eventbrite] public search API is deprecated for personal apps — skipping");
      return [];
    }
    if (!res.ok) {
      console.warn(`[eventbrite] ${q} -> ${res.status}; skipping query`);
      continue;
    }

    const payload = (await res.json()) as { events?: EventbriteRaw[] };
    const events = payload.events ?? [];

    for (const r of events) {
      const title = r.name.text;
      const description = r.description?.text ?? "";
      const country = r.venue?.address?.country;
      const tokens = extractTokens(`${title} ${description}`);
      results.push({
        id: `eventbrite:${r.id}`,
        source: "eventbrite",
        source_url: r.url,
        title,
        summary: description.slice(0, 280) || title,
        description,
        start_date: r.start.utc,
        end_date: r.end?.utc,
        country,
        city: r.venue?.address?.city,
        venue: r.venue?.name,
        is_online: Boolean(r.online_event),
        language: "en",
        scale: classifyScale({ title, description, tokens, country }),
        tags: [q],
        tokens,
        pricing: r.is_free ? "Free" : undefined,
        speakers: [],
        audience: inferAudience(title, description),
        image_url: r.logo?.url,
        fetched_at: new Date().toISOString(),
      });
    }
  }

  const seen = new Set<string>();
  return results.filter((e) => (seen.has(e.id) ? false : seen.add(e.id)));
}
