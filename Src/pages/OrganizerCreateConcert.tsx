import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Music, Sparkles, Save } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function CreateConcert() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    when: '',
    where: '',
    description: '',
    capacity: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // In real app, persist to FastAPI
    setTimeout(() => {
      setIsLoading(false);
      // Save locally for demo
      const savedConcerts = JSON.parse(localStorage.getItem('organizedConcerts') || '[]');
      localStorage.setItem('organizedConcerts', JSON.stringify([...savedConcerts, { ...formData, id: Date.now().toString() }]));
      
      alert('Concert created successfully!');
      navigate('/organizer/dashboard');
    }, 1500);
  };

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <Link to="/organizer/dashboard" className="inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-8 transition-colors">
          <ArrowLeft size={14} /> BACK TO DASHBOARD
        </Link>

        <div className="mb-12">
          <span className="mono-label text-brand-blue mb-2 block">CRAFT / SETUP</span>
          <h1 className="text-4xl font-medium tracking-tighter">Create New Event</h1>
        </div>

        <form onSubmit={handleSubmit} className="card-coastal p-8 space-y-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="mono-label text-[10px] text-midnight/40">CONCERT NAME</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="E.G. NEON ECHOES 2026"
                  className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                />
                <Music className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">WHEN (DATE & TIME)</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    required
                    value={formData.when}
                    onChange={(e) => setFormData({ ...formData, when: e.target.value })}
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="mono-label text-[10px] text-midnight/40">WHERE (LOCATION)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.where}
                    onChange={(e) => setFormData({ ...formData, where: e.target.value })}
                    placeholder="MAIN AUDITORIUM, SF"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors pr-10"
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-midnight/20" size={16} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="mono-label text-[10px] text-midnight/40">EVENT DESCRIPTION</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="PROXIMITY BASED PRIORITY ENABLED..."
                className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <label className="mono-label text-[10px] text-midnight/40">TOTAL CAPACITY</label>
              <input
                type="number"
                required
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="5000"
                className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
              />
            </div>
          </div>

          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary py-4 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  PUBLISH CONCERT
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 flex gap-4 p-6 bg-brand-blue/5 rounded-sharp border border-brand-blue/10">
          <Sparkles className="text-brand-blue flex-shrink-0" size={20} />
          <div>
            <h4 className="text-xs font-bold mb-1">Queue Integration Active</h4>
            <p className="text-[10px] text-midnight/60 leading-relaxed italic">
              New concerts automatically inherit the priority queue framework. 
              You can manually accept users from the queue in your dashboard once the event goes live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}