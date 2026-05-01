"use client";

import { useEffect, useState } from "react";
import AddMealForm from "@/components/AddMealForm";
import QuickNauseaButton from "@/components/QuickNauseaButton";
import FilterBar, { type FilterType } from "@/components/FilterBar";
import FeedItem from "@/components/FeedItem";
import { getAllEntries, type DiaryEntry } from "@/lib/db";
import { Download } from "lucide-react";

const categoryLabels: Record<string, string> = {
  breakfast: "בוקר",
  lunch: "צהריים",
  dinner: "ערב",
  snack: "נשנוש",
};

async function exportToExcel(entries: DiaryEntry[]) {
  const XLSX = await import("xlsx");
  
  const rows = entries.map((e) => ({
    "תאריך": new Date(e.timestamp).toLocaleDateString("he-IL"),
    "שעה": new Date(e.timestamp).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" }),
    "סוג": e.type === "meal" ? "ארוחה" : "תסמין",
    "קטגוריה": e.type === "meal" ? categoryLabels[e.category || "snack"] : "בחילה",
    "תיאור": e.description || "",
    "מרכיבים (AI)": e.mealItems?.join(", ") || "",
    "עוצמת בחילה": e.nauseaLevel ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "יומן");

  // Set column widths
  ws["!cols"] = [
    { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    { wch: 30 }, { wch: 40 }, { wch: 12 },
  ];

  XLSX.writeFile(wb, "יומן-ארוחות.xlsx");
}

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
        <div className="flex justify-between items-start mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            יומן ארוחות ותסמינים
          </h1>
          <button
            onClick={() => exportToExcel(entries)}
            title="ייצוא ל-Excel"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ייצוא Excel</span>
          </button>
        </div>
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
