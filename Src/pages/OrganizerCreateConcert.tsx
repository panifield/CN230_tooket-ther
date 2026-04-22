import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Music, Sparkles, Save, Box, Plus, Trash2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function CreateConcert() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    when: '',
    where: '',
    description: '',
    capacity: '',
    posterUrl: ''
  });
  const [zones, setZones] = useState([{ id: '1', name: '', capacity: '' }]);
  const [isLoading, setIsLoading] = useState(false);

  const addZone = () => {
    setZones([...zones, { id: Date.now().toString(), name: '', capacity: '' }]);
  };

  const removeZone = (id: string) => {
    if (zones.length > 1) {
      setZones(zones.filter(z => z.id !== id));
    }
  };

  const updateZone = (id: string, field: 'name' | 'capacity', value: string) => {
    setZones(zones.map(z => z.id === id ? { ...z, [field]: value } : z));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // In real app, persist to FastAPI
    setTimeout(() => {
      setIsLoading(false);
      // Save locally for demo
      const savedConcerts = JSON.parse(localStorage.getItem('organizedConcerts') || '[]');
      localStorage.setItem('organizedConcerts', JSON.stringify([
        ...savedConcerts, 
        { ...formData, zones, id: Date.now().toString() }
      ]));
      
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
            {/* Poster Upload Section */}
            <div className="space-y-4">
              <label className="mono-label text-[10px] text-midnight/40">CONCERT POSTER</label>
              <div className="flex gap-6 items-start">
                <div className="w-32 h-44 bg-midnight/5 rounded-sharp border border-black/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {formData.posterUrl ? (
                    <img src={formData.posterUrl} alt="Poster preview" className="w-full h-full object-cover" />
                  ) : (
                    <Music size={24} className="text-midnight/10" />
                  )}
                </div>
                <div className="flex-grow space-y-2">
                  <input
                    type="url"
                    placeholder="IMAGE URL (PNG, JPG)"
                    value={formData.posterUrl}
                    onChange={(e) => setFormData({ ...formData, posterUrl: e.target.value })}
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                  />
                  <p className="text-[10px] text-midnight/40 leading-relaxed italic">
                    Paste a high-resolution image URL. 
                    Recommended aspect ratio: 2:3 or 3:4.
                  </p>
                </div>
              </div>
            </div>

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

            {/* Zone Management Section */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center">
                <label className="mono-label text-[10px] text-midnight/40 flex items-center gap-2">
                  <Box size={14} className="text-brand-blue" />
                  ZONE CONFIGURATION
                </label>
                <button
                  type="button"
                  onClick={addZone}
                  className="flex items-center gap-1.5 text-[10px] mono-label text-brand-blue hover:underline"
                >
                  <Plus size={12} /> ADD ZONE
                </button>
              </div>

              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {zones.map((zone, index) => (
                    <motion.div
                      key={zone.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-3 items-start"
                    >
                      <div className="flex-grow grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          required
                          placeholder={`ZONE ${index + 1} NAME (E.G. VIP)`}
                          value={zone.name}
                          onChange={(e) => updateZone(zone.id, 'name', e.target.value)}
                          className="bg-midnight/5 border border-black/5 rounded-sharp px-4 py-3 text-xs outline-none focus:border-brand-blue transition-colors"
                        />
                        <input
                          type="number"
                          required
                          placeholder="CAPACITY"
                          value={zone.capacity}
                          onChange={(e) => updateZone(zone.id, 'capacity', e.target.value)}
                          className="bg-midnight/5 border border-black/5 rounded-sharp px-4 py-3 text-xs outline-none focus:border-brand-blue transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeZone(zone.id)}
                        disabled={zones.length === 1}
                        className="p-3.5 text-midnight/20 hover:text-red-400 disabled:opacity-0 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
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