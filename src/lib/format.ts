export function formatPrice(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "—";
  if (currency === "JPY") {
    return `¥${Math.round(value).toLocaleString("ja-JP")}`;
  }
  if (currency === "USD") {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return value.toLocaleString();
}

export function formatChange(change: number | null | undefined, percent: number | null | undefined, currency: string | null | undefined): string {
  if (change == null || percent == null) return "—";
  const sign = change > 0 ? "+" : "";
  const absChange =
    currency === "JPY"
      ? `${sign}${Math.round(change).toLocaleString("ja-JP")}円`
      : `${sign}${change.toFixed(2)}`;
  return `${absChange} (${sign}${percent.toFixed(2)}%)`;
}

export function changeColor(change: number | null | undefined): string {
  if (change == null || change === 0) return "text-slate-500 dark:text-slate-400";
  return change > 0
    ? "text-rose-600 dark:text-rose-400"
    : "text-emerald-600 dark:text-emerald-400";
}

export function relativeJa(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return `${diffSec}秒前`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min}分前`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}時間前`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}日前`;
  return new Date(iso).toLocaleDateString("ja-JP");
}
