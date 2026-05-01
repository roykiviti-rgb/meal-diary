"use client";

import { useEffect, useState } from "react";
import AddMealForm from "@/components/AddMealForm";
import QuickNauseaButton from "@/components/QuickNauseaButton";
import FilterBar, { type FilterType } from "@/components/FilterBar";
import FeedItem from "@/components/FeedItem";
import { getAllEntries, type DiaryEntry } from "@/lib/db";

export default function Home() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadEntries = async () => {
    try {
      const data = await getAllEntries();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, []);

  const filteredEntries = entries.filter((entry) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "nausea")
      return entry.type === "symptom" && entry.symptomType === "nausea";
    return entry.type === "meal" && entry.category === activeFilter;
  });

  // Group by date
  const groupedEntries: Record<string, DiaryEntry[]> = {};
  filteredEntries.forEach((entry) => {
    const dateStr = new Date(entry.timestamp).toLocaleDateString("he-IL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groupedEntries[dateStr]) {
      groupedEntries[dateStr] = [];
    }
    groupedEntries[dateStr].push(entry);
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <header className="px-6 py-8 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <h1 className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 mb-2">
          יומן ארוחות ותסמינים
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          מעקב יומי אחר התזונה וההרגשה שלך
        </p>
        
        <FilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </header>
      
      <main className="flex-1 p-6 max-w-2xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <AddMealForm onAdd={loadEntries} />
          </div>
          <div className="md:col-span-2">
            <QuickNauseaButton onAdd={loadEntries} />
          </div>
        </div>

        <div className="space-y-8 mt-8">
          {isLoading ? (
            <div className="text-center text-slate-500 py-12">טוען נתונים...</div>
          ) : Object.keys(groupedEntries).length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">
                אין רשומות להצגה. התחל לתעד ארוחות ותסמינים!
              </p>
            </div>
          ) : (
            Object.entries(groupedEntries).map(([dateStr, dayEntries]) => (
              <div key={dateStr} className="space-y-4">
                <h3 className="sticky top-40 text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50/90 dark:bg-slate-900/90 py-2 backdrop-blur-sm z-0 inline-block px-3 rounded-full border border-slate-200 dark:border-slate-700">
                  {dateStr}
                </h3>
                <div className="space-y-4">
                  {dayEntries.map((entry) => (
                    <FeedItem
                      key={entry.id}
                      entry={entry}
                      onDelete={loadEntries}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
