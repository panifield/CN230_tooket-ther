import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Lock, Mail, Shield, User, CreditCard, MapPin, Phone } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    idPassport: '',
    domicile: '',
    phoneNumber: '',
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Mocking API call to FastAPI
      /*
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Registration failed');
      */
      
      // Simulation for demo
      console.log('Registering user:', formData);
      alert('Registration successful! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-xl mx-auto px-6">
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 gradient-coastal rounded-sharp flex items-center justify-center mx-auto mb-6"
          >
            <Shield className="text-midnight" size={32} />
          </motion.div>
          <h1 className="text-4xl font-medium tracking-tighter mb-2">Create Account</h1>
          <p className="text-midnight/60 text-sm">Join the TOOKET-THER priority network</p>
        </div>

        <div className="space-y-6">
          <form onSubmit={handleRegister} className="card-coastal p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">FULL NAME</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">ID / PASSPORT NUMBER</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    name="idPassport"
                    value={formData.idPassport}
                    onChange={handleInputChange}
                    placeholder="AA1234567"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">DOMICILE</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    name="domicile"
                    value={formData.domicile}
                    onChange={handleInputChange}
                    placeholder="City, Country"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">PHONE NUMBER</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    placeholder="+1 234 567 890"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">EMAIL ADDRESS</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
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
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
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
              {isLoading ? 'CREATING ACCOUNT...' : 'REGISTER'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <p className="text-center text-sm text-midnight/60">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-blue font-medium hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
