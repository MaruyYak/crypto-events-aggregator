"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Rsvp = "going" | "not_going" | "maybe";

interface FavoritesState {
  rsvps: Record<string, Rsvp>;
  comments: Record<string, string>;
  setRsvp: (id: string, status: Rsvp | null) => void;
  setComment: (id: string, text: string) => void;
  isFavorite: (id: string) => boolean;
  getRsvp: (id: string) => Rsvp | undefined;
  getComment: (id: string) => string;
  counts: { going: number; maybe: number; not_going: number };
}

const FavoritesContext = createContext<FavoritesState | null>(null);
const STORAGE_KEY = "crypto-events:rsvps";
const COMMENTS_KEY = "crypto-events:comments";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [rsvps, setRsvps] = useState<Record<string, Rsvp>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawR = localStorage.getItem(STORAGE_KEY);
      if (rawR) setRsvps(JSON.parse(rawR));
      const rawC = localStorage.getItem(COMMENTS_KEY);
      if (rawC) setComments(JSON.parse(rawC));
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rsvps));
  }, [rsvps, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
  }, [comments, hydrated]);

  const setRsvp = useCallback((id: string, status: Rsvp | null) => {
    setRsvps((prev) => {
      const next = { ...prev };
      if (status === null) delete next[id];
      else next[id] = status;
      return next;
    });
  }, []);

  const setComment = useCallback((id: string, text: string) => {
    setComments((prev) => {
      const next = { ...prev };
      if (!text.trim()) delete next[id];
      else next[id] = text;
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (id: string) => id in rsvps || (comments[id]?.length ?? 0) > 0,
    [rsvps, comments],
  );
  const getRsvp = useCallback((id: string) => rsvps[id], [rsvps]);
  const getComment = useCallback((id: string) => comments[id] ?? "", [comments]);

  const counts = {
    going: Object.values(rsvps).filter((v) => v === "going").length,
    maybe: Object.values(rsvps).filter((v) => v === "maybe").length,
    not_going: Object.values(rsvps).filter((v) => v === "not_going").length,
  };

  return (
    <FavoritesContext.Provider
      value={{ rsvps, comments, setRsvp, setComment, isFavorite, getRsvp, getComment, counts }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
