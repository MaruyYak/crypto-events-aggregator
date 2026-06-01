"use client";

import { useState } from "react";
import { useFavorites, type Rsvp } from "./FavoritesProvider";
import type { CryptoEvent } from "@/lib/types";

const scaleLabel: Record<CryptoEvent["scale"], string> = {
  major: "Major",
  local: "Local",
  niche: "Niche",
};

const scaleColor: Record<CryptoEvent["scale"], string> = {
  major: "bg-accent/20 text-accent border-accent/30",
  local: "bg-accent2/20 text-accent2 border-accent2/30",
  niche: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatRange(start: string, end?: string): string {
  if (!end || end === start) return formatDate(start);
  const a = formatDate(start);
  const b = formatDate(end);
  return a === b ? a : `${a} — ${b}`;
}

export function EventCard({ event, onDelete }: { event: CryptoEvent; onDelete?: () => void }) {
  const { setRsvp, getRsvp } = useFavorites();
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const current = getRsvp(event.id);

  const handleDelete = async () => {
    if (!confirm("Удалить этот ивент?")) return;
    setDeleting(true);
    await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    onDelete?.();
  };

  const rsvpButton = (status: Rsvp, label: string, color: string) => {
    const active = current === status;
    return (
      <button
        type="button"
        onClick={() => setRsvp(event.id, active ? null : status)}
        className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
          active ? color : "border-border text-muted hover:text-white hover:border-muted"
        }`}
      >
        {label}
      </button>
    );
  };

  const where =
    event.is_online && !event.city
      ? "Online"
      : [event.city, event.country].filter(Boolean).join(", ") || (event.is_online ? "Online" : "TBA");

  return (
    <article className="bg-panel dark:bg-panel-dark border border-border dark:border-border-dark rounded-lg p-5 flex flex-col gap-3 text-fg dark:text-fg-dark">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${scaleColor[event.scale]}`}>
              {scaleLabel[event.scale]}
            </span>
            {event.source === "manual" ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded border bg-violet-500/20 text-violet-300 border-violet-500/30">
                добавлено мной
              </span>
            ) : (
              <span className="text-xs text-muted dark:text-muted-dark uppercase tracking-wide">{event.source}</span>
            )}
            {event.tokens.slice(0, 4).map((t) => (
              <span key={t} className="text-xs bg-panel2 dark:bg-panel2-dark border border-border dark:border-border-dark rounded px-1.5 py-0.5 text-muted dark:text-muted-dark">
                {t}
              </span>
            ))}
          </div>
          <h3 className="text-lg font-semibold leading-tight">
            {event.source_url ? (
              <a href={event.source_url} target="_blank" rel="noreferrer" className="hover:text-accent">
                {event.title}
              </a>
            ) : (
              event.title
            )}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide">When</div>
          <div>{formatRange(event.start_date, event.end_date)}</div>
        </div>
        <div>
          <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide">Where</div>
          <div>{where}{event.venue ? ` · ${event.venue}` : ""}</div>
        </div>
      </div>

      <p className="text-sm text-muted dark:text-muted-dark leading-relaxed">{event.summary}</p>

      {expanded && (
        <div className="bg-panel2 dark:bg-panel2-dark border border-border dark:border-border-dark rounded-md p-3 space-y-3 text-sm text-fg dark:text-fg-dark">
          {event.description && event.description !== event.summary && (
            <div>
              <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide mb-1">About</div>
              <p className="whitespace-pre-line">{event.description}</p>
            </div>
          )}
          {event.pricing && (
            <div>
              <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide mb-1">Pricing</div>
              <p>{event.pricing}</p>
            </div>
          )}
          {event.audience && (
            <div>
              <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide mb-1">Audience</div>
              <p>{event.audience}</p>
            </div>
          )}
          {event.speakers.length > 0 && (
            <div>
              <div className="text-muted dark:text-muted-dark text-xs uppercase tracking-wide mb-1">Speakers</div>
              <ul className="space-y-1">
                {event.speakers.map((s, i) => (
                  <li key={`${s.name}-${i}`}>
                    <span className="font-medium">{s.name}</span>
                    {s.role ? <span className="text-muted dark:text-muted-dark"> — {s.role}</span> : null}
                    {s.bio ? <div className="text-xs text-muted dark:text-muted-dark">{s.bio}</div> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-muted dark:text-muted-dark hover:text-fg dark:hover:text-fg-dark underline-offset-2 hover:underline"
          >
            {expanded ? "Hide details" : "More details"}
          </button>
          {event.source === "manual" && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs text-rose-400 hover:text-rose-300 underline-offset-2 hover:underline disabled:opacity-50"
            >
              {deleting ? "..." : "Удалить"}
            </button>
          )}
        </div>
        <div className="flex gap-1.5">
          {rsvpButton("going", "Going", "bg-emerald-500/20 text-emerald-300 border-emerald-500/40")}
          {rsvpButton("maybe", "Thinking", "bg-accent/20 text-accent border-accent/40")}
          {rsvpButton("not_going", "Skip", "bg-rose-500/20 text-rose-300 border-rose-500/40")}
        </div>
      </div>
    </article>
  );
}
