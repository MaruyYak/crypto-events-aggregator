# Crypto Events Hub

Aggregator for crypto industry events: pulls from multiple sources, classifies events by scale, filters by country / token / topic, lets you mark **Going / Thinking / Skip**.

## Tech

- **Next.js 14** (App Router) + TypeScript
- **SQLite** via `better-sqlite3` for persistence
- **Tailwind CSS** for styling
- **localStorage** for favorites and RSVP state (no accounts)

## Prerequisites

- **Node.js 20+** (download from [nodejs.org](https://nodejs.org/) — currently not installed on this machine)
- Optional API keys (the app degrades gracefully — sources without keys are skipped, seed data still shows up):
  - CoinMarketCap — already configured in `.env.local`
  - Coindar — free, register at [coindar.org](https://coindar.org/page/api)
  - Eventbrite — private OAuth token at [eventbrite.com/platform/api](https://www.eventbrite.com/platform/api)

## Quick start

```powershell
npm install
npm run dev
```

Open <http://localhost:3000>. On first load the database is empty — click **Refresh sources** in the top right. Seed events (Token2049, ETHDenver, Solana Breakpoint, etc.) populate immediately so the UI is never blank.

## How sources work

Each source lives in [src/lib/sources/](src/lib/sources/) and exports an `async` function returning `CryptoEvent[]`. They're orchestrated by [src/lib/sources/index.ts](src/lib/sources/index.ts:1). To add a new source:

1. Create `src/lib/sources/myname.ts` with a `fetchMyName(): Promise<CryptoEvent[]>` function.
2. Register it in the `SOURCES` array in [src/lib/sources/index.ts](src/lib/sources/index.ts:1).

Events are upserted into SQLite by `id` (format: `source:external_id`), so re-running refresh is idempotent.

## Event classification

[src/lib/classify.ts](src/lib/classify.ts:1) auto-assigns scale based on keywords:

- **Major** — Token2049, Consensus, ETHDenver, Devcon, KBW, etc.
- **Niche** — single-token mention OR workshop/hackathon/dev-day keywords
- **Local** — everything else

Tweak the keyword lists in `classify.ts` to retune.

## Scheduled refresh

The app has no built-in scheduler. Options:

- **Manual**: click the button in the UI.
- **Cron / Task Scheduler**: hit `POST http://localhost:3000/api/refresh`.
- **Vercel deploy**: add `vercel.json` with a cron entry — `{ "crons": [{ "path": "/api/refresh", "schedule": "0 * * * *" }] }`.
- **CLI**: `npm run refresh`.

## Important security note

Your CoinMarketCap key was shared in the chat and is now stored in `.env.local`. **Rotate it** in your CMC dashboard before deploying anywhere public — assume the original is compromised.

## File layout

```
src/
  app/
    layout.tsx              # root layout with FavoritesProvider
    page.tsx                # main page → EventList
    api/
      events/route.ts       # GET /api/events with filters
      refresh/route.ts      # POST /api/refresh — fetch all sources
  lib/
    db.ts                   # SQLite setup, upsert, query
    classify.ts             # scale + audience heuristics
    types.ts                # CryptoEvent type
    sources/
      index.ts              # refreshAll orchestrator
      coindar.ts
      coinmarketcap.ts
      eventbrite.ts
      luma.ts
      seed.ts               # 6 hand-curated seed events for empty state
  components/
    FavoritesProvider.tsx   # localStorage-backed RSVP state
    Filters.tsx             # sidebar filters
    EventCard.tsx           # single event card with RSVP buttons
    EventList.tsx           # main client component (fetch + render)
data/
  events.db                 # SQLite — created at first run, gitignored
```

## Known caveats

- **CoinMarketCap `/v1/events`** is not on all plans. If your key returns 401/403/404, the connector logs a warning and continues. The data the UI shows then comes from Coindar / Luma / Eventbrite / seed.
- **Eventbrite public search** has been deprecated for personal apps since 2020. If the search endpoint returns 404, the connector skips gracefully. To use Eventbrite reliably you need an organization account + private token.
- **Luma's discover endpoint** is undocumented; it may change without warning. If/when it breaks, the connector logs a warning and continues.
- **English-only filter** is hard-coded in [src/lib/db.ts](src/lib/db.ts:1) `queryEvents` (`WHERE language = 'en'`). Source connectors all tag `language: 'en'` because none of them surface multilingual metadata reliably.
