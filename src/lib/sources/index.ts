import { upsertEvent, logRefresh } from "../db";
import { fetchCoindar } from "./coindar";
import { fetchCoinMarketCap } from "./coinmarketcap";
import { fetchEventbrite } from "./eventbrite";
import { fetchLuma } from "./luma";
import { getSeedEvents } from "./seed";

export interface RefreshResult {
  source: string;
  ok: boolean;
  added: number;
  updated: number;
  error?: string;
}

const SOURCES: { name: string; fetch: () => Promise<Awaited<ReturnType<typeof fetchCoindar>>> }[] = [
  { name: "coindar", fetch: fetchCoindar },
  { name: "coinmarketcap", fetch: fetchCoinMarketCap },
  { name: "eventbrite", fetch: fetchEventbrite },
  { name: "luma", fetch: fetchLuma },
];

export async function refreshAll(): Promise<RefreshResult[]> {
  const results: RefreshResult[] = [];

  for (const src of SOURCES) {
    let added = 0;
    let updated = 0;
    try {
      const events = await src.fetch();
      for (const ev of events) {
        const res = await upsertEvent(ev);
        if (res === "inserted") added++;
        else updated++;
      }
      await logRefresh(src.name, added, updated, true);
      results.push({ source: src.name, ok: true, added, updated });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await logRefresh(src.name, added, updated, false, msg);
      results.push({ source: src.name, ok: false, added, updated, error: msg });
    }
  }

  let seeded = 0;
  for (const ev of getSeedEvents()) {
    const res = await upsertEvent(ev);
    if (res === "inserted") seeded++;
  }
  if (seeded > 0) {
    await logRefresh("seed", seeded, 0, true);
    results.push({ source: "seed", ok: true, added: seeded, updated: 0 });
  }

  return results;
}
