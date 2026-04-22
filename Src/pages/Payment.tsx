import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ShieldCheck, CreditCard, Wallet, Landmark, CheckCircle, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Payment() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    if (timeLeft <= 0 || isSuccess) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isSuccess]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center px-6"
        >
          <div className="w-20 h-20 gradient-coastal rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl">
            <CheckCircle className="text-midnight" size={40} />
          </div>
          <h1 className="text-4xl font-medium mb-4 tracking-tighter">Payment Successful</h1>
          <p className="text-midnight/60 mb-10 leading-relaxed">
            Your tickets have been secured and added to your account. 
            A confirmation email has been sent to your registered address.
          </p>
          <div className="space-y-4">
            <Link to="/my-tickets" className="w-full btn-primary block">
              VIEW MY TICKETS
            </Link>
            <Link to="/" className="w-full btn-secondary block">
              RETURN HOME
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Payment Form */}
          <div className="lg:col-span-3">
            <Link to="/booking" className="inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-8 transition-colors">
              <ArrowLeft size={14} /> BACK TO SEAT SELECTION
            </Link>

            <div className="flex justify-between items-end mb-12">
              <h1 className="text-4xl font-medium">Secure Checkout</h1>
              <div className={`px-4 py-2 rounded-sharp border flex items-center gap-3 ${
                timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-sky-tint/10 border-sky-tint/20 text-brand-blue'
              }`}>
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                <span className="mono-label text-[10px]">TIME REMAINING: {formatTime(timeLeft)}</span>
              </div>
            </div>

            {timeLeft <= 0 && !isSuccess ? (
              <div className="card-coastal p-12 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Plus size={32} className="rotate-45" />
                </div>
                <h2 className="text-2xl font-medium mb-4">Session Expired</h2>
                <p className="text-midnight/60 mb-8">Your reservation has timed out. Please return to the booking page to select your seats again.</p>
                <Link to="/booking" className="btn-primary inline-block">RESTART BOOKING</Link>
              </div>
            ) : (
              <div className="space-y-8">
              {/* QR Payment Method */}
              <div className="space-y-8">
                <div>
                  <span className="mono-label text-brand-blue mb-4 block">PAYMENT METHOD: QR CODE</span>
                  <div className="card-coastal p-12 flex flex-col items-center justify-center gap-8 bg-white border-2 border-brand-blue">
                    <div className="w-64 h-64 bg-white p-4 border border-black/5 rounded-card shadow-lg relative overflow-hidden flex items-center justify-center">
                      <motion.div 
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                        className="w-full h-full bg-midnight/5 flex items-center justify-center"
                      >
                        <Wallet size={120} className="text-midnight/20" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                          <div className="w-48 h-48 bg-midnight/80 p-2 rounded-sharp flex items-center justify-center">
                             {/* Simulated QR Code with CSS */}
                             <div className="w-full h-full bg-white relative p-1 grid grid-cols-4 grid-rows-4 gap-1 opacity-90">
                               {Array.from({ length: 16 }).map((_, i) => (
                                 <div key={i} className={`rounded-sm ${Math.random() > 0.4 ? 'bg-midnight' : 'bg-transparent'}`} />
                               ))}
                             </div>
                          </div>
                        </div>
                      </motion.div>
                      {/* Scanning line effect */}
                      <motion.div 
                        animate={{ top: ['10%', '90%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                        className="absolute left-4 right-4 h-0.5 bg-brand-blue/50 z-10"
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <h3 className="font-medium">Scan to Pay</h3>
                      <p className="text-xs text-midnight/60">Open your banking or payment app to scan this QR code.</p>
                      <div className="inline-block px-3 py-1 bg-sky-tint/20 text-brand-blue font-mono text-sm font-bold rounded-sharp mt-2">
                        $515.00
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <button
                    onClick={handlePayment}
                    disabled={isProcessing}
                    className="w-full btn-primary py-4 flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck size={20} />
                        I HAVE PAID • VERIFY TRANSACTION
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-midnight/40 mt-4 italic">
                    Transaction will be automatically verified once payment is detected on the blockchain / gateway.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-2">
            <div className="card-coastal p-8 bg-cream-base/20 border-none sticky top-32">
              <h3 className="mono-label text-brand-blue mb-8">ORDER DETAILS</h3>
              
              <div className="space-y-6 mb-12">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-white rounded-sharp border border-black/5 overflow-hidden flex-shrink-0">
                    <img src="https://picsum.photos/seed/tech/100/100" alt="Event" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="font-medium text-sm">Coastal Tech Summit 2026</h4>
                    <p className="text-[10px] text-midnight/60 mt-1">MAY 12, 2026 • MAIN AUDITORIUM</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-midnight/60">Seat A12 (VIP)</span>
                    <span>$500.00</span>
                  </div>
                  <div className="flex justify-between text-xs font-medium pt-3 border-t border-black/5">
                    <span>Total Amount</span>
                    <span className="text-lg">$515.00</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white/50 rounded-sharp border border-black/5 flex gap-4 items-start">
                <ShieldCheck className="text-brand-blue flex-shrink-0" size={18} />
                <p className="text-[10px] text-midnight/60 leading-relaxed">
                  Your transaction is protected by 256-bit SSL encryption. 
                  We do not store your full card details on our servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
