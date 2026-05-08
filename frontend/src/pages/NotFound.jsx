import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center">
      <div className="w-24 h-24 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mb-6">
        <AlertCircle size={48} />
      </div>
      <h1 className="text-4xl font-bold text-white mb-2">404</h1>
      <p className="text-xl text-zinc-400 mb-8">Oops! We couldn't find that page.</p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-[var(--volt-yellow)] hover:brightness-110 text-black font-semibold rounded-xl shadow-sm transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
