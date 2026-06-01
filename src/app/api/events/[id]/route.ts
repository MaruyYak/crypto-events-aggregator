import { NextResponse } from "next/server";
import { deleteEvent } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteEvent(id);
  if (!deleted) {
    return NextResponse.json({ ok: false, error: "Not found or not a manual event" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
