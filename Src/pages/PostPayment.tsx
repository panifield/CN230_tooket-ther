import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Truck, Package, CheckCircle, Info, MapPin, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function PostPurchase() {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'shipment' | 'venue'>('shipment');
  const [friends, setFriends] = useState([{ name: '', userId: '' }]);

  const addFriend = () => setFriends([...friends, { name: '', userId: '' }]);
  const removeFriend = (index: number) => setFriends(friends.filter((_, i) => i !== index));

  const handleFriendChange = (index: number, field: 'name' | 'userId', value: string) => {
    const newFriends = [...friends];
    newFriends[index][field] = value;
    setFriends(newFriends);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => navigate('/my-tickets'), 2000);
  };

  if (isSubmitted) {
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
          <h1 className="text-4xl font-medium mb-4 tracking-tighter">Details Saved</h1>
          <p className="text-midnight/60 mb-10 leading-relaxed">
            Your delivery preferences and attendee details have been updated. 
            You will receive a notification once your tickets are ready.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-6">
        <Link to="/my-tickets" className="inline-flex items-center gap-2 mono-label text-midnight/60 hover:text-brand-blue mb-8 transition-colors">
          <ArrowLeft size={14} /> BACK TO TICKETS
        </Link>

        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/10 border border-brand-yellow/20 rounded-sharp mb-4">
            <Info size={16} className="text-brand-yellow" />
            <span className="mono-label text-brand-yellow text-[10px]">ACTION REQUIRED / 7 DAYS REMAINING</span>
          </div>
          <h1 className="text-4xl font-medium tracking-tighter mb-4">Attendee & Delivery Details</h1>
          <p className="text-midnight/60 leading-relaxed">
            Please provide details for all attendees and choose your preferred delivery method. 
            This must be completed within 7 days of purchase.
          </p>
        </div>

        <div className="card-coastal p-8">
          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Delivery Method */}
            <div>
              <span className="mono-label text-[10px] text-midnight/40 mb-4 block">DELIVERY METHOD</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('shipment')}
                  className={`p-4 border-2 rounded-sharp text-left transition-all ${
                    deliveryMethod === 'shipment' ? 'border-brand-blue bg-brand-blue/5' : 'border-black/5 hover:border-brand-blue/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Truck size={20} className={deliveryMethod === 'shipment' ? 'text-brand-blue' : 'text-midnight/40'} />
                    <span className="font-medium text-sm">Home Shipment</span>
                  </div>
                  <p className="text-[10px] text-midnight/60">Commemorative physical tickets sent to your address.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('venue')}
                  className={`p-4 border-2 rounded-sharp text-left transition-all ${
                    deliveryMethod === 'venue' ? 'border-brand-blue bg-brand-blue/5' : 'border-black/5 hover:border-brand-blue/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin size={20} className={deliveryMethod === 'venue' ? 'text-brand-blue' : 'text-midnight/40'} />
                    <span className="font-medium text-sm">Venue Pickup</span>
                  </div>
                  <p className="text-[10px] text-midnight/60">Collect your physical tickets at the concert entrance.</p>
                </button>
              </div>
            </div>

            {/* Attendee Details */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="mono-label text-[10px] text-midnight/40">ATTENDEE DETAILS (FRIENDS)</span>
                <button 
                  type="button" 
                  onClick={addFriend}
                  className="text-[10px] mono-label text-brand-blue hover:underline flex items-center gap-1"
                >
                  <Plus size={12} /> ADD ANOTHER
                </button>
              </div>
              <div className="space-y-6">
                {friends.map((friend, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-midnight/5 rounded-sharp relative">
                    {index > 0 && (
                      <button 
                        type="button" 
                        onClick={() => removeFriend(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-black/10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50"
                      >
                        <Plus size={14} className="rotate-45" />
                      </button>
                    )}
                    <div className="space-y-2">
                      <label className="text-[9px] mono-label text-midnight/40">FULL NAME</label>
                      <input
                        type="text"
                        required
                        value={friend.name}
                        onChange={(e) => handleFriendChange(index, 'name', e.target.value)}
                        placeholder="FRIEND'S NAME"
                        className="w-full bg-white border border-black/10 rounded-sharp px-3 py-2 text-xs focus:border-brand-blue outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] mono-label text-midnight/40">USER ID</label>
                      <input
                        type="text"
                        required
                        value={friend.userId}
                        onChange={(e) => handleFriendChange(index, 'userId', e.target.value)}
                        placeholder="COASTAL ID"
                        className="w-full bg-white border border-black/10 rounded-sharp px-3 py-2 text-xs focus:border-brand-blue outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {deliveryMethod === 'shipment' && (
              <div className="space-y-6 pt-6 border-t border-black/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="mono-label text-[10px] text-midnight/40">FULL LEGAL NAME</label>
                    <input
                      type="text"
                      required
                      placeholder="AS IT APPEARS ON ID"
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="mono-label text-[10px] text-midnight/40">CONTACT NUMBER</label>
                    <input
                      type="tel"
                      required
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="mono-label text-[10px] text-midnight/40">SHIPPING ADDRESS</label>
                  <input
                    type="text"
                    required
                    placeholder="STREET ADDRESS, APARTMENT, SUITE"
                    className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="mono-label text-[10px] text-midnight/40">CITY</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="mono-label text-[10px] text-midnight/40">STATE / PROVINCE</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="mono-label text-[10px] text-midnight/40">POSTAL CODE</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white border border-black/10 rounded-sharp px-4 py-3 text-sm focus:border-brand-blue outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-8 border-t border-black/5 flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="flex items-center gap-3 text-midnight/40">
                {deliveryMethod === 'shipment' ? <Truck size={20} /> : <MapPin size={20} />}
                <span className="text-[10px] mono-label">
                  {deliveryMethod === 'shipment' ? 'STANDARD SHIPPING (3-5 BUSINESS DAYS)' : 'PICKUP AT VENUE BOX OFFICE'}
                </span>
              </div>
              <button type="submit" className="w-full md:w-auto btn-primary flex items-center gap-2">
                SAVE DETAILS <Package size={18} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
