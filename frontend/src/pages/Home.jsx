import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Video, Loader2, CheckCircle, Database, Brain, Sparkles } from 'lucide-react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState('idle'); // idle, fetching, ai, saving, success, error
  const [errorDesc, setErrorDesc] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  async function handleExtract(e) {
    e.preventDefault();
    if (!url) return;
    
    setStatus('fetching');
    setErrorDesc('');
    
    try {
      const token = await currentUser.getIdToken();
      
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reelUrl: url })
      });
      
      setStatus('ai');
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract knowledge.');
      }
      
      if (data.note) {
        setStatus('saving');
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../firebase');
        const noteToSave = { ...data.note };
        delete noteToSave.id;
        noteToSave.createdAt = serverTimestamp();
        await addDoc(collection(db, 'users', currentUser.uid, 'notes'), noteToSave);
      }
      
      setStatus('success');
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (error) {
      console.error(error);
      setErrorDesc(error.message);
      setStatus('error');
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl text-primary mb-2 shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Extract Knowledge.</h1>
        <p className="text-xl text-zinc-400">Paste any Instagram Reel URL and let AI do the rest.</p>
      </div>

      <form onSubmit={handleExtract} className="space-y-4 bg-card border border-zinc-800 p-2 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-2 relative z-10 transition-shadow hover:shadow-primary/5 hover:border-zinc-700">
        <div className="relative flex-1 flex items-center">
          <Video className="absolute left-4 w-5 h-5 text-zinc-500" />
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status !== 'idle' && status !== 'error'}
            placeholder="https://instagram.com/reel/..."
            className="w-full bg-transparent border-none text-white p-4 pl-12 focus:outline-none focus:ring-0 placeholder-zinc-600 font-medium"
          />
        </div>
        <button
          type="submit"
          disabled={status !== 'idle' && status !== 'error' || !url}
          className="btn-primary sm:w-auto h-14 whitespace-nowrap min-w-[160px] shadow-lg shadow-primary/20"
        >
          {status === 'idle' || status === 'error' ? 'Extract & Save' : <Loader2 className="w-5 h-5 animate-spin mx-auto" />}
        </button>
      </form>

      {status !== 'idle' && (
        <div className="card p-6 border-zinc-800 bg-card/50 shadow-lg mt-8">
          <ul className="space-y-4">
            <StatusItem 
              active={status === 'fetching' || status === 'ai' || status === 'saving' || status === 'success'}
              done={status === 'ai' || status === 'saving' || status === 'success'}
              icon={<Database className="w-5 h-5" />} 
              text="Fetching reel info..." 
            />
            <StatusItem 
              active={status === 'ai' || status === 'saving' || status === 'success'}
              done={status === 'saving' || status === 'success'}
              icon={<Brain className="w-5 h-5" />} 
              text="Gemini is reading the reel..." 
            />
            <StatusItem 
              active={status === 'saving' || status === 'success'}
              done={status === 'success'}
              icon={<Loader2 className={`w-5 h-5 ${status === 'saving' ? 'animate-spin' : ''}`} />} 
              text="Saving your note..." 
            />
          </ul>
          
          {status === 'success' && (
            <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-3 animate-in fade-in zoom-in duration-300">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Note saved successfully! Redirecting...</span>
            </div>
          )}
          
          {status === 'error' && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex flex-col gap-2">
              <span className="font-medium">Error: {errorDesc}</span>
              <button type="button" onClick={() => setStatus('idle')} className="text-sm underline self-start opacity-80 hover:opacity-100">Try again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusItem({ active, done, icon, text }) {
  if (!active) return null;
  return (
    <li className={`flex items-center gap-4 transition-all duration-500 ${done ? 'text-emerald-400' : 'text-primary animate-pulse'}`}>
      <div className={`p-2 rounded-full ${done ? 'bg-emerald-500/20' : 'bg-primary/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.5)]'}`}>
        {done ? <CheckCircle className="w-5 h-5" /> : icon}
      </div>
      <span className="font-medium text-lg">{text}</span>
    </li>
  );
}
