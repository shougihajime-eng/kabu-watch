"use client";

import { Plus } from "lucide-react";
import type { Group } from "@/lib/types";

type Props = {
  groups: Group[];
  selected: string | null; // null = all, group id, or "ungrouped"
  onSelect: (id: string | null) => void;
  onAddGroup: () => void;
};

export function GroupTabs({ groups, selected, onSelect, onAddGroup }: Props) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-screen-md mx-auto flex items-center gap-1 px-2 overflow-x-auto no-scrollbar">
        <Tab label="すべて" active={selected === null} onClick={() => onSelect(null)} />
        {groups.map((g) => (
          <Tab
            key={g.id}
            label={g.name}
            active={selected === g.id}
            onClick={() => onSelect(g.id)}
          />
        ))}
        <Tab
          label="未分類"
          active={selected === "ungrouped"}
          onClick={() => onSelect("ungrouped")}
        />
        <button
          type="button"
          onClick={onAddGroup}
          aria-label="フォルダを追加"
          className="shrink-0 ml-1 p-2 my-1 rounded-full text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Tab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-3 py-2 my-1 text-sm rounded-full whitespace-nowrap transition ${
        active
          ? "bg-emerald-600 text-white font-semibold"
          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}
    >
      {label}
    </button>
  );
}
