"use client";

import { useState } from "react";
import { Briefcase, Loader2, Check } from "lucide-react";

type Props = {
  ticker: string;
  pickId?: string;
  defaultShares?: number;
  small?: boolean;
  label?: string;
  onAdded?: () => void;
};

export function AddPaperButton({ ticker, pickId, defaultShares = 100, small, label, onAdded }: Props) {
  const [open, setOpen] = useState(false);
  const [shares, setShares] = useState<string>(String(defaultShares));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, shares: Number(shares), pickId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? "追加に失敗しました");
        return;
      }
      setDone(true);
      onAdded?.();
      setTimeout(() => {
        setDone(false);
        setOpen(false);
      }, 1000);
    } catch {
      setError("通信エラーが起きました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          small
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition"
            : "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition shadow"
        }
      >
        <Briefcase className={small ? "w-3.5 h-3.5" : "w-4 h-4"} />
        {label ?? "エア取引に追加"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="w-full sm:max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-1">エア取引に追加</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              実際のお金は使いません。練習として「買ったつもり」で記録します。
            </p>

            <label className="block text-sm font-medium mb-1">何株買ったつもりにしますか？</label>
            <div className="flex gap-2 mb-1">
              {[100, 200, 500, 1000].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setShares(String(n))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${
                    Number(shares) === n
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {n}株
                </button>
              ))}
            </div>
            <input
              type="number"
              min={1}
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full mt-2 px-3 py-2 text-base rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">日本株は普通 100 株単位ですが、エアなので何株でもOK</p>

            {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}

            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 py-2.5 rounded-full font-semibold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                やめる
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={loading || !Number.isFinite(Number(shares)) || Number(shares) <= 0}
                className="flex-1 py-2.5 rounded-full font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : done ? (
                  <Check className="w-4 h-4" />
                ) : null}
                {done ? "追加しました" : "買ったことにする"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
