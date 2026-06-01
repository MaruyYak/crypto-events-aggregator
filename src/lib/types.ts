export type EventScale = "major" | "local" | "niche";

export type SourceName = "coindar" | "coinmarketcap" | "eventbrite" | "luma" | "manual";

export interface Speaker {
  name: string;
  role?: string;
  bio?: string;
}

export interface CryptoEvent {
  id: string;
  source: SourceName;
  source_url?: string;
  title: string;
  summary: string;
  description?: string;
  start_date: string;
  end_date?: string;
  country?: string;
  city?: string;
  venue?: string;
  is_online: boolean;
  language: string;
  scale: EventScale;
  tags: string[];
  tokens: string[];
  pricing?: string;
  speakers: Speaker[];
  audience?: string;
  image_url?: string;
  fetched_at: string;
}

export interface EventFilters {
  scale?: EventScale[];
  countries?: string[];
  tokens?: string[];
  query?: string;
  from?: string;
  to?: string;
  online?: boolean;
}
