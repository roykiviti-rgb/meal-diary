"use client";

import { useState, useRef } from "react";
import { Camera, Utensils, X, Image as ImageIcon } from "lucide-react";
import { addMeal, type MealCategory } from "@/lib/db";

interface AddMealFormProps {
  onAdd: () => void;
}

export default function AddMealForm({ onAdd }: AddMealFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<MealCategory>("breakfast");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() && !imagePreview) return; // Need at least one

    setIsSubmitting(true);
    try {
      await addMeal(category, description, imagePreview || undefined);
      setIsOpen(false);
      setDescription("");
      setImagePreview(null);
      onAdd();
    } catch (error) {
      console.error("Failed to add meal", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-4 px-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-3 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
      >
        <Utensils className="w-5 h-5 text-indigo-500" />
        <span>הוספת ארוחה חדשה</span>
      </button>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Utensils className="w-5 h-5 text-indigo-500" />
          תיעוד ארוחה
        </h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: "breakfast", label: "בוקר" },
              { id: "lunch", label: "צהריים" },
              { id: "dinner", label: "ערב" },
              { id: "snack", label: "נשנוש" },
            ] as const
          ).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id as MealCategory)}
              className={`py-2 px-3 rounded-xl text-sm font-medium transition-all ${
                category === c.id
                  ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-2 border-indigo-200 dark:border-indigo-500/30"
                  : "bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-2 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="מה אכלת?"
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
          rows={3}
        />

        {imagePreview ? (
          <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={() => setImagePreview(null)}
              className="absolute top-2 left-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full backdrop-blur-sm transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            >
              <Camera className="w-5 h-5" />
              <span>צילום</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
              <span>גלריה</span>
            </button>
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              ref={cameraInputRef}
              onChange={handleImageChange}
            />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={(!description.trim() && !imagePreview) || isSubmitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-medium transition-colors"
        >
          {isSubmitting ? "שומר..." : "שמירת ארוחה"}
        </button>
      </form>
    </div>
  );
}
