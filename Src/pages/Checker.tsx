import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanLine, CheckCircle, XCircle, Search, ShieldCheck, History, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Checker() {
  const [ticketId, setTicketId] = useState('');
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId) return;

    setIsScanning(true);
    // Simulate API call
    setTimeout(() => {
      setIsScanning(false);
      // Mock validation: IDs starting with 'TKT' are valid
      if (ticketId.toUpperCase().startsWith('TKT')) {
        setScanResult('success');
      } else {
        setScanResult('error');
      }
    }, 1500);
  };

  const resetScanner = () => {
    setScanResult(null);
    setTicketId('');
  };

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="mono-label text-brand-blue mb-2 block">TERMINAL / VERIFICATION</span>
          <h1 className="text-4xl font-medium tracking-tighter">Ticket Scanner</h1>
        </div>

        <div className="card-coastal overflow-hidden relative">
          <AnimatePresence mode="wait">
            {!scanResult ? (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8"
              >
                {/* Simulated Camera View */}
                <div className="aspect-square bg-midnight rounded-card mb-8 relative overflow-hidden group">
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-tint via-transparent to-transparent" />
                  </div>
                  
                  {/* Scanning Line */}
                  <motion.div 
                    animate={{ top: ['0%', '100%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-brand-blue shadow-[0_0_15px_rgba(170,214,250,0.8)] z-10"
                  />

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/20 rounded-card relative">
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-brand-blue" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-brand-blue" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-brand-blue" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-brand-blue" />
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                    <span className="mono-label text-[10px] text-white/40">ALIGN QR CODE WITHIN FRAME</span>
                  </div>
                </div>

                <form onSubmit={handleScan} className="space-y-6">
                  <div className="relative">
                    <input
                      type="text"
                      value={ticketId}
                      onChange={(e) => setTicketId(e.target.value)}
                      placeholder="ENTER TICKET ID MANUALLY"
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-4 text-sm font-mono focus:border-brand-blue outline-none transition-colors pr-12"
                    />
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-midnight/20" size={18} />
                  </div>

                  <button
                    type="submit"
                    disabled={isScanning || !ticketId}
                    className="w-full btn-primary py-4 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isScanning ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ScanLine size={20} />
                        VERIFY TICKET
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-12 text-center ${scanResult === 'success' ? 'bg-green-50/30' : 'bg-red-50/30'}`}
              >
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${
                  scanResult === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  {scanResult === 'success' ? <CheckCircle size={48} /> : <XCircle size={48} />}
                </div>

                <h2 className="text-3xl font-medium mb-4 tracking-tighter">
                  {scanResult === 'success' ? 'Access Granted' : 'Access Denied'}
                </h2>
                
                <div className="card-coastal bg-white p-6 mb-10 text-left">
                  <div className="flex justify-between items-center mb-4">
                    <span className="mono-label text-[10px] text-midnight/40">TICKET DATA</span>
                    <span className="mono-label text-[10px] text-midnight/40">{ticketId}</span>
                  </div>
                  {scanResult === 'success' ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-midnight/60">Event</span>
                        <span className="font-medium">Coastal Tech Summit</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-midnight/60">Seat</span>
                        <span className="font-medium text-brand-blue">A12 (VIP)</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-midnight/60">Status</span>
                        <span className="text-green-600 font-medium">VALID</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-red-600">
                      This ticket ID could not be found in our database or has already been scanned.
                    </p>
                  )}
                </div>

                <button
                  onClick={resetScanner}
                  className="w-full btn-primary"
                >
                  SCAN NEXT TICKET
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Recent Scans */}
        <div className="mt-12">
          <div className="flex items-center gap-2 mb-6 text-midnight/40">
            <History size={16} />
            <span className="mono-label text-[10px]">RECENT ACTIVITY</span>
          </div>
          <div className="space-y-3">
            {[
              { id: 'TKT-8291-XJ', time: '2m ago', status: 'success' },
              { id: 'TKT-4412-PQ', time: '5m ago', status: 'success' },
              { id: 'INVALID-ID', time: '12m ago', status: 'error' },
            ].map((scan, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white border border-black/5 rounded-sharp">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${scan.status === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="mono-label text-[11px]">{scan.id}</span>
                </div>
                <span className="text-[10px] text-midnight/30">{scan.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
