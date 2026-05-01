"use client";

import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { addSymptom } from "@/lib/firebase";

interface QuickNauseaButtonProps {
  onAdd: () => void;
}

const LEVEL_LABELS = ["", "קלה", "קלה-בינונית", "בינונית", "חזקה", "חמורה מאוד"];
const LEVEL_COLORS = [
  "",
  "bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400",
  "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400",
  "bg-orange-200 border-orange-400 text-orange-800 dark:bg-orange-500/20 dark:border-orange-500/40 dark:text-orange-300",
  "bg-red-100 border-red-300 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
  "bg-red-200 border-red-400 text-red-800 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300",
];

export default function QuickNauseaButton({ onAdd }: QuickNauseaButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (selectedLevel === null) return;
    setIsSubmitting(true);
    try {
      await addSymptom("nausea", undefined, selectedLevel);
      setIsOpen(false);
      setSelectedLevel(null);
      onAdd();
    } catch (error) {
      console.error("Failed to add symptom", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 px-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center justify-center gap-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
      >
        <AlertCircle className="w-5 h-5" />
        <span>תיעוד בחילה (עכשיו)</span>
      </button>
    );
  }

  return (
    <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          עוצמת הבחילה
        </h3>
        <button
          onClick={() => { setIsOpen(false); setSelectedLevel(null); }}
          className="p-1.5 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
              selectedLevel === level
                ? LEVEL_COLORS[level] + " border-2 scale-105 shadow-md"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-red-300"
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {selectedLevel && (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-4">
          עוצמה {selectedLevel} — {LEVEL_LABELS[selectedLevel]}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={selectedLevel === null || isSubmitting}
        className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-medium transition-colors"
      >
        {isSubmitting ? "שומר..." : "שמירת בחילה"}
      </button>
    </div>
  );
}
