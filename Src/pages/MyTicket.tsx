import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Ticket, Calendar, MapPin, Download, Share2, QrCode, ChevronRight, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MyTickets() {
  const [resolution, setResolution] = useState<Record<string, 'refund' | 'relocate'>>({});
  const [closedZonesFromStorage, setClosedZonesFromStorage] = useState<string[]>([]);

  React.useEffect(() => {
    const saved = localStorage.getItem('closedZones');
    if (saved) setClosedZonesFromStorage(JSON.parse(saved));
  }, []);

  const tickets = [
    {
      id: 'TKT-8291-XJ',
      event: 'Coastal Tech Summit 2026',
      date: 'MAY 12, 2026',
      time: '09:00 AM',
      location: 'MAIN AUDITORIUM, SF',
      seat: 'A12',
      zone: 'VIP',
      status: 'active',
      needsDetails: true,
    },
    {
      id: 'TKT-4412-PQ',
      event: 'Neon Nights Music Festival',
      date: 'JUNE 05, 2026',
      time: '07:00 PM',
      location: 'BAYFRONT PARK, MIAMI',
      seat: 'GA-204',
      zone: 'STANDARD',
      status: 'active',
      needsDetails: false,
    },
    {
      id: 'TKT-9921-ZZ',
      event: 'Coastal Tech Summit 2026',
      date: 'MAY 12, 2026',
      time: '09:00 AM',
      location: 'MAIN AUDITORIUM, SF',
      seat: 'C44',
      zone: 'ECONOMY',
      status: 'action_required',
      // Check if zone is closed (map 'ECONOMY' to the ID 'Z3' or name used in storage)
      zoneClosed: closedZonesFromStorage.includes('Z3') || closedZonesFromStorage.includes('ECONOMY'),
    },
  ];

  const handleResolution = (ticketId: string, choice: 'refund' | 'relocate') => {
    setResolution({ ...resolution, [ticketId]: choice });
  };

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        {/* Zone Closure Alert */}
        {tickets.filter(t => t.zoneClosed).map(ticket => (
          <motion.div 
            key={ticket.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8 p-6 bg-red-50 border border-red-200 rounded-card"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 flex-shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-medium text-red-900">Zone Closed: {ticket.zone}</h4>
                <p className="text-sm text-red-700/80">The organizer has closed this zone due to low demand. Please choose how you would like to proceed.</p>
              </div>
            </div>
            
            {!resolution[ticket.id] ? (
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => handleResolution(ticket.id, 'refund')}
                  className="btn-primary bg-red-600 text-white hover:bg-red-700 py-2 px-6 text-xs"
                >
                  FULL REFUND
                </button>
                <button 
                  onClick={() => handleResolution(ticket.id, 'relocate')}
                  className="btn-secondary border-red-200 text-red-600 hover:bg-red-50 py-2 px-6 text-xs"
                >
                  RELOCATE TO DIFFERENT ZONE
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                <CheckCircle size={18} />
                Request submitted: {resolution[ticket.id] === 'refund' ? 'Full Refund' : 'Zone Relocation'}
              </div>
            )}
          </motion.div>
        ))}
        {/* Post-Purchase Notification */}
        {tickets.some(t => t.needsDetails) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-6 bg-brand-yellow/5 border border-brand-yellow/20 rounded-card flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-yellow/10 rounded-full flex items-center justify-center text-brand-yellow">
                <Info size={24} />
              </div>
              <div>
                <h4 className="font-medium">Complete Your Ticket Details</h4>
                <p className="text-sm text-midnight/60">Please provide shipment info for your physical tickets within 7 days.</p>
              </div>
            </div>
            <Link to="/post-purchase" className="btn-primary bg-brand-yellow text-midnight hover:bg-brand-yellow/80 py-2 px-6 text-xs">
              COMPLETE NOW
            </Link>
          </motion.div>
        )}

        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="mono-label text-brand-blue mb-2 block">USER / ASSETS</span>
            <h1 className="text-4xl font-medium tracking-tighter">My Tickets</h1>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-black/10 rounded-sharp mono-label text-[10px] hover:bg-sky-tint transition-colors">ACTIVE (2)</button>
            <button className="px-4 py-2 border border-black/10 rounded-sharp mono-label text-[10px] text-midnight/40 hover:bg-sky-tint transition-colors">PAST</button>
          </div>
        </div>

        <div className="space-y-8">
          {tickets.map((ticket, i) => (
            <motion.div
              key={ticket.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card-coastal overflow-hidden flex flex-col md:flex-row"
            >
              {/* Ticket Left Side */}
              <div className="flex-grow p-8 border-b md:border-b-0 md:border-r border-dashed border-black/10 relative">
                {/* Perforation circles */}
                <div className="hidden md:block absolute -top-3 -right-3 w-6 h-6 bg-white border border-black/10 rounded-full" />
                <div className="hidden md:block absolute -bottom-3 -right-3 w-6 h-6 bg-white border border-black/10 rounded-full" />
                
                <div className="flex justify-between items-start mb-8">
                  <div className="inline-flex items-center gap-2 px-2 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-sharp">
                    <div className="w-1.5 h-1.5 bg-brand-blue rounded-full" />
                    <span className="mono-label text-[9px] text-brand-blue">VALID TICKET</span>
                  </div>
                  <span className="mono-label text-[10px] text-midnight/30">{ticket.id}</span>
                </div>

                <h2 className="text-2xl font-medium mb-6">{ticket.event}</h2>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                    <span className="mono-label text-[9px] text-midnight/40">DATE & TIME</span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Calendar size={14} className="text-brand-blue" />
                      {ticket.date} • {ticket.time}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="mono-label text-[9px] text-midnight/40">LOCATION</span>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <MapPin size={14} className="text-brand-blue" />
                      {ticket.location}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="mono-label text-[9px] text-midnight/40">SEAT</span>
                    <div className="text-xl font-medium">{ticket.seat}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="mono-label text-[9px] text-midnight/40">ZONE</span>
                    <div className="text-xl font-medium">{ticket.zone}</div>
                  </div>
                </div>
              </div>

              {/* Ticket Right Side (QR) */}
              <div className="w-full md:w-64 bg-cream-base/10 p-8 flex flex-col items-center justify-center gap-6">
                <div className="w-32 h-32 bg-white p-2 border border-black/5 rounded-card shadow-sm">
                  <div className="w-full h-full bg-midnight/5 flex items-center justify-center relative overflow-hidden">
                    <QrCode size={80} className="text-midnight/80" />
                    <div className="absolute inset-0 gradient-coastal opacity-10" />
                  </div>
                </div>
                
                <div className="flex gap-3 w-full">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-black/10 rounded-sharp mono-label text-[9px] hover:bg-white transition-colors">
                    <Download size={12} /> PDF
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 border border-black/10 rounded-sharp mono-label text-[9px] hover:bg-white transition-colors">
                    <Share2 size={12} /> SHARE
                  </button>
                </div>

                <Link to="/checker" className="text-[9px] mono-label text-brand-blue hover:underline flex items-center gap-1">
                  PREVIEW SCANNER <ChevronRight size={10} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-16 p-8 bg-midnight text-white rounded-card flex items-center justify-between">
          <div>
            <h3 className="text-xl font-medium mb-2">Need help with your tickets?</h3>
            <p className="text-white/60 text-sm">Our support team is available 24/7 for any inquiries.</p>
          </div>
          <button className="btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/20">
            CONTACT SUPPORT
          </button>
        </div>
      </div>
    </div>
  );
}
