import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';

export function isFirebaseConfigured(): boolean {
  return !!import.meta.env.VITE_FIREBASE_DATABASE_URL;
}

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

export function getDb(): Database | null {
  if (!isFirebaseConfigured()) return null;
  if (_db) return _db;

  _app = getApps().length === 0
    ? initializeApp({
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      })
    : getApps()[0];

  _db = getDatabase(_app);
  return _db;
}
