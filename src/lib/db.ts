import { createClient, type Client } from "@libsql/client";
import type { CryptoEvent, EventFilters } from "./types";

let _client: Client | null = null;
let _schemaInit: Promise<void> | null = null;

function getClient(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is not set");
    _client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return _client;
}

async function ensureSchema(): Promise<Client> {
  const client = getClient();
  if (!_schemaInit) {
    _schemaInit = (async () => {
      await client.execute(`
        CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          source TEXT NOT NULL,
          source_url TEXT,
          title TEXT NOT NULL,
          summary TEXT NOT NULL,
          description TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT,
          country TEXT,
          city TEXT,
          venue TEXT,
          is_online INTEGER NOT NULL DEFAULT 0,
          language TEXT NOT NULL DEFAULT 'en',
          scale TEXT NOT NULL,
          tags TEXT NOT NULL DEFAULT '[]',
          tokens TEXT NOT NULL DEFAULT '[]',
          pricing TEXT,
          speakers TEXT NOT NULL DEFAULT '[]',
          audience TEXT,
          image_url TEXT,
          fetched_at TEXT NOT NULL
        )
      `);
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_events_scale ON events(scale)",
      );
      await client.execute(
        "CREATE INDEX IF NOT EXISTS idx_events_country ON events(country)",
      );
      await client.execute(`
        CREATE TABLE IF NOT EXISTS refresh_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source TEXT NOT NULL,
          run_at TEXT NOT NULL,
          events_added INTEGER NOT NULL DEFAULT 0,
          events_updated INTEGER NOT NULL DEFAULT 0,
          ok INTEGER NOT NULL DEFAULT 1,
          error TEXT
        )
      `);
    })();
  }
  await _schemaInit;
  return client;
}

function rowToEvent(row: Record<string, unknown>): CryptoEvent {
  return {
    id: row.id as string,
    source: row.source as CryptoEvent["source"],
    source_url: (row.source_url as string) ?? undefined,
    title: row.title as string,
    summary: row.summary as string,
    description: (row.description as string) ?? undefined,
    start_date: row.start_date as string,
    end_date: (row.end_date as string) ?? undefined,
    country: (row.country as string) ?? undefined,
    city: (row.city as string) ?? undefined,
    venue: (row.venue as string) ?? undefined,
    is_online: Boolean(row.is_online),
    language: row.language as string,
    scale: row.scale as CryptoEvent["scale"],
    tags: JSON.parse((row.tags as string) || "[]"),
    tokens: JSON.parse((row.tokens as string) || "[]"),
    pricing: (row.pricing as string) ?? undefined,
    speakers: JSON.parse((row.speakers as string) || "[]"),
    audience: (row.audience as string) ?? undefined,
    image_url: (row.image_url as string) ?? undefined,
    fetched_at: row.fetched_at as string,
  };
}

export async function upsertEvent(ev: CryptoEvent): Promise<"inserted" | "updated"> {
  const client = await ensureSchema();
  const exists = (
    await client.execute({ sql: "SELECT id FROM events WHERE id = ?", args: [ev.id] })
  ).rows.length > 0;

  await client.execute({
    sql: `
      INSERT INTO events (id, source, source_url, title, summary, description, start_date, end_date,
        country, city, venue, is_online, language, scale, tags, tokens, pricing, speakers, audience, image_url, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        source_url = excluded.source_url,
        title = excluded.title,
        summary = excluded.summary,
        description = excluded.description,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        country = excluded.country,
        city = excluded.city,
        venue = excluded.venue,
        is_online = excluded.is_online,
        language = excluded.language,
        scale = excluded.scale,
        tags = excluded.tags,
        tokens = excluded.tokens,
        pricing = excluded.pricing,
        speakers = excluded.speakers,
        audience = excluded.audience,
        image_url = excluded.image_url,
        fetched_at = excluded.fetched_at
    `,
    args: [
      ev.id,
      ev.source,
      ev.source_url ?? null,
      ev.title,
      ev.summary,
      ev.description ?? null,
      ev.start_date,
      ev.end_date ?? null,
      ev.country ?? null,
      ev.city ?? null,
      ev.venue ?? null,
      ev.is_online ? 1 : 0,
      ev.language,
      ev.scale,
      JSON.stringify(ev.tags ?? []),
      JSON.stringify(ev.tokens ?? []),
      ev.pricing ?? null,
      JSON.stringify(ev.speakers ?? []),
      ev.audience ?? null,
      ev.image_url ?? null,
      ev.fetched_at,
    ],
  });

  return exists ? "updated" : "inserted";
}

export async function deleteEvent(id: string): Promise<boolean> {
  const client = await ensureSchema();
  const result = await client.execute({
    sql: "DELETE FROM events WHERE id = ? AND source = 'manual'",
    args: [id],
  });
  return result.rowsAffected > 0;
}

export async function queryEvents(filters: EventFilters): Promise<CryptoEvent[]> {
  const client = await ensureSchema();
  const where: string[] = ["language = 'en'"];
  const args: (string | number | null)[] = [];

  if (filters.scale && filters.scale.length > 0) {
    where.push(`scale IN (${filters.scale.map(() => "?").join(", ")})`);
    args.push(...filters.scale);
  }
  if (filters.countries && filters.countries.length > 0) {
    const placeholders = filters.countries.map(() => "?").join(", ");
    where.push(`(country IN (${placeholders})${filters.online ? " OR is_online = 1" : ""})`);
    args.push(...filters.countries);
  }
  const fromDate = filters.from ?? new Date(Date.now() - 86400000).toISOString();
  where.push("start_date >= ?");
  args.push(fromDate);
  if (filters.to) {
    where.push("start_date <= ?");
    args.push(filters.to);
  }
  if (filters.query) {
    where.push(
      "(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(tokens) LIKE ?)",
    );
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q, q, q);
  }
  if (filters.tokens && filters.tokens.length > 0) {
    const tokenConds = filters.tokens.map(() => "LOWER(tokens) LIKE ?").join(" OR ");
    where.push(`(${tokenConds})`);
    for (const t of filters.tokens) args.push(`%"${t.toLowerCase()}"%`);
  }

  const sql = `SELECT * FROM events WHERE ${where.join(" AND ")} ORDER BY start_date ASC LIMIT 500`;
  const result = await client.execute({ sql, args });
  return result.rows.map((row) => rowToEvent(row as Record<string, unknown>));
}

export async function getAllCountries(): Promise<string[]> {
  const client = await ensureSchema();
  const result = await client.execute(
    "SELECT DISTINCT country FROM events WHERE country IS NOT NULL AND country != '' ORDER BY country",
  );
  return result.rows.map((r) => r.country as string);
}

export async function getAllTokens(): Promise<string[]> {
  const client = await ensureSchema();
  const result = await client.execute("SELECT tokens FROM events");
  const seen = new Set<string>();
  for (const r of result.rows) {
    try {
      const arr = JSON.parse(r.tokens as string) as string[];
      for (const t of arr) seen.add(t);
    } catch {
      /* ignore */
    }
  }
  return [...seen].sort();
}

export async function logRefresh(
  source: string,
  added: number,
  updated: number,
  ok: boolean,
  error?: string,
): Promise<void> {
  const client = await ensureSchema();
  await client.execute({
    sql: "INSERT INTO refresh_log (source, run_at, events_added, events_updated, ok, error) VALUES (?, ?, ?, ?, ?, ?)",
    args: [source, new Date().toISOString(), added, updated, ok ? 1 : 0, error ?? null],
  });
}

export async function getLastRefresh(): Promise<{ source: string; run_at: string; ok: boolean }[]> {
  const client = await ensureSchema();
  const result = await client.execute(
    "SELECT source, MAX(run_at) AS run_at, ok FROM refresh_log GROUP BY source ORDER BY run_at DESC",
  );
  return result.rows.map((r) => ({
    source: r.source as string,
    run_at: r.run_at as string,
    ok: Boolean(r.ok),
  }));
}
