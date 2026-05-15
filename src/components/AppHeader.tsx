"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LogOut, Sparkles } from "lucide-react";

const TITLES: Record<string, string> = {
  "/": "かぶウォッチ",
  "/picks": "AI予想の履歴",
  "/paper": "エア取引",
  "/watchlist": "ウォッチリスト",
};

export function AppHeader() {
  const router = useRouter();
  const path = usePathname() ?? "/";

  if (path === "/login") return null;

  const title = TITLES[path] ?? (path.startsWith("/stock") ? "銘柄の詳細" : "かぶウォッチ");

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-screen-md mx-auto flex items-center justify-between px-4 h-14">
        <Link
          href="/"
          className="flex items-center gap-1.5 font-bold text-base tracking-tight"
        >
          <Sparkles className="w-4 h-4 text-indigo-500" />
          <span className="bg-gradient-to-r from-indigo-600 to-emerald-600 bg-clip-text text-transparent">
            {title}
          </span>
        </Link>
        <button
          type="button"
          onClick={logout}
          aria-label="ログアウト"
          className="p-2 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
