import { NextRequest, NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const password = body?.password;

  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "サーバー設定エラー: APP_PASSWORD が未設定です" },
      { status: 500 },
    );
  }

  if (typeof password !== "string" || password !== expected) {
    return NextResponse.json({ error: "合言葉が違います" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  await setAuthCookie(res);
  return res;
}
