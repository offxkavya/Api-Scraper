import { useAuth } from '../contexts/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, PlaySquare } from 'lucide-react';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  if (!currentUser) return null;

  return (
    <nav className="border-b border-zinc-800 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition group">
          <PlaySquare className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xl tracking-tight text-white">ReelNotes</span>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition ${location.pathname === '/' ? 'text-primary' : 'text-zinc-400 hover:text-white'}`}
          >
            Extract
          </Link>
          <Link 
            to="/dashboard" 
            className={`text-sm font-medium transition ${location.pathname === '/dashboard' ? 'text-primary' : 'text-zinc-400 hover:text-white'}`}
          >
            Dashboard
          </Link>
          
          <div className="h-6 w-px bg-zinc-800 mx-2"></div>
          
          <div className="flex items-center gap-3">
            <img src={currentUser.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-700" />
            <button onClick={logout} className="text-zinc-400 hover:text-red-400 transition" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
