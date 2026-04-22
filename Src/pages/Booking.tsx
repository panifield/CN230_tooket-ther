import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Info, ShoppingCart, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

type Seat = {
  id: string;
  row: string;
  number: number;
  status: 'available' | 'selected' | 'occupied';
  price: number;
  zone: 'VIP' | 'PREMIUM' | 'STANDARD';
};

export default function Booking() {
  const navigate = useNavigate();
  const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
  const [queuePosition, setQueuePosition] = useState(124);
  const [isLocal, setIsLocal] = useState(true); // Mocked from login

  // Mock seats data
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const seatsPerRow = 12;
  
  const initialSeats: Seat[] = rows.flatMap((row, rowIndex) => 
    Array.from({ length: seatsPerRow }, (_, i) => {
      const zone = rowIndex < 2 ? 'VIP' : rowIndex < 5 ? 'PREMIUM' : 'STANDARD';
      const price = zone === 'VIP' ? 500 : zone === 'PREMIUM' ? 300 : 150;
      const isOccupied = Math.random() < 0.2;
      
      return {
        id: `${row}${i + 1}`,
        row,
        number: i + 1,
        status: isOccupied ? 'occupied' : 'available',
        price,
        zone,
      };
    })
  );

  const [seats, setSeats] = useState<Seat[]>(initialSeats);

  const toggleSeat = (seat: Seat) => {
    if (seat.status === 'occupied') return;

    if (selectedSeats.find(s => s.id === seat.id)) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seat.id));
    } else {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const totalPrice = selectedSeats.reduce((sum, s) => sum + s.price, 0);

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <Link to="/" className="inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-8 transition-colors">
          <ArrowLeft size={14} /> BACK TO EVENTS
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Seat Map Area */}
          <div className="lg:col-span-2">
            <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <span className="mono-label text-brand-blue mb-2 block">SELECT SEATS / ZONE A</span>
                <h1 className="text-4xl font-medium mb-4 tracking-tighter">Coastal Tech Summit 2026</h1>
                <div className="flex gap-6 text-sm text-midnight/60">
                  <span className="flex items-center gap-1"><Info size={14} /> Main Auditorium</span>
                  <span className="flex items-center gap-1">May 12, 2026 • 09:00 AM</span>
                </div>
              </div>
              
              <div className="p-4 bg-sky-tint/10 border border-sky-tint/20 rounded-sharp flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-brand-blue shadow-sm">
                  <span className="font-bold text-sm">#{queuePosition}</span>
                </div>
                <div>
                  <div className="mono-label text-[10px] text-brand-blue mb-0.5">QUEUE STATUS</div>
                  <div className="text-[10px] text-midnight/60">
                    {isLocal ? 'LOCAL PRIORITY ACTIVE' : 'STANDARD QUEUE'}
                  </div>
                </div>
              </div>
            </div>

            {/* Stage */}
            <div className="w-full h-4 bg-midnight/5 rounded-full mb-20 relative overflow-hidden">
              <div className="absolute inset-0 gradient-coastal opacity-30 blur-sm" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="mono-label text-[10px] text-midnight/40">STAGE / SCREEN</span>
              </div>
            </div>

            {/* Seats Grid */}
            <div className="flex flex-col gap-4 items-center overflow-x-auto pb-8">
              {rows.map(row => (
                <div key={row} className="flex gap-3 items-center">
                  <span className="w-6 mono-label text-midnight/30 text-center">{row}</span>
                  <div className="flex gap-2">
                    {seats.filter(s => s.row === row).map(seat => {
                      const isSelected = selectedSeats.find(s => s.id === seat.id);
                      return (
                        <button
                          key={seat.id}
                          onClick={() => toggleSeat(seat)}
                          disabled={seat.status === 'occupied'}
                          className={`
                            w-8 h-8 rounded-sharp transition-all relative group
                            ${seat.status === 'occupied' ? 'bg-midnight/5 cursor-not-allowed' : 
                              isSelected ? 'bg-brand-blue text-midnight shadow-lg scale-110' : 
                              'bg-white border border-black/10 hover:border-brand-blue'}
                          `}
                        >
                          {isSelected && <CheckCircle2 size={12} className="absolute -top-1 -right-1" />}
                          <span className="text-[10px] font-medium">{seat.number}</span>
                          
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                            <div className="bg-midnight text-white text-[10px] px-2 py-1 rounded-sharp whitespace-nowrap">
                              {seat.id} • ${seat.price} • {seat.zone}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-6 mono-label text-midnight/30 text-center">{row}</span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 border-t border-black/5 pt-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sharp bg-white border border-black/10" />
                <span className="mono-label text-[10px]">AVAILABLE</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sharp bg-brand-blue" />
                <span className="mono-label text-[10px]">SELECTED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sharp bg-midnight/5" />
                <span className="mono-label text-[10px]">OCCUPIED</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-sharp border-2 border-brand-yellow" />
                <span className="mono-label text-[10px]">VIP ZONE</span>
              </div>
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="card-coastal p-8 sticky top-32">
              <h3 className="mono-label text-brand-blue mb-6">ORDER SUMMARY</h3>
              
              {selectedSeats.length === 0 ? (
                <div className="py-12 text-center border-2 border-dashed border-black/5 rounded-card">
                  <ShoppingCart className="mx-auto text-midnight/20 mb-4" size={32} />
                  <p className="text-sm text-midnight/40">No seats selected yet</p>
                </div>
              ) : (
                <div className="space-y-4 mb-8">
                  {selectedSeats.map(seat => (
                    <div key={seat.id} className="flex justify-between items-center pb-4 border-b border-black/5">
                      <div>
                        <div className="font-medium">Seat {seat.id}</div>
                        <div className="text-[10px] mono-label text-midnight/40">{seat.zone}</div>
                      </div>
                      <div className="font-medium">${seat.price}</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-midnight/60">Subtotal</span>
                  <span>${totalPrice}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-midnight/60">Service Fee</span>
                  <span>${selectedSeats.length > 0 ? 15 : 0}</span>
                </div>
                <div className="flex justify-between text-xl font-medium pt-4 border-t border-black/10">
                  <span>Total</span>
                  <span>${totalPrice > 0 ? totalPrice + 15 : 0}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/payment')}
                disabled={selectedSeats.length === 0}
                className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PROCEED TO PAYMENT <ArrowLeft className="rotate-180" size={18} />
              </button>
              
              <p className="mt-4 text-[10px] text-midnight/40 text-center leading-relaxed">
                By proceeding, you agree to our Terms of Service and Privacy Policy. 
                Tickets are non-refundable after purchase.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
