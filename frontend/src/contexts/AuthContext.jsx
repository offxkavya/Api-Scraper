import { createContext, useContext, useEffect, useState } from 'react';
import { auth, provider, hasFirebaseClientConfig } from '../firebase';
import { signInWithPopup, signOut, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(() => !!auth);

  async function login() {
    if (!auth || !provider) {
      throw new Error('Firebase is not configured.');
    }
    return signInWithPopup(auth, provider);
  }

  function signup(email, password) {
    if (!auth) throw new Error('Firebase is not configured.');
    return createUserWithEmailAndPassword(auth, email, password);
  }

  function loginWithEmail(email, password) {
    if (!auth) throw new Error('Firebase is not configured.');
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    if (!auth) return Promise.resolve();
    return signOut(auth);
  }

  useEffect(() => {
    if (!auth) return;

    const timeout = setTimeout(() => {
      console.warn("Auth check timed out. Firebase might not be configured.");
      setLoading(false);
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
      clearTimeout(timeout);
    });
    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    loginWithEmail,
    logout,
    firebaseConfigured: !!auth,
  };

  const missingKeys = !hasFirebaseClientConfig();

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-background text-white flex-col gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-500 font-medium animate-pulse">Initializing ReelNotes...</p>
          {missingKeys && (
            <p className="text-red-400 text-sm mt-4 italic">
              Firebase credentials missing. Check Vercel Environment Variables.
            </p>
          )}
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
