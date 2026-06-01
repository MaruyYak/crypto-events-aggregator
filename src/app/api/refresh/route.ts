import { NextResponse } from "next/server";
import { refreshAll } from "@/lib/sources";
import { getLastRefresh } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const results = await refreshAll();
    return NextResponse.json({ ok: true, results, lastRefresh: getLastRefresh() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ lastRefresh: getLastRefresh() });
}
