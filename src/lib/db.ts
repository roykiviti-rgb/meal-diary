import Dexie, { type EntityTable } from 'dexie';

export type EntryType = 'meal' | 'symptom';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DiaryEntry {
  id?: number; // Auto-incremented
  type: EntryType;
  category?: MealCategory; // Only for meals
  description?: string; // Text description
  imageBase64?: string; // Base64 encoded image
  mealItems?: string[]; // Extracted meal items by AI
  symptomType?: string; // e.g., 'nausea'
  timestamp: number; // Unix timestamp
}

const db = new Dexie('MealSymptomDiary') as Dexie & {
  entries: EntityTable<
    DiaryEntry,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration
db.version(2).stores({
  entries: '++id, type, category, timestamp', // Primary key and indexed props
});

// Handle database upgrades smoothly without hanging
db.on('versionchange', () => {
  db.close();
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
});

export type { Dexie };
export { db };

// --- CRUD Helpers ---

export async function addMeal(
  category: MealCategory,
  description?: string,
  imageBase64?: string,
  mealItems?: string[],
  timestamp?: number
) {
  return await db.entries.add({
    type: 'meal',
    category,
    description,
    imageBase64,
    mealItems,
    timestamp: timestamp || Date.now(),
  });
}

export async function addSymptom(
  symptomType: string = 'nausea',
  description?: string,
  timestamp?: number
) {
  return await db.entries.add({
    type: 'symptom',
    symptomType,
    description,
    timestamp: timestamp || Date.now(),
  });
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  return await db.entries.orderBy('timestamp').reverse().toArray();
}

export async function deleteEntry(id: number) {
  return await db.entries.delete(id);
}
