"use client";

import type { EventScale } from "@/lib/types";

export interface FilterState {
  scales: EventScale[];
  countries: string[];
  tokens: string[];
  query: string;
  online: boolean;
  showFavoritesOnly: boolean;
  showManualOnly: boolean;
}

interface Props {
  state: FilterState;
  onChange: (next: FilterState) => void;
  availableCountries: string[];
  availableTokens: string[];
  totalCount: number;
}

const SCALES: { value: EventScale; label: string; hint: string }[] = [
  { value: "major", label: "Major", hint: "Мировые: Token2049, ETHDenver, Consensus" },
  { value: "local", label: "Local", hint: "Митапы, региональные ивенты" },
  { value: "niche", label: "Niche", hint: "Конкретный токен или тема" },
];

export function Filters({ state, onChange, availableCountries, availableTokens, totalCount }: Props) {
  const toggleScale = (s: EventScale) => {
    const has = state.scales.includes(s);
    onChange({ ...state, scales: has ? state.scales.filter((x) => x !== s) : [...state.scales, s] });
  };

  const toggleCountry = (c: string) => {
    const has = state.countries.includes(c);
    onChange({ ...state, countries: has ? state.countries.filter((x) => x !== c) : [...state.countries, c] });
  };

  const toggleToken = (t: string) => {
    const has = state.tokens.includes(t);
    onChange({ ...state, tokens: has ? state.tokens.filter((x) => x !== t) : [...state.tokens, t] });
  };

  const reset = () =>
    onChange({
      scales: [],
      countries: [],
      tokens: [],
      query: "",
      online: false,
      showFavoritesOnly: false,
      showManualOnly: false,
    });

  return (
    <aside className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-lg p-4 space-y-5 text-sm">
      <div>
        <label className="block text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-1">Поиск</label>
        <input
          type="text"
          value={state.query}
          onChange={(e) => onChange({ ...state, query: e.target.value })}
          placeholder="Название, тема, токен..."
          className="w-full bg-panel2 dark:bg-panel2-dark border border-border dark:border-border-dark rounded-md px-3 py-2 outline-none focus:border-accent"
        />
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Масштаб</div>
        <div className="flex flex-col gap-1.5">
          {SCALES.map((s) => (
            <label key={s.value} className="flex items-start gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={state.scales.includes(s.value)}
                onChange={() => toggleScale(s.value)}
                className="mt-1 accent-accent"
              />
              <div className="flex-1">
                <div className="group-hover:text-fg dark:group-hover:text-fg-dark">{s.label}</div>
                <div className="text-xs text-muted dark:text-muted-dark">{s.hint}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Онлайн</div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.online}
            onChange={(e) => onChange({ ...state, online: e.target.checked })}
            className="accent-accent"
          />
          Включить онлайн-ивенты
        </label>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-2">
          Страны {state.countries.length > 0 && `(${state.countries.length})`}
        </div>
        <div className="max-h-48 overflow-y-auto pr-1 space-y-1">
          {availableCountries.length === 0 ? (
            <div className="text-xs text-muted dark:text-muted-dark">
              Стран пока нет — обновите источники.
            </div>
          ) : (
            availableCountries.map((c) => (
              <label key={c} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={state.countries.includes(c)}
                  onChange={() => toggleCountry(c)}
                  className="accent-accent"
                />
                {c}
              </label>
            ))
          )}
        </div>
      </div>

      {availableTokens.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted dark:text-muted-dark mb-2">Токены</div>
          <div className="flex flex-wrap gap-1.5">
            {availableTokens.map((t) => {
              const active = state.tokens.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleToken(t)}
                  className={`text-xs px-2 py-0.5 rounded border ${
                    active
                      ? "bg-accent/20 text-accent border-accent/40"
                      : "bg-panel2 dark:bg-panel2-dark text-muted dark:text-muted-dark border-border dark:border-border-dark hover:text-fg dark:hover:text-fg-dark"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.showFavoritesOnly}
            onChange={(e) => onChange({ ...state, showFavoritesOnly: e.target.checked })}
            className="accent-accent"
          />
          Только мои отметки
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={state.showManualOnly}
            onChange={(e) => onChange({ ...state, showManualOnly: e.target.checked })}
            className="accent-accent"
          />
          <span>
            Только{" "}
            <span className="text-violet-400 font-medium">добавленные мной</span>
          </span>
        </label>
      </div>

      <div className="pt-2 border-t border-border dark:border-border-dark flex items-center justify-between">
        <span className="text-xs text-muted dark:text-muted-dark">{totalCount} ивентов</span>
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted dark:text-muted-dark hover:text-fg dark:hover:text-fg-dark underline-offset-2 hover:underline"
        >
          Сбросить фильтры
        </button>
      </div>
    </aside>
  );
}
