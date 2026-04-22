import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lock, Mail, Shield } from 'lucide-react';
import { useAuth, UserRole } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const { setRole } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Mocking API call to FastAPI
      // In real implementation:
      /*
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Login failed');
      const role = data.role as UserRole;
      */
      
      // Simulation for demo
      let role: UserRole = 'user';
      if (email.includes('organizer')) role = 'organizer';
      else if (email.includes('checker')) role = 'checker';

      setRole(role);
      
      if (role === 'organizer') navigate('/organizer/dashboard');
      else if (role === 'checker') navigate('/checker');
      else navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-32 pb-20">
      <div className="max-w-md mx-auto px-6">
        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 gradient-coastal rounded-sharp flex items-center justify-center mx-auto mb-6"
          >
            <Shield className="text-midnight" size={32} />
          </motion.div>
          <h1 className="text-4xl font-medium tracking-tighter mb-2">Access Portal</h1>
          <p className="text-midnight/60 text-sm">Sign in to your TOOKET-THER account</p>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleLogin} className="card-coastal p-8 space-y-6">
            <div className="space-y-2">
              <label className="mono-label text-[10px] text-midnight/40">EMAIL ADDRESS</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="mono-label text-[10px] text-midnight/40">PASSWORD</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-xs rounded-sharp border border-red-100 italic">
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary flex items-center justify-center gap-2 group"
            >
              {isLoading ? 'SIGNING IN...' : 'SIGN IN'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          {/* Demo Shortcuts */}
          <div className="space-y-3">
            <span className="mono-label text-[9px] text-midnight/40 text-center block tracking-widest">DEMO PORTAL ACCESS</span>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setEmail('organizer@coastal.com'); setPassword('demo123'); }}
                className="p-3 border border-black/5 rounded-sharp bg-sky-tint/5 hover:bg-sky-tint/20 transition-colors text-left group"
              >
                <div className="text-[10px] font-bold text-brand-blue mb-1">ORGANIZER</div>
                <div className="text-[9px] text-midnight/40 truncate">organizer@coastal.com</div>
              </button>
              <button 
                onClick={() => { setEmail('checker@coastal.com'); setPassword('demo123'); }}
                className="p-3 border border-black/5 rounded-sharp bg-sky-tint/5 hover:bg-sky-tint/20 transition-colors text-left group"
              >
                <div className="text-[10px] font-bold text-brand-blue mb-1">CHECKER</div>
                <div className="text-[9px] text-midnight/40 truncate">checker@coastal.com</div>
              </button>
            </div>
          </div>

          <p className="text-center text-sm text-midnight/60">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-blue font-medium hover:underline">
              Register here
            </Link>
          </p>

          <div className="flex items-start gap-3 p-4 bg-cream-base/20 rounded-sharp border border-black/5">
            <div className="mt-1"><Shield size={14} className="text-midnight/40" /></div>
            <p className="text-[10px] text-midnight/60 leading-relaxed italic">
              Coastal accounts are integrated with our priority queue system. 
              Ensure your profile details are accurate to maintain residency verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
