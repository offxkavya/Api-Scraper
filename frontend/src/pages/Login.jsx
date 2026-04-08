import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, Mail, Lock, ArrowRight, Loader2, UserPlus } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup, loginWithEmail, currentUser, firebaseConfigured } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  async function handleGoogleLogin() {
    try {
      setError('');
      setLoading(true);
      await login();
      navigate('/');
    } catch (error) {
      console.error("Failed to login", error);
      setError('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email || !password) {
      return setError('Please fill in all fields');
    }
    
    if (isSignUp && password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    try {
      setError('');
      setLoading(true);
      if (isSignUp) {
        await signup(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      navigate('/');
    } catch (error) {
      console.error("Auth error", error);
      setError(error.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated Background Gradients */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="card max-w-md w-full p-8 relative z-10 border border-zinc-800/50 backdrop-blur-xl bg-card/80 shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-zinc-800/50 rounded-2xl flex items-center justify-center border border-zinc-700/50 shadow-inner mb-4">
            {isSignUp ? <UserPlus className="w-8 h-8 text-primary" /> : <LogIn className="w-8 h-8 text-primary" />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="text-zinc-400">
            {isSignUp ? 'Join ReelNotes and start learning.' : 'Sign in to access your knowledge.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg animate-in shake duration-300">
            {error}
          </div>
        )}

        {!firebaseConfigured ? (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm rounded-lg leading-relaxed">
            <p className="font-semibold mb-1">Firebase Configuration Missing</p>
            Please set your Firebase environment variables in Vercel or your local .env file to enable authentication.
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-11"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-zinc-500">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-white font-medium hover:bg-zinc-800 transition-all hover:border-zinc-600"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>

            <p className="text-center text-zinc-500 text-sm">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
