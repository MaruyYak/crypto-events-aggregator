import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import type { CryptoEvent, EventFilters } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "events.db");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let _db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (_db) return _db;
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(`
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
    );
    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_date);
    CREATE INDEX IF NOT EXISTS idx_events_scale ON events(scale);
    CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);

    CREATE TABLE IF NOT EXISTS refresh_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      run_at TEXT NOT NULL,
      events_added INTEGER NOT NULL DEFAULT 0,
      events_updated INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 1,
      error TEXT
    );
  `);
  _db = db;
  return db;
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

export function upsertEvent(ev: CryptoEvent): "inserted" | "updated" {
  const db = getDb();
  const exists = db.prepare("SELECT id FROM events WHERE id = ?").get(ev.id);
  const stmt = db.prepare(`
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
  `);
  stmt.run(
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
  );
  return exists ? "updated" : "inserted";
}

export function queryEvents(filters: EventFilters): CryptoEvent[] {
  const db = getDb();
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
    where.push("(LOWER(title) LIKE ? OR LOWER(summary) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(tokens) LIKE ?)");
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q, q, q);
  }
  if (filters.tokens && filters.tokens.length > 0) {
    const tokenConds = filters.tokens.map(() => "LOWER(tokens) LIKE ?").join(" OR ");
    where.push(`(${tokenConds})`);
    for (const t of filters.tokens) args.push(`%"${t.toLowerCase()}"%`);
  }

  const sql = `SELECT * FROM events WHERE ${where.join(" AND ")} ORDER BY start_date ASC LIMIT 500`;
  const rows = db.prepare(sql).all(...args) as Record<string, unknown>[];
  return rows.map(rowToEvent);
}

export function getAllCountries(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT DISTINCT country FROM events WHERE country IS NOT NULL AND country != '' ORDER BY country").all() as { country: string }[];
  return rows.map((r) => r.country);
}

export function getAllTokens(): string[] {
  const db = getDb();
  const rows = db.prepare("SELECT tokens FROM events").all() as { tokens: string }[];
  const seen = new Set<string>();
  for (const r of rows) {
    try {
      const arr = JSON.parse(r.tokens) as string[];
      for (const t of arr) seen.add(t);
    } catch {
      /* ignore */
    }
  }
  return [...seen].sort();
}

export function logRefresh(
  source: string,
  added: number,
  updated: number,
  ok: boolean,
  error?: string,
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO refresh_log (source, run_at, events_added, events_updated, ok, error) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(source, new Date().toISOString(), added, updated, ok ? 1 : 0, error ?? null);
}

export function deleteEvent(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM events WHERE id = ? AND source = 'manual'").run(id);
  return (result as { changes: number }).changes > 0;
}

export function getLastRefresh(): { source: string; run_at: string; ok: boolean }[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT source, MAX(run_at) AS run_at, ok FROM refresh_log GROUP BY source ORDER BY run_at DESC`,
    )
    .all() as { source: string; run_at: string; ok: number }[];
  return rows.map((r) => ({ source: r.source, run_at: r.run_at, ok: Boolean(r.ok) }));
}
