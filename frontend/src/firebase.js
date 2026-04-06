import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

function readFirebaseConfig() {
  const json = import.meta.env.VITE_FIREBASE_CONFIG;
  if (json && String(json).trim()) {
    try {
      const o = JSON.parse(json);
      return {
        apiKey: o.apiKey,
        projectId: o.projectId,
        authDomain: o.authDomain,
      };
    } catch (e) {
      console.error('Invalid VITE_FIREBASE_CONFIG (must be JSON from Firebase project settings):', e);
    }
  }
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  };
}

const firebaseConfig = readFirebaseConfig();

/** True when env has enough Firebase client config (individual vars or VITE_FIREBASE_CONFIG JSON). */
export function hasFirebaseClientConfig() {
  const c = readFirebaseConfig();
  return !!(c.apiKey && c.projectId && c.authDomain);
}

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
