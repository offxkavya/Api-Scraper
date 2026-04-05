import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, Clock, ExternalLink, Copy, Trash2, Edit3, CheckSquare, Target, ChevronDown, ChevronUp } from 'lucide-react';

const DOMAINS = ['Export', 'Business', 'AI & Tech', 'Marketing', 'Finance', 'Lifestyle', 'Other'];

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isEditingDomain, setIsEditingDomain] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    async function fetchNote() {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'notes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setNote({ id: docSnap.id, ...docSnap.data() });
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchNote();
  }, [currentUser, id, navigate]);

  if (loading) return null;
  if (!note) return null;

  async function handleDelete() {
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'notes', id));
        navigate('/dashboard');
      } catch(e) {
        alert("Failed to delete");
      }
    }
  }

  function handleCopy() {
    const text = `${note.title}\n\nSummary:\n${note.summary}\n\nKey Takeaways:\n${note.keyTakeaways.map(t => `- ${t}`).join('\n')}\n\nAction Items:\n${note.actionItems.map(a => `- ${a}`).join('\n')}`;
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  async function updateDomain(newDomain) {
    if (newDomain === note.domain) {
      setIsEditingDomain(false);
      return;
    }
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'notes', id), { domain: newDomain });
      setNote({ ...note, domain: newDomain });
      setIsEditingDomain(false);
    } catch (e) {
      alert("Failed to update domain");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={handleCopy} className="p-2 justify-center flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition" title="Copy text">
            <Copy className="w-5 h-5" /> <span className="hidden sm:inline text-sm">Copy</span>
          </button>
          <button onClick={handleDelete} className="p-2 justify-center flex items-center gap-2 text-red-500/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Delete note">
            <Trash2 className="w-5 h-5" /> <span className="hidden sm:inline text-sm">Delete</span>
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {note.thumbnail && (
          <div className="w-full h-64 md:h-80 lg:h-96 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent z-10" />
            <img src={note.thumbnail} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className={`p-6 md:p-10 ${note.thumbnail ? '-mt-24 relative z-20' : ''}`}>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {isEditingDomain ? (
              <select 
                value={note.domain}
                onChange={(e) => updateDomain(e.target.value)}
                onBlur={() => setIsEditingDomain(false)}
                className="bg-zinc-800 text-white text-sm rounded-lg px-3 py-1 border border-zinc-700 focus:outline-none"
                autoFocus
              >
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <span 
                className="px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 text-primary bg-primary/10 cursor-pointer hover:bg-primary/20 flex items-center gap-1 group"
                onClick={() => setIsEditingDomain(true)}
              >
                {note.domain}
                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </span>
            )}
            
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
            </div>
            
            {note.reelUrl && (
              <a href={note.reelUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline ml-auto bg-primary/10 px-3 py-1.5 rounded border border-primary/20">
                <ExternalLink className="w-4 h-4" /> Watch Original Reel
              </a>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{note.title}</h1>
          <p className="text-xl text-zinc-400 italic font-serif mb-8 border-l-4 border-primary pl-4">{note.oneLiner}</p>
          
          <div className="space-y-10">
            <section>
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">Summary</h2>
              <p className="text-zinc-300 leading-relaxed text-lg">{note.summary}</p>
            </section>
            
            <section className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800/80">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-400" /> Key Takeaways
              </h2>
              <ul className="space-y-3">
                {note.keyTakeaways?.map((takeaway, i) => (
                  <li key={i} className="flex gap-3 text-zinc-300">
                    <span className="text-emerald-400 mt-1 flex-shrink-0">•</span>
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </section>
            
            <section className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" /> Action Items
              </h2>
              <ul className="space-y-3">
                {note.actionItems?.map((item, i) => (
                  <li key={i} className="flex gap-3 text-zinc-300">
                    <CheckSquare className="w-5 h-5 text-primary/70 mt-0.5 flex-shrink-0" />
                    <span className="font-medium text-white">{item}</span>
                  </li>
                ))}
              </ul>
            </section>
            
            <section className="border-t border-zinc-800 pt-8">
              <button 
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between text-zinc-400 hover:text-white transition group"
              >
                <span className="text-lg font-semibold">View Full Transcript</span>
                {showTranscript ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5 group-hover:text-primary transition" />}
              </button>
              
              {showTranscript && (
                <div className="mt-4 bg-black/40 rounded-lg p-6 overflow-x-auto border border-zinc-800">
                  <p className="font-mono text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{note.transcript}</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
