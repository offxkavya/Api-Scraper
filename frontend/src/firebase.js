import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  console.error(
    `❌ MISSING FIREBASE KEYS: ${missingKeys.join(', ')}. ` +
    `Please set these in your .env file or Vercel Environment Variables.`
  );
}

let db = null;
let auth = null;
let provider = null;

if (missingKeys.length === 0) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    provider = new GoogleAuthProvider();
  } catch (e) {
    console.error('Firebase initialization failed:', e);
  }
}

export { db, auth, provider };
