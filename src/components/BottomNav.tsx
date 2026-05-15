"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LineChart, Briefcase, ListChecks } from "lucide-react";

// スマホ片手操作前提の下タブナビ。
// 4 タブに絞って、どの画面からも 1 タップで切り替えられる。

const TABS = [
  { href: "/", label: "注目", icon: Sparkles, match: (p: string) => p === "/" },
  { href: "/picks", label: "予想", icon: LineChart, match: (p: string) => p.startsWith("/picks") },
  { href: "/paper", label: "エア取引", icon: Briefcase, match: (p: string) => p.startsWith("/paper") },
  { href: "/watchlist", label: "銘柄", icon: ListChecks, match: (p: string) => p.startsWith("/watchlist") || p.startsWith("/stock") },
] as const;

export function BottomNav() {
  const path = usePathname() ?? "/";

  // ログインページでは表示しない
  if (path === "/login") return null;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]"
      aria-label="メイン"
    >
      <ul className="max-w-screen-md mx-auto flex">
        {TABS.map((t) => {
          const active = t.match(path);
          const Icon = t.icon;
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition active:scale-95 ${
                  active
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.2]" : ""}`} />
                <span className={active ? "font-semibold" : ""}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
