import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useEffect } from 'react';

export default function Login() {
  const { login, currentUser, firebaseConfigured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  async function handleLogin() {
    try {
      await login();
      navigate('/');
    } catch (error) {
      console.error("Failed to login", error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="card max-w-md w-full p-8 text-center space-y-8 relative z-10 border border-zinc-800/50 backdrop-blur-xl bg-card/80 shadow-2xl">
        <div className="mx-auto w-20 h-20 bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-700/50 shadow-inner">
          <LogIn className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold mb-3 tracking-tight text-white">ReelNotes</h1>
          <p className="text-zinc-400 text-lg">Turn <span className="text-primary font-medium">Reels</span> into Knowledge.</p>
        </div>
        {!firebaseConfigured && (
          <p className="text-red-400 text-sm text-left leading-relaxed">
            Firebase env vars are missing at build time. In Vercel → Settings → Environment Variables, add either{' '}
            <code className="text-zinc-300">VITE_FIREBASE_CONFIG</code> (paste the full JSON object from Firebase
            console → Project settings → Your apps), or the three variables{' '}
            <code className="text-zinc-300">VITE_FIREBASE_API_KEY</code>,{' '}
            <code className="text-zinc-300">VITE_FIREBASE_PROJECT_ID</code>,{' '}
            <code className="text-zinc-300">VITE_FIREBASE_AUTH_DOMAIN</code>.
            Enable them for <strong className="text-zinc-200">Preview</strong> and Production if you use preview URLs, then redeploy.
          </p>
        )}
        <button
          type="button"
          disabled={!firebaseConfigured}
          onClick={handleLogin}
          className="btn-primary w-full flex items-center justify-center gap-3 py-3 text-lg font-medium shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
