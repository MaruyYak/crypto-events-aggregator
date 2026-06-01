import type { EventScale } from "./types";

const MAJOR_KEYWORDS = [
  "consensus",
  "token2049",
  "ethdenver",
  "ethcc",
  "devcon",
  "bitcoin conference",
  "bitcoin 20",
  "the merge",
  "permissionless",
  "mainnet",
  "blockworks",
  "korea blockchain week",
  "kbw",
  "ethglobal",
  "paris blockchain week",
  "solana breakpoint",
  "near redacted",
  "consensys",
  "binance blockchain week",
  "world economic forum",
];

const TOKEN_PATTERN = /\b(BTC|ETH|SOL|ADA|XRP|BNB|MATIC|AVAX|DOT|LINK|UNI|ATOM|ARB|OP|NEAR|APT|SUI|TON|DOGE|SHIB|LTC|TRX)\b/g;

const NICHE_KEYWORDS = [
  "summit",
  "workshop",
  "hackathon",
  "developer day",
  "developers day",
  "dev day",
  "validators",
  "deep dive",
  "office hours",
];

const COMMON_TOKENS = new Set([
  "BTC","ETH","SOL","ADA","XRP","BNB","MATIC","AVAX","DOT","LINK","UNI","ATOM","ARB","OP","NEAR","APT","SUI","TON","DOGE","SHIB","LTC","TRX",
]);

export function extractTokens(text: string): string[] {
  if (!text) return [];
  const matches = text.toUpperCase().match(TOKEN_PATTERN) ?? [];
  return [...new Set(matches)].filter((t) => COMMON_TOKENS.has(t));
}

export function classifyScale(input: {
  title: string;
  description?: string;
  city?: string;
  country?: string;
  tokens?: string[];
}): EventScale {
  const haystack = `${input.title} ${input.description ?? ""}`.toLowerCase();

  if (MAJOR_KEYWORDS.some((kw) => haystack.includes(kw))) return "major";

  const tokens = input.tokens ?? extractTokens(haystack);
  if (tokens.length === 1) return "niche";
  if (NICHE_KEYWORDS.some((kw) => haystack.includes(kw)) && tokens.length >= 1) return "niche";

  return "local";
}

export function inferAudience(title: string, description: string): string | undefined {
  const t = `${title} ${description}`.toLowerCase();
  if (t.includes("developer") || t.includes("hackathon") || t.includes("dev day")) return "Developers, builders, engineers";
  if (t.includes("trader") || t.includes("trading")) return "Traders, analysts";
  if (t.includes("founder") || t.includes("startup") || t.includes("vc") || t.includes("investor")) return "Founders, investors, VCs";
  if (t.includes("nft") || t.includes("art")) return "NFT collectors, artists, creators";
  if (t.includes("defi")) return "DeFi users, protocol teams";
  if (t.includes("regulat") || t.includes("compliance") || t.includes("legal")) return "Compliance, legal, policy professionals";
  return undefined;
}
