import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  type Auth,
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialise lazily and tolerate missing env vars so that build-time
// page data collection (which loads every route module) doesn't crash
// when Firebase env vars aren't exposed to the build environment.
// At runtime the env vars are expected to be present on the host.
let app: FirebaseApp | null = null;
try {
  if (firebaseConfig.apiKey) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  } else if (typeof window !== 'undefined') {
    // Visible only in the browser — helps users diagnose missing env vars on the live site.
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] NEXT_PUBLIC_FIREBASE_API_KEY is not set. Auth and Firestore will not work until the env vars are configured on the host.',
    );
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn('[firebase] initialization failed', err);
  app = null;
}

export const auth = (app ? getAuth(app) : (null as unknown)) as Auth;
export const db = (app ? getFirestore(app) : (null as unknown)) as Firestore;
export const storage = (app ? getStorage(app) : (null as unknown)) as FirebaseStorage;
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
