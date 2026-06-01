"use client";

import { useEffect, useMemo, useState } from "react";
import type { CryptoEvent } from "@/lib/types";
import { Filters, type FilterState } from "./Filters";
import { EventCard } from "./EventCard";
import { AddEventModal } from "./AddEventModal";
import { useFavorites } from "./FavoritesProvider";
import { useTheme } from "./ThemeProvider";

interface ApiResponse {
  events: CryptoEvent[];
  countries: string[];
  tokens: string[];
  count: number;
}

const FILTERS_KEY = "crypto-events:filters";

const DEFAULT_FILTERS: FilterState = {
  scales: [],
  countries: [],
  tokens: [],
  query: "",
  online: false,
  showFavoritesOnly: false,
  showManualOnly: false,
};

function loadFilters(): FilterState {
  try {
    const raw = localStorage.getItem(FILTERS_KEY);
    if (!raw) return DEFAULT_FILTERS;
    return { ...DEFAULT_FILTERS, ...(JSON.parse(raw) as Partial<FilterState>) };
  } catch {
    return DEFAULT_FILTERS;
  }
}

export function EventList() {
  const [data, setData] = useState<ApiResponse>({ events: [], countries: [], tokens: [], count: 0 });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshLog, setRefreshLog] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const { rsvps, comments, counts } = useFavorites();
  const { theme, toggle } = useTheme();

  useEffect(() => {
    setFilters(loadFilters());
    setFiltersLoaded(true);
  }, []);

  const handleFiltersChange = (next: FilterState) => {
    setFilters(next);
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      for (const s of filters.scales) params.append("scale", s);
      for (const c of filters.countries) params.append("country", c);
      for (const t of filters.tokens) params.append("token", t);
      if (filters.query) params.set("q", filters.query);
      if (filters.online) params.set("online", "true");

      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!filtersLoaded) return;
    void fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, filtersLoaded]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    setRefreshLog(null);
    try {
      const res = await fetch("/api/refresh", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        const summary = (
          json.results as { source: string; ok: boolean; added: number; updated: number; error?: string }[]
        )
          .map((r) => (r.ok ? `${r.source}: +${r.added}/${r.updated}` : `${r.source}: ошибка`))
          .join(" · ");
        setRefreshLog(summary);
        await fetchEvents();
      } else {
        setRefreshLog(`Не удалось: ${json.error}`);
      }
    } catch (e) {
      setRefreshLog(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  };

  const displayed = useMemo(() => {
    let result = data.events;
    if (filters.showFavoritesOnly) {
      result = result.filter((e) => e.id in rsvps || (comments[e.id]?.length ?? 0) > 0);
    }
    if (filters.showManualOnly) {
      result = result.filter((e) => e.source === "manual");
    }
    return result;
  }, [data.events, filters.showFavoritesOnly, filters.showManualOnly, rsvps, comments]);

  const grouped = useMemo(() => {
    const map = new Map<string, CryptoEvent[]>();
    for (const ev of displayed) {
      const month = new Date(ev.start_date).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(ev);
    }
    return [...map.entries()];
  }, [displayed]);

  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto">
      <header className="mb-6 flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Crypto Events Hub</h1>
          <p className="text-sm text-muted dark:text-muted-dark mt-1">
            Календарь крипто-ивентов из Coindar, CoinMarketCap, Eventbrite, Luma. Только англоязычные.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted dark:text-muted-dark">
            Иду <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{counts.going}</span> ·
            Подумать <span className="text-accent font-semibold">{counts.maybe}</span> · Не иду{" "}
            <span className="text-rose-700 dark:text-rose-300 font-semibold">{counts.not_going}</span>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-label="Переключить тему"
            title={theme === "dark" ? "Светлая тема" : "Тёмная тема"}
            className="border border-border dark:border-border-dark rounded-md px-3 py-2 text-sm hover:border-muted"
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="border border-accent text-accent font-semibold px-4 py-2 rounded-md text-sm hover:bg-accent/10"
          >
            + Добавить ивент
          </button>
          <button
            type="button"
            onClick={triggerRefresh}
            disabled={refreshing}
            className="bg-accent text-black font-semibold px-4 py-2 rounded-md text-sm hover:opacity-90 disabled:opacity-50"
          >
            {refreshing ? "Обновляется..." : "Обновить источники"}
          </button>
        </div>
      </header>

      {refreshLog && (
        <div className="mb-4 text-xs text-muted dark:text-muted-dark bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-md px-3 py-2">
          {refreshLog}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Filters
          state={filters}
          onChange={handleFiltersChange}
          availableCountries={data.countries}
          availableTokens={data.tokens}
          totalCount={displayed.length}
        />

        <main>
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 px-3 py-2 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-muted dark:text-muted-dark">Загрузка...</div>
          ) : displayed.length === 0 ? (
            <div className="text-muted dark:text-muted-dark bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-lg p-8 text-center">
              Под эти фильтры ничего нет. Сбросьте фильтры или нажмите <em>Обновить источники</em>.
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([month, events]) => (
                <section key={month}>
                  <h2 className="text-xs uppercase tracking-widest text-muted dark:text-muted-dark mb-3">
                    {month}
                  </h2>
                  <div className="space-y-3">
                    {events.map((ev) => (
                      <EventCard key={ev.id} event={ev} onDelete={() => void fetchEvents()} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </main>
      </div>

      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSaved={() => void fetchEvents()}
        />
      )}
    </div>
  );
}
