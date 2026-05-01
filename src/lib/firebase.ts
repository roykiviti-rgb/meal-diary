import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

// ---- Firebase Config (from environment variables) ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ---- Types ----
export type EntryType = 'meal' | 'symptom';
export type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DiaryEntry {
  id?: string;           // Firestore document ID (string)
  type: EntryType;
  category?: MealCategory;
  description?: string;
  imageBase64?: string;  // Only for local preview before upload
  imageUrl?: string;     // Firebase Storage URL (persisted)
  mealItems?: string[];
  symptomType?: string;
  nauseaLevel?: number;
  timestamp: number;
}

export { auth, onAuthStateChanged, type User };

// ---- Auth: Google Sign-In ----

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return signOut(auth);
}

export function getUid(): string {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error('User not authenticated');
  }
  return uid;
}

// ---- Firestore helpers ----
function entriesCol(uid: string) {
  return collection(db, 'users', uid, 'entries');
}

// Upload a base64 image to Firebase Storage and return the download URL.
async function uploadImage(uid: string, base64: string, entryId: string): Promise<string> {
  const imageRef = ref(storage, `users/${uid}/images/${entryId}`);
  await uploadString(imageRef, base64, 'data_url');
  return await getDownloadURL(imageRef);
}

// ---- CRUD Helpers ----

export async function addMeal(
  category: MealCategory,
  description?: string,
  imageBase64?: string,
  mealItems?: string[],
  timestamp?: number
): Promise<string> {
  const uid = getUid();

  // Save text data first (no image yet)
  const docRef = await addDoc(entriesCol(uid), {
    type: 'meal',
    category,
    description: description || null,
    mealItems: mealItems || null,
    timestamp: timestamp || Date.now(),
  });

  // Upload image to Storage and update the doc with the URL
  if (imageBase64) {
    try {
      const imageUrl = await uploadImage(uid, imageBase64, docRef.id);
      await updateDoc(docRef, { imageUrl });
    } catch (e) {
      console.error('Image upload failed (entry saved without image):', e);
    }
  }

  return docRef.id;
}

export async function addSymptom(
  symptomType: string = 'nausea',
  description?: string,
  nauseaLevel?: number,
  timestamp?: number
): Promise<string> {
  const uid = getUid();
  const docRef = await addDoc(entriesCol(uid), {
    type: 'symptom',
    symptomType,
    description: description || null,
    nauseaLevel: nauseaLevel ?? null,
    timestamp: timestamp || Date.now(),
  });
  return docRef.id;
}

export async function getAllEntries(): Promise<DiaryEntry[]> {
  const uid = getUid();
  const q = query(entriesCol(uid), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as DiaryEntry));
}

export async function deleteEntry(id: string): Promise<void> {
  const uid = getUid();
  await deleteDoc(doc(db, 'users', uid, 'entries', id));
  // Silently try to remove the image from Storage too
  try {
    await deleteObject(ref(storage, `users/${uid}/images/${id}`));
  } catch (_) {
    // Image may not exist — that's fine
  }
}
