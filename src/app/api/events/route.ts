import { NextResponse } from "next/server";
import { queryEvents, getAllCountries, getAllTokens, upsertEvent } from "@/lib/db";
import type { CryptoEvent, EventFilters, EventScale, Speaker } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sp = url.searchParams;

  const scale = sp.getAll("scale").filter((s): s is EventScale =>
    s === "major" || s === "local" || s === "niche",
  );

  const filters: EventFilters = {
    scale: scale.length > 0 ? scale : undefined,
    countries: sp.getAll("country").length > 0 ? sp.getAll("country") : undefined,
    tokens: sp.getAll("token").length > 0 ? sp.getAll("token") : undefined,
    query: sp.get("q") ?? undefined,
    from: sp.get("from") ?? "2026-06-01",
    to: sp.get("to") ?? undefined,
    online: sp.get("online") === "true",
  };

  const [events, countries, tokens] = await Promise.all([
    queryEvents(filters),
    getAllCountries(),
    getAllTokens(),
  ]);

  return NextResponse.json({ events, countries, tokens, count: events.length });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (!body.title || !body.start_date || !body.summary) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    const id = `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const event: CryptoEvent = {
      id,
      source: "manual",
      source_url: (body.source_url as string) || undefined,
      title: body.title as string,
      summary: body.summary as string,
      description: (body.description as string) || undefined,
      start_date: body.start_date as string,
      end_date: (body.end_date as string) || undefined,
      country: (body.country as string) || undefined,
      city: (body.city as string) || undefined,
      venue: (body.venue as string) || undefined,
      is_online: Boolean(body.is_online),
      language: "en",
      scale: (body.scale as EventScale) ?? "local",
      tags: [],
      tokens: (body.tokens as string[]) ?? [],
      pricing: (body.pricing as string) || undefined,
      speakers: (body.speakers as Speaker[]) ?? [],
      audience: (body.audience as string) || undefined,
      fetched_at: new Date().toISOString(),
    };

    await upsertEvent(event);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
