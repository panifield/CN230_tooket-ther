import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Edit2, Trash2, Plus, Settings2, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

type Zone = {
  id: string;
  name: string;
  capacity: number;
  price: number;
  color: string;
  status: 'active' | 'inactive';
};

export default function OrganizerZones() {
  const [selectedEventId, setSelectedEventId] = useState<string>('E1');
  
  const recentEvents = [
    { id: 'E1', name: 'Coastal Tech Summit 2026' },
    { id: 'E2', name: 'Neon Nights Festival' },
    { id: 'E3', name: 'Design Conf 2026' },
  ];

  const zoneData: Record<string, Zone[]> = {
    'E1': [
      { id: 'Z1', name: 'VIP FRONT', capacity: 120, price: 500, color: '#FCE6A9', status: 'active' },
      { id: 'Z2', name: 'PREMIUM MID', capacity: 350, price: 300, color: '#AAD6FA', status: 'active' },
      { id: 'Z3', name: 'STANDARD REAR', capacity: 800, price: 150, color: '#C5F6FA', status: 'active' },
    ],
    'E2': [
      { id: 'Z1', name: 'DANCE FLOOR', capacity: 2000, price: 100, color: '#FCE6A9', status: 'active' },
      { id: 'Z2', name: 'LOUNGE', capacity: 500, price: 250, color: '#AAD6FA', status: 'active' },
      { id: 'Z3', name: 'BACKSTAGE', capacity: 50, price: 1000, color: '#FFF4C7', status: 'inactive' },
    ],
    'E3': [
      { id: 'Z1', name: 'MAIN HALL', capacity: 500, price: 0, color: '#C5F6FA', status: 'active' },
    ]
  };

  const zones = zoneData[selectedEventId] || [];

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="flex-grow">
            <Link to="/organizer/dashboard" className="inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-4 transition-colors">
              <ArrowLeft size={14} /> BACK TO DASHBOARD
            </Link>
            <h1 className="text-4xl font-medium tracking-tighter mb-6">Zone Management</h1>
            
            {/* Event Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <span className="mono-label text-[10px] text-midnight/40">MANAGING ZONES FOR:</span>
              <div className="relative">
                <select 
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="appearance-none bg-white border border-black/10 rounded-sharp px-4 py-2 pr-10 mono-label text-[10px] font-bold text-brand-blue focus:border-brand-blue outline-none transition-colors cursor-pointer"
                >
                  {recentEvents.map(event => (
                    <option key={event.id} value={event.id}>{event.name.toUpperCase()}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-brand-blue/40">
                   <Plus size={12} className="rotate-45" />
                </div>
              </div>
            </div>
          </div>
          <button className="btn-primary py-2 px-4 text-xs flex items-center gap-2 whitespace-nowrap">
            <Plus size={14} /> ADD NEW ZONE
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Zones List */}
          <div className="lg:col-span-2 space-y-6">
            {zones.map((zone, i) => (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="card-coastal p-6 flex items-center justify-between group"
              >
                <div className="flex items-center gap-6">
                  <div 
                    className="w-12 h-12 rounded-sharp border border-black/5 flex items-center justify-center"
                    style={{ backgroundColor: zone.color }}
                  >
                    <Layers size={20} className="text-midnight/40" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-medium">{zone.name}</h3>
                      <span className={`text-[9px] px-2 py-0.5 rounded-sharp mono-label ${
                        zone.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-midnight/5 text-midnight/40'
                      }`}>
                        {zone.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[10px] mono-label text-midnight/40">
                      <span>CAPACITY: {zone.capacity}</span>
                      <span>PRICE: ${zone.price}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-sky-tint rounded-sharp transition-colors"><Edit2 size={14} /></button>
                  <button className="p-2 hover:bg-red-50 text-red-400 rounded-sharp transition-colors"><Trash2 size={14} /></button>
                  <button className="p-2 hover:bg-sky-tint rounded-sharp transition-colors"><Settings2 size={14} /></button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Visual Layout Preview */}
          <div className="lg:col-span-1">
            <div className="card-coastal p-8 sticky top-32">
              <h3 className="mono-label text-brand-blue mb-8">LAYOUT PREVIEW</h3>
              
              <div className="aspect-[3/4] bg-midnight/5 rounded-card p-6 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute inset-0 gradient-coastal opacity-5" />
                
                {/* Stage */}
                <div className="h-4 bg-midnight/10 rounded-full mb-8 flex items-center justify-center">
                  <span className="text-[8px] mono-label text-midnight/20">STAGE</span>
                </div>

                {/* Zones Visualization */}
                {zones.map((zone) => (
                  <div 
                    key={zone.id}
                    className="flex-1 rounded-sharp border border-black/5 flex items-center justify-center transition-all hover:scale-[1.02] cursor-pointer"
                    style={{ 
                      backgroundColor: zone.color,
                      opacity: zone.status === 'active' ? 0.8 : 0.2
                    }}
                  >
                    <span className="text-[10px] mono-label font-bold opacity-40">{zone.id}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-cream-base/20 rounded-sharp border border-black/5">
                <p className="text-[10px] text-midnight/60 leading-relaxed">
                  Changes to zone pricing will take effect immediately for all new bookings. 
                  Existing bookings will remain at the original price point.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
