"use client";

import { useEffect, useState, useRef } from "react";
import AddMealForm from "@/components/AddMealForm";
import QuickNauseaButton from "@/components/QuickNauseaButton";
import FilterBar, { type FilterType } from "@/components/FilterBar";
import FeedItem from "@/components/FeedItem";
import { getAllEntries, addMeal, addSymptom, auth, onAuthStateChanged, signInWithGoogle, signOutUser, type User, type DiaryEntry, type MealCategory } from "@/lib/firebase";
import { Download, Upload, CheckCircle2, XCircle, LogOut } from "lucide-react";

const categoryLabels: Record<string, string> = {
  breakfast: "בוקר",
  lunch: "צהריים",
  dinner: "ערב",
  snack: "נשנוש",
};

// Reverse map: Hebrew label → English key
const hebrewToCategory: Record<string, MealCategory> = {
  "בוקר": "breakfast",
  "צהריים": "lunch",
  "ערב": "dinner",
  "נשנוש": "snack",
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

  ws["!cols"] = [
    { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 10 },
    { wch: 30 }, { wch: 40 }, { wch: 12 },
  ];

  XLSX.writeFile(wb, "יומן-ארוחות.xlsx");
}

// Parse a Hebrew date/time like "1/5/2026" + "15:44" into a timestamp
function parseHebrewDateTime(dateStr: string, timeStr: string): number {
  try {
    // he-IL date format: D/M/YYYY
    const [day, month, year] = String(dateStr).split("/").map(Number);
    const [hours, minutes] = String(timeStr).split(":").map(Number);
    const d = new Date(year, month - 1, day, hours || 0, minutes || 0);
    if (!isNaN(d.getTime())) return d.getTime();
  } catch (_) { /* ignore */ }
  return Date.now();
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const loadEntries = async () => {
    try {
      setIsLoading(true);
      const data = await getAllEntries();
      setEntries(data);
    } catch (error) {
      console.error("Failed to load entries", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        loadEntries();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be re-selected if needed
    e.target.value = "";

    setIsImporting(true);
    setImportStatus(null);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = XLSX.utils.sheet_to_json(ws);

      if (rows.length === 0) {
        setImportStatus({ type: "error", message: "הקובץ ריק או בפורמט לא מזוהה." });
        return;
      }

      let imported = 0;
      for (const row of rows) {
        const type = String(row["סוג"] || "").trim();
        const dateStr = String(row["תאריך"] || "").trim();
        const timeStr = String(row["שעה"] || "00:00").trim();
        const timestamp = parseHebrewDateTime(dateStr, timeStr);

        if (type === "ארוחה") {
          const categoryHebrew = String(row["קטגוריה"] || "").trim();
          const category: MealCategory = hebrewToCategory[categoryHebrew] || "snack";
          const description = String(row["תיאור"] || "").trim() || undefined;
          const mealItemsRaw = String(row["מרכיבים (AI)"] || "").trim();
          const mealItems = mealItemsRaw ? mealItemsRaw.split(",").map((s: string) => s.trim()).filter(Boolean) : undefined;
          await addMeal(category, description, undefined, mealItems, timestamp);
          imported++;
        } else if (type === "תסמין") {
          const levelRaw = row["עוצמת בחילה"];
          const nauseaLevel = levelRaw !== undefined && levelRaw !== "" ? Number(levelRaw) : undefined;
          await addSymptom("nausea", undefined, nauseaLevel, timestamp);
          imported++;
        }
      }

      setImportStatus({ type: "success", message: `יובאו בהצלחה ${imported} רשומות!` });
      await loadEntries();
    } catch (err) {
      console.error("Import failed", err);
      setImportStatus({ type: "error", message: "שגיאה בקריאת הקובץ. ודא שהוא יוצא מהאפליקציה הזו." });
    } finally {
      setIsImporting(false);
      // Auto-dismiss success after 4 seconds
      setTimeout(() => setImportStatus(null), 4000);
    }
  };

  const filteredEntries = entries.filter((entry) => {
    // Check category filter
    if (activeFilter !== "all") {
      if (activeFilter === "nausea" && (entry.type !== "symptom" || entry.symptomType !== "nausea")) return false;
      if (activeFilter !== "nausea" && (entry.type !== "meal" || entry.category !== activeFilter)) return false;
    }
    
    // Check date filter
    if (selectedDate) {
      // Create a local date string in YYYY-MM-DD format based on local timezone
      const entryDate = new Date(entry.timestamp);
      const localDateStr = new Date(entryDate.getTime() - entryDate.getTimezoneOffset() * 60000)
        .toISOString()
        .split('T')[0];
        
      if (localDateStr !== selectedDate) return false;
    }
    
    return true;
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

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-slate-500 animate-pulse text-lg font-medium">טוען...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-6 text-center">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-sm w-full space-y-6">
          <div className="mx-auto w-16 h-16 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">יומן ארוחות</h1>
          <p className="text-slate-500 dark:text-slate-400">התחבר כדי לשמור ולסנכרן את היומן שלך מכל מכשיר.</p>
          <button
            onClick={() => signInWithGoogle().catch(console.error)}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors"
          >
            התחברות עם Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      <header className="px-6 py-8 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h1 className="text-3xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            יומן ארוחות ותסמינים
          </h1>
          <div className="flex flex-wrap gap-2">
            {/* Import Button */}
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              title="ייבוא מ-Excel"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">{isImporting ? "מייבא..." : "ייבוא Excel"}</span>
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleImportExcel}
            />

            {/* Export Button */}
            <button
              onClick={() => exportToExcel(entries)}
              title="ייצוא ל-Excel"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">ייצוא Excel</span>
            </button>
            
            {/* Log Out Button */}
            <button
              onClick={() => signOutUser().catch(console.error)}
              title="התנתק"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">התנתק</span>
            </button>
          </div>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          מעקב יומי אחר התזונה וההרגשה שלך
        </p>

        {/* Import status toast */}
        {importStatus && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium mb-4 animate-in fade-in slide-in-from-top-2 duration-300 ${
            importStatus.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
              : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20"
          }`}>
            {importStatus.type === "success"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <XCircle className="w-4 h-4 shrink-0" />}
            {importStatus.message}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <FilterBar
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
          
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm w-fit max-w-full">
            <span className="text-sm text-slate-500 font-medium shrink-0">תאריך:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-sm text-slate-700 dark:text-slate-200 focus:ring-0 outline-none p-0 w-full"
            />
            {selectedDate && (
              <button 
                onClick={() => setSelectedDate("")}
                className="text-slate-400 hover:text-red-500 mr-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
                title="נקה תאריך"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
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


