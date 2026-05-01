"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { addSymptom } from "@/lib/db";

interface QuickNauseaButtonProps {
  onAdd: () => void;
}

export default function QuickNauseaButton({ onAdd }: QuickNauseaButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSymptom = async () => {
    setIsSubmitting(true);
    try {
      await addSymptom("nausea");
      onAdd();
    } catch (error) {
      console.error("Failed to add symptom", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleAddSymptom}
      disabled={isSubmitting}
      className="w-full py-4 px-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl flex items-center justify-center gap-3 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50"
    >
      <AlertCircle className="w-5 h-5" />
      <span>{isSubmitting ? "שומר..." : "תיעוד בחילה (עכשיו)"}</span>
    </button>
  );
}
