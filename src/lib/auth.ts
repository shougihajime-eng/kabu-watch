import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "kabu_auth";
const COOKIE_VALUE = "ok";
// 30 days
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret(): string {
  const s = process.env.AUTH_COOKIE_SECRET;
  if (!s) throw new Error("AUTH_COOKIE_SECRET is not set");
  return s;
}

async function hmac(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  return Buffer.from(sig).toString("hex");
}

export async function makeAuthCookieValue(): Promise<string> {
  const sig = await hmac(COOKIE_VALUE, getSecret());
  return `${COOKIE_VALUE}.${sig}`;
}

export async function verifyCookieValue(raw: string | undefined): Promise<boolean> {
  if (!raw) return false;
  const dot = raw.indexOf(".");
  if (dot === -1) return false;
  const value = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (value !== COOKIE_VALUE) return false;
  const expected = await hmac(value, getSecret());
  if (sig.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export async function setAuthCookie(res: NextResponse): Promise<void> {
  const value = await makeAuthCookieValue();
  res.cookies.set(COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  return await verifyCookieValue(cookie);
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
