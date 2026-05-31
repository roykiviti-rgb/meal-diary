"use client";

import { useState, useEffect } from "react";
import { Activity, X, CalendarClock } from "lucide-react";
import { addSymptom } from "@/lib/firebase";

interface QuickPainButtonProps {
  onAdd: () => void;
}

function getLocalIsoString() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const LEVEL_LABELS = ["", "קל", "קל-בינוני", "בינוני", "חזק", "בלתי נסבל"];
const LEVEL_COLORS = [
  "",
  "bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-500/10 dark:border-yellow-500/30 dark:text-yellow-400",
  "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-500/10 dark:border-orange-500/30 dark:text-orange-400",
  "bg-orange-200 border-orange-400 text-orange-800 dark:bg-orange-500/20 dark:border-orange-500/40 dark:text-orange-300",
  "bg-red-100 border-red-300 text-red-700 dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400",
  "bg-red-200 border-red-400 text-red-800 dark:bg-red-500/20 dark:border-red-500/40 dark:text-red-300",
];

export default function QuickPainButton({ onAdd }: QuickPainButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timestampStr, setTimestampStr] = useState(getLocalIsoString());

  useEffect(() => {
    if (isOpen) {
      setTimestampStr(getLocalIsoString());
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (selectedLevel === null) return;
    setIsSubmitting(true);
    try {
      const timestamp = new Date(timestampStr).getTime();
      await addSymptom("pain", description.trim() || undefined, selectedLevel, timestamp);
      setIsOpen(false);
      setSelectedLevel(null);
      setDescription("");
      onAdd();
    } catch (error) {
      console.error("Failed to add pain symptom", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 px-6 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl flex items-center justify-center gap-3 text-orange-600 dark:text-orange-400 font-medium hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors"
      >
        <Activity className="w-5 h-5" />
        <span>תיעוד כאב</span>
      </button>
    );
  }

  return (
    <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-5 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-orange-700 dark:text-orange-400 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          עוצמת הכאב
        </h3>
        <button
          onClick={() => { setIsOpen(false); setSelectedLevel(null); setDescription(""); }}
          className="p-1.5 text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-2 bg-orange-50/50 dark:bg-slate-900 border border-orange-200 dark:border-orange-500/30 rounded-xl px-3 py-2 mb-4">
        <CalendarClock className="w-5 h-5 text-orange-400" />
        <input 
          type="datetime-local" 
          value={timestampStr}
          onChange={(e) => setTimestampStr(e.target.value)}
          className="bg-transparent border-none focus:ring-0 text-slate-700 dark:text-slate-200 text-sm w-full outline-none"
        />
      </div>

      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            onClick={() => setSelectedLevel(level)}
            className={`flex-1 py-3 rounded-xl border-2 font-bold text-lg transition-all ${
              selectedLevel === level
                ? LEVEL_COLORS[level] + " border-2 scale-105 shadow-md"
                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-orange-300"
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

      <div className="mb-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="תיאור הכאב (מיקום, אופי וכד')..."
          className="w-full p-3 rounded-xl border border-orange-200 dark:border-orange-500/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none h-20"
        />
      </div>

      <button
        onClick={handleSave}
        disabled={selectedLevel === null || isSubmitting}
        className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-medium transition-colors"
      >
        {isSubmitting ? "שומר..." : "שמירת כאב"}
      </button>
    </div>
  );
}
