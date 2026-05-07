"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Group } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (g: Group) => void;
};

export function AddGroupModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "作成に失敗しました");
        return;
      }
      onCreated(data.group);
      onClose();
    } catch {
      setError("通信エラーが起きました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        className="w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold">フォルダを追加</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="フォルダ名（例: 長期保有 / 監視中）"
            className="w-full px-3 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "作成中…" : "作成"}
          </button>
        </div>
      </form>
    </div>
  );
}
