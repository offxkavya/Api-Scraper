import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, ExternalLink } from 'lucide-react';

const DOMAIN_COLORS = {
  'Export': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  'Business': 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  'AI & Tech': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Marketing': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Finance': 'text-green-400 bg-green-400/10 border-green-400/20',
  'Lifestyle': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  'Other': 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20',
};

export default function NoteTable({ notes }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-card/50 backdrop-blur-sm shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="table-header backdrop-blur-xl">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Reel Content</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Purpose</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Key Insights</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Next Steps</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {notes.map((note) => {
              const colorClass = DOMAIN_COLORS[note.domain] || DOMAIN_COLORS['Other'];
              return (
                <tr key={note.id} className="glass-row group">
                  <td className="px-6 py-6 vertical-top">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-tight ${colorClass}`}>
                      {note.domain}
                    </span>
                  </td>
                  <td className="px-6 py-6 max-w-xs">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-white font-bold text-sm group-hover:text-primary transition-colors leading-snug">
                        {note.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                        <Calendar className="w-3 h-3" />
                        <span>{note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : 'Just now'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-6 max-w-sm">
                    <p className="text-zinc-400 text-xs italic line-clamp-3 leading-relaxed">
                      "{note.oneLiner}"
                    </p>
                  </td>
                  <td className="px-6 py-6 max-w-md">
                    <ul className="space-y-1.5">
                      {note.keyTakeaways?.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-zinc-300 text-[11px] flex gap-2 leading-tight">
                          <span className="text-primary mt-1">•</span>
                          <span className="line-clamp-2">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-6 max-w-md">
                    <ul className="space-y-1.5">
                      {note.actionItems?.slice(0, 2).map((item, i) => (
                        <li key={i} className="text-zinc-300 text-[11px] flex gap-2 leading-tight">
                          <span className="text-emerald-500 mt-1">→</span>
                          <span className="line-clamp-2">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <Link 
                      to={`/note/${note.id}`} 
                      className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:bg-primary hover:text-white transition-all shadow-lg group/btn"
                    >
                      <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
