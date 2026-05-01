"use client";

import { Clock, Utensils, AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { type DiaryEntry, deleteEntry } from "@/lib/db";

interface FeedItemProps {
  entry: DiaryEntry;
  onDelete: () => void;
}

export default function FeedItem({ entry, onDelete }: FeedItemProps) {
  const isMeal = entry.type === "meal";
  const isNausea = entry.type === "symptom" && entry.symptomType === "nausea";

  const handleDelete = async () => {
    if (!entry.id) return;
    if (confirm("האם ברצונך למחוק רשומה זו?")) {
      await deleteEntry(entry.id);
      onDelete();
    }
  };

  const timeString = new Date(entry.timestamp).toLocaleTimeString("he-IL", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const categoryLabels: Record<string, string> = {
    breakfast: "בוקר",
    lunch: "צהריים",
    dinner: "ערב",
    snack: "נשנוש",
  };

  return (
    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 mb-4 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div
            className={`p-2 rounded-full ${
              isMeal
                ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400"
                : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
            }`}
          >
            {isMeal ? <Utensils className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
              {isMeal
                ? `ארוחת ${categoryLabels[entry.category || "snack"]}`
                : "בחילה"}
            </h4>
            <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 mt-0.5 gap-1">
              <Clock className="w-3 h-3" />
              <span>{timeString}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleDelete}
          className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-1.5 rounded-full transition-colors"
          title="מחק רשומה"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {entry.mealItems && entry.mealItems.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {entry.mealItems.map((item, idx) => (
            <span 
              key={idx} 
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-500/20"
            >
              <CheckCircle2 className="w-3 h-3" />
              {item}
            </span>
          ))}
        </div>
      )}

      {entry.description && (
        <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 mb-3 leading-relaxed">
          {entry.description}
        </p>
      )}

      {entry.imageBase64 && (
        <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={entry.imageBase64}
            alt="תמונת ארוחה"
            className="w-full max-h-64 object-cover"
          />
        </div>
      )}
    </div>
  );
}
