import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.memo === "string") update.memo = body.memo;
  if (body.group_id === null || typeof body.group_id === "string") {
    update.group_id = body.group_id;
  }
  if (body.alert_low === null || typeof body.alert_low === "number") {
    update.alert_low = body.alert_low;
  }
  if (body.alert_high === null || typeof body.alert_high === "number") {
    update.alert_high = body.alert_high;
  }
  if (typeof body.sort_order === "number") update.sort_order = body.sort_order;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("watchlist")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[PATCH /api/watchlist/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { error } = await supabaseAdmin.from("watchlist").delete().eq("id", id);
  if (error) {
    console.error("[DELETE /api/watchlist/[id]]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("watchlist")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json({ item: data });
}
