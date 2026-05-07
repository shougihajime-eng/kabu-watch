"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import type { NewsItem } from "@/lib/types";
import { relativeJa } from "@/lib/format";

export function NewsList({ ticker }: { ticker: string }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/news?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setItems(d.items ?? []))
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return (
    <section className="bg-white dark:bg-slate-900 sm:rounded-2xl sm:mx-2 border-y sm:border border-slate-200 dark:border-slate-800">
      <h3 className="px-4 pt-4 pb-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
        関連ニュース
      </h3>
      {loading ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">
          ニュースが見つかりませんでした
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {items.map((n, i) => (
            <li key={i}>
              <a
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 active:bg-slate-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {n.publisher ?? ""} · {relativeJa(n.publishedAt)}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 dark:text-slate-600 mt-1 shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
