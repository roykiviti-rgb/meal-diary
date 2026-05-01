"use client";

import { type MealCategory } from "@/lib/db";

export type FilterType = "all" | MealCategory | "nausea";

interface FilterBarProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export default function FilterBar({
  activeFilter,
  onFilterChange,
}: FilterBarProps) {
  const filters: { id: FilterType; label: string }[] = [
    { id: "all", label: "הכל" },
    { id: "breakfast", label: "בוקר" },
    { id: "lunch", label: "צהריים" },
    { id: "dinner", label: "ערב" },
    { id: "snack", label: "נשנוש" },
    { id: "nausea", label: "בחילות" },
  ];

  return (
    <div className="flex overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar gap-2">
      {filters.map((f) => {
        const isActive = activeFilter === f.id;
        return (
          <button
            key={f.id}
            onClick={() => onFilterChange(f.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {f.label}
          </button>
        );
      })}
    </div>
  );
}
