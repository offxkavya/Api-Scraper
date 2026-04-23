import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import NoteCard from '../components/NoteCard';
import NoteTable from '../components/NoteTable';
import { Search, Inbox, LayoutGrid, List } from 'lucide-react';

const DOMAINS = ['All', 'Export', 'Business', 'AI & Tech', 'Marketing', 'Finance', 'Lifestyle', 'Other'];

export default function Dashboard() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('table'); // Default to table as requested
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'users', currentUser.uid, 'notes'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotes(fetchedNotes);
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUser]);

  const filteredNotes = notes.filter(n => {
    const matchesDomain = activeTab === 'All' || n.domain === activeTab;
    const matchesSearch = !searchQuery || 
                          n.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          n.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          n.transcript?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white tracking-tight">Your Knowledge Base</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-card border border-zinc-800 rounded-full py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full md:w-64 text-white"
            />
          </div>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-hide border-b border-zinc-800 gap-6">
        {DOMAINS.map(domain => (
          <button
            key={domain}
            onClick={() => setActiveTab(domain)}
            className={`whitespace-nowrap pb-3 text-sm font-medium transition-colors relative ${
              activeTab === domain ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {domain}
            {activeTab === domain && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            )}
          </button>
        ))}
      </div>

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="card h-80 animate-pulse bg-zinc-900/50">
                 <div className="aspect-video bg-zinc-800"></div>
                 <div className="p-5 space-y-3">
                   <div className="h-6 bg-zinc-800 rounded w-3/4"></div>
                   <div className="h-4 bg-zinc-800 rounded w-full"></div>
                   <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
                 </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full border border-zinc-800 rounded-xl overflow-hidden animate-pulse">
            <div className="h-12 bg-zinc-900 border-b border-zinc-800"></div>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-zinc-900/50 border-b border-zinc-800/50"></div>
            ))}
          </div>
        )
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
            <Inbox className="w-10 h-10 text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No notes found</h2>
          <p className="text-zinc-500 max-w-sm mx-auto">
            {searchQuery 
              ? "We couldn't find any notes matching your search." 
              : activeTab !== 'All' 
                ? `You don't have any notes in the ${activeTab} domain yet.`
                : "You haven't extracted any notes yet. Paste a Reel URL to get started."}
          </p>
        </div>
      ) : (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredNotes.map(note => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        ) : (
          <NoteTable notes={filteredNotes} />
        )
      )}
    </div>
  );
}
