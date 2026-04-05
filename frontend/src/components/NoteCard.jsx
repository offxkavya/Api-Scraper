import { Link } from 'react-router-dom';
import { PlayCircle, Calendar } from 'lucide-react';

const DOMAIN_COLORS = {
  'Export': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Business': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'AI & Tech': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Marketing': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Finance': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Lifestyle': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Other': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export default function NoteCard({ note }) {
  const colorClass = DOMAIN_COLORS[note.domain] || DOMAIN_COLORS['Other'];
  
  return (
    <div className="card group hover:border-zinc-700 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col h-full bg-card">
      <div className="relative aspect-video bg-zinc-900 border-b border-zinc-800 overflow-hidden">
        {note.thumbnail ? (
          <img src={note.thumbnail} alt={note.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
            <PlayCircle className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md ${colorClass}`}>
            {note.domain}
          </span>
        </div>
      </div>
      
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-lg text-white mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">{note.title}</h3>
        <p className="text-sm text-zinc-400 line-clamp-2 mb-4 italic flex-1">{note.oneLiner}</p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
          </div>
          <Link to={`/note/${note.id}`} className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
            View Note
          </Link>
        </div>
      </div>
    </div>
  );
}
