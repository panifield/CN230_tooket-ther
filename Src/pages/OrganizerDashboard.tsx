import { motion } from 'motion/react';
import { TrendingUp, Users, Ticket, DollarSign, ArrowUpRight, ArrowDownRight, MoreHorizontal, Plus, AlertTriangle, Info, UserCheck, UserX, Clock, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function OrganizerDashboard() {
  const [emptySeatPercentage, setEmptySeatPercentage] = useState(0);
  const [showNotification, setShowNotification] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'daily' | 'event' | 'all'>('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [closedZones, setClosedZones] = useState<string[]>([]);
  const [showZoneCloseModal, setShowZoneCloseModal] = useState<string | null>(null);
  const [eventSearchTerm, setEventSearchTerm] = useState('');
  const [eventStatusFilter, setEventStatusFilter] = useState<'ALL' | 'ON SALE' | 'DRAFT'>('ALL');

  const recentEvents = [
    { id: 'E1', name: 'Coastal Tech Summit 2026', status: 'ON SALE', sold: '842/1000', revenue: '$242,000', tickets: 842, available: 158 },
    { id: 'E2', name: 'Neon Nights Festival', status: 'ON SALE', sold: '4,201/5000', revenue: '$582,100', tickets: 4201, available: 799 },
    { id: 'E3', name: 'Design Conf 2026', status: 'DRAFT', sold: '0/500', revenue: '$0', tickets: 0, available: 500 },
  ];

  // Manual Queue State
  const [queueUsers, setQueueUsers] = useState([
    { id: '1', name: 'Alex Johnson', domicile: 'San Francisco, CA', isLocal: true, status: 'pending', enteredAt: new Date(Date.now() - 1000 * 60 * 5) },
    { id: '2', name: 'Sarah Miller', domicile: 'Oakland, CA', isLocal: true, status: 'pending', enteredAt: new Date(Date.now() - 1000 * 60 * 12) },
    { id: '3', name: 'Michael Chen', domicile: 'London, UK', isLocal: false, status: 'pending', enteredAt: new Date(Date.now() - 1000 * 60 * 18) },
    { id: '4', name: 'Emma Davis', domicile: 'San Jose, CA', isLocal: true, status: 'pending', enteredAt: new Date(Date.now() - 1000 * 60 * 22) },
    { id: '5', name: 'James Wilson', domicile: 'New York, NY', isLocal: false, status: 'pending', enteredAt: new Date(Date.now() - 1000 * 60 * 2) },
  ]);

  const handleAcceptUser = (userId: string) => {
    setQueueUsers(queueUsers.map(u => u.id === userId ? { ...u, status: 'accepted' } : u));
    // In a real app, this would update the backend
    localStorage.setItem('userQueueStatus', 'accepted');
    console.log(`User ${userId} accepted from queue.`);
  };

  const handleDeclineUser = (userId: string) => {
    setQueueUsers(queueUsers.filter(u => u.id !== userId));
  };

  const formatDistanceToNow = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    return `${mins}m ago`;
  };

  const formatExactTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Sorting: Earliest entered first (fastest arrival)
  const sortQueue = (users: typeof queueUsers) => 
    [...users].sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

  const localQueue = sortQueue(queueUsers.filter(u => u.isLocal && u.status === 'pending'));
  const regionalQueue = sortQueue(queueUsers.filter(u => !u.isLocal && u.status === 'pending'));

  const [zoneStats, setZoneStats] = useState([
    { id: 'Z1', name: 'VIP FRONT', available: 42, total: 120, price: 500, threshold: 20 },
    { id: 'Z2', name: 'PREMIUM MID', available: 156, total: 350, price: 300, threshold: 50 },
    { id: 'Z3', name: 'STANDARD REAR', available: 512, total: 800, price: 150, threshold: 100 },
  ]);

  const currentEvent = recentEvents.find(e => e.id === selectedEventId);

  const totalAvailable = zoneStats.reduce((acc, zone) => acc + zone.available, 0);
  const totalCapacity = zoneStats.reduce((acc, zone) => acc + zone.total, 0);
  
  useEffect(() => {
    const percentage = (totalAvailable / totalCapacity) * 100;
    setEmptySeatPercentage(percentage);
    if (percentage > 50) {
      setShowNotification(true);
    }
  }, [totalAvailable, totalCapacity]);

  const handleCloseZone = (zoneId: string) => {
    const updatedClosedZones = [...closedZones, zoneId];
    setClosedZones(updatedClosedZones);
    localStorage.setItem('closedZones', JSON.stringify(updatedClosedZones));
    setShowZoneCloseModal(null);
    // In a real app, this would trigger notifications to users
    alert(`Zone ${zoneId} closed. Users notified for refund or relocation.`);
  };

  useEffect(() => {
    const saved = localStorage.getItem('closedZones');
    if (saved) setClosedZones(JSON.parse(saved));
  }, []);

  const metrics = [
    { 
      label: 'TOTAL REVENUE', 
      value: paymentFilter === 'daily' ? '$12,400' : (paymentFilter === 'event' && currentEvent) ? currentEvent.revenue : '$842,910', 
      change: '+12.5%', 
      trend: 'up' 
    },
    { 
      label: 'TICKETS SOLD', 
      value: (paymentFilter === 'event' && currentEvent) ? currentEvent.tickets.toLocaleString() : '12,402', 
      change: '+8.2%', 
      trend: 'up' 
    },
    { 
      label: 'EMPTY SEATS', 
      value: (paymentFilter === 'event' && currentEvent) ? `${((currentEvent.available / (currentEvent.tickets + currentEvent.available)) * 100).toFixed(1)}%` : `${emptySeatPercentage.toFixed(1)}%`, 
      change: (paymentFilter === 'event' && currentEvent) ? currentEvent.available.toString() : totalAvailable.toString(), 
      trend: emptySeatPercentage > 50 ? 'down' : 'up' 
    },
    { label: 'AVG. TICKET PRICE', value: '$67.90', change: '+2.1%', trend: 'up' },
  ];

  return (
    <div className="bg-white min-h-screen pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div>
            <span className="mono-label text-brand-blue mb-2 block">PORTAL / ORGANIZER</span>
            <h1 className="text-4xl font-medium tracking-tighter">Performance Dashboard</h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex gap-2 bg-cream-base/20 p-1 rounded-sharp border border-black/5">
                {(['daily', 'event', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => {
                      setPaymentFilter(filter);
                      if (filter !== 'event') setSelectedEventId(null);
                    }}
                    className={`px-4 py-1.5 rounded-sharp mono-label text-[10px] transition-all ${
                      paymentFilter === filter ? 'bg-white shadow-sm text-brand-blue' : 'text-midnight/40 hover:text-midnight'
                    }`}
                  >
                    {filter.toUpperCase()}
                  </button>
                ))}
              </div>

              {paymentFilter === 'event' && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative"
                >
                  <select 
                    value={selectedEventId || ''}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="appearance-none bg-white border border-black/10 rounded-sharp px-4 py-2 pr-10 mono-label text-[10px] focus:border-brand-blue outline-none transition-colors cursor-pointer"
                  >
                    <option value="" disabled>SELECT EVENT</option>
                    {recentEvents.map(event => (
                      <option key={event.id} value={event.id}>{event.name.toUpperCase()}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-midnight/20">
                     <ArrowDownRight size={12} className="rotate-45" />
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="flex gap-4">
              <Link to="/organizer/create-concert" className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-2">
                <Plus size={14} /> CREATE CONCERT
              </Link>
              <Link to="/organizer/zones" className="btn-secondary py-2 px-4 text-xs">MANAGE ZONES</Link>
            </div>
          </div>
        </div>

        {/* Manual Queue Management */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Users className="text-brand-blue" size={20} />
              <h3 className="mono-label text-brand-blue font-bold">REAL-TIME QUEUE / MANUAL ADMISSION</h3>
            </div>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                <span className="text-[10px] mono-label text-midnight/40">LIVE MONITORING</span>
              </div>
              <span className="text-[10px] mono-label text-midnight/60 px-2 py-1 bg-midnight/5 rounded-sharp">
                {queueUsers.filter(u => u.status === 'pending').length} TOTAL WAITING
              </span>
            </div>
          </div>
          
          <div className="space-y-12">
            {/* Local Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="h-0.5 w-4 bg-brand-blue rounded-full" />
                 <span className="mono-label text-[10px] text-brand-blue tracking-widest uppercase">Local Entrants (Priority Queue)</span>
              </div>
              <div className="card-coastal overflow-hidden p-0">
                <table className="w-full text-left">
                  <thead className="bg-midnight/5">
                    <tr>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40 min-w-[200px]">NAME / DOMICILE</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40">WAITING SINCE</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40">ENTRY TIME</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40 text-right">ADMISSION ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {localQueue.map((user) => (
                      <motion.tr 
                        key={user.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-brand-blue/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-sharp flex items-center justify-center text-brand-blue font-bold text-lg uppercase border border-brand-blue/10">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-[10px] text-midnight/40 uppercase">{user.domicile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-brand-blue flex items-center gap-1 font-bold">
                             <Clock size={12} /> {formatDistanceToNow(user.enteredAt)}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-midnight/40 tabular-nums uppercase">{formatExactTime(user.enteredAt)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleAcceptUser(user.id)}
                              className="p-2.5 bg-brand-blue text-white rounded-sharp hover:scale-110 transition-transform shadow-md"
                              title="Accept Entry"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeclineUser(user.id)}
                              className="p-2.5 bg-white text-red-400 border border-red-100 rounded-sharp hover:bg-red-50 transition-colors"
                              title="Decline Entry"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {localQueue.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <span className="mono-label text-[10px] text-midnight/20">NO LOCAL USERS IN QUEUE</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regional Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                 <div className="h-0.5 w-4 bg-midnight/20 rounded-full" />
                 <span className="mono-label text-[10px] text-midnight/40 tracking-widest uppercase">Regional & International Entrants</span>
              </div>
              <div className="card-coastal overflow-hidden p-0">
                <table className="w-full text-left">
                  <thead className="bg-midnight/5">
                    <tr>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40 min-w-[200px]">NAME / DOMICILE</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40">WAITING SINCE</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40">ENTRY TIME</th>
                      <th className="px-6 py-4 mono-label text-[10px] text-midnight/40 text-right">ADMISSION ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {regionalQueue.map((user) => (
                      <motion.tr 
                        key={user.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="group hover:bg-midnight/5 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-midnight/5 rounded-sharp flex items-center justify-center text-midnight/40 font-bold text-lg uppercase">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-sm">{user.name}</div>
                              <div className="text-[10px] text-midnight/40 uppercase">{user.domicile}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-midnight/60 flex items-center gap-1">
                             <Clock size={12} /> {formatDistanceToNow(user.enteredAt)}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] text-midnight/40 tabular-nums uppercase">{formatExactTime(user.enteredAt)}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleAcceptUser(user.id)}
                              className="p-2.5 bg-midnight text-white rounded-sharp hover:scale-110 transition-transform shadow-md"
                              title="Accept Entry"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeclineUser(user.id)}
                              className="p-2.5 bg-white text-red-300 border border-black/5 rounded-sharp hover:bg-red-50 transition-colors"
                              title="Decline Entry"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                    {regionalQueue.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                           <span className="mono-label text-[10px] text-midnight/20">NO REGIONAL USERS IN QUEUE</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-card flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" size={20} />
              <div>
                <p className="text-sm font-medium text-red-800">High Empty Seat Percentage Detected</p>
                <p className="text-xs text-red-600">Currently {emptySeatPercentage.toFixed(1)}% of seats are available. Consider launching a promotion.</p>
              </div>
            </div>
            <button onClick={() => setShowNotification(false)} className="text-red-400 hover:text-red-600">
              <Plus size={18} className="rotate-45" />
            </button>
          </motion.div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card-coastal p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="mono-label text-[10px] text-midnight/40">{metric.label}</span>
                <div className={`flex items-center gap-1 text-[10px] font-medium ${
                  metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.trend === 'up' ? <ArrowUpRight size={12} /> : <AlertTriangle size={12} />}
                  {metric.change}
                </div>
              </div>
              <div className="text-3xl font-medium">{metric.value}</div>
            </motion.div>
          ))}
        </div>

        {/* Zone Availability Table */}
        <div className="mb-12 card-coastal p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="mono-label text-brand-blue">ZONE AVAILABILITY</h3>
            <div className="flex items-center gap-2 text-[10px] mono-label text-midnight/40">
              <Info size={12} /> REAL-TIME SEAT DATA
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left py-4 mono-label text-[10px] text-midnight/40">ZONE NAME</th>
                  <th className="text-left py-4 mono-label text-[10px] text-midnight/40">AVAILABLE</th>
                  <th className="text-left py-4 mono-label text-[10px] text-midnight/40">TOTAL</th>
                  <th className="text-left py-4 mono-label text-[10px] text-midnight/40">OCCUPANCY</th>
                  <th className="text-left py-4 mono-label text-[10px] text-midnight/40">STATUS</th>
                  <th className="text-right py-4 mono-label text-[10px] text-midnight/40">ACTION</th>
                </tr>
              </thead>
              <tbody>
                {zoneStats.map((zone) => {
                  const occupancy = ((zone.total - zone.available) / zone.total) * 100;
                  const isClosed = closedZones.includes(zone.id);
                  const belowThreshold = zone.available > (zone.total * 0.8);

                  return (
                    <tr key={zone.id} className={`border-b border-black/5 last:border-0 ${isClosed ? 'opacity-50' : ''}`}>
                      <td className="py-4 font-medium text-sm">{zone.name}</td>
                      <td className="py-4 text-sm">{zone.available}</td>
                      <td className="py-4 text-sm">{zone.total}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-grow h-1.5 bg-midnight/5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${occupancy > 80 ? 'bg-green-500' : occupancy > 40 ? 'bg-brand-yellow' : 'bg-red-500'}`}
                              style={{ width: `${occupancy}%` }}
                            />
                          </div>
                          <span className="text-[10px] mono-label text-midnight/60">
                            {occupancy.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        {isClosed ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold rounded-sharp mono-label">CLOSED</span>
                        ) : belowThreshold ? (
                          <span className="px-2 py-0.5 bg-brand-yellow/20 text-brand-yellow text-[9px] font-bold rounded-sharp mono-label">LOW DEMAND</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-green-100 text-green-600 text-[9px] font-bold rounded-sharp mono-label">OPTIMAL</span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        {!isClosed && belowThreshold && (
                          <button 
                            onClick={() => setShowZoneCloseModal(zone.id)}
                            className="text-[10px] mono-label text-red-500 hover:underline"
                          >
                            CLOSE ZONE
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Zone Close Confirmation Modal */}
        {showZoneCloseModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-midnight/40 backdrop-blur-sm" onClick={() => setShowZoneCloseModal(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full max-w-md card-coastal bg-white p-8 shadow-2xl"
            >
              <h3 className="text-xl font-medium mb-4">Close Zone & Notify Users?</h3>
              <p className="text-sm text-midnight/60 mb-8 leading-relaxed">
                This zone is below the performance threshold. Closing it will notify all ticket holders to choose between a <strong>Full Refund</strong> or <strong>Relocation</strong> to a different zone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleCloseZone(showZoneCloseModal)}
                  className="flex-1 btn-primary bg-red-500 hover:bg-red-600"
                >
                  CONFIRM CLOSE
                </button>
                <button 
                  onClick={() => setShowZoneCloseModal(null)}
                  className="flex-1 btn-secondary"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue Chart Placeholder */}
          <div className="lg:col-span-2 card-coastal p-8">
            <div className="flex justify-between items-center mb-8">
              <h3 className="mono-label text-brand-blue">REVENUE OVER TIME</h3>
              <select className="bg-transparent border-none mono-label text-[10px] outline-none cursor-pointer">
                <option>LAST 30 DAYS</option>
                <option>LAST 90 DAYS</option>
              </select>
            </div>
            
            <div className="h-64 flex items-end gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.random() * 80 + 20}%` }}
                  transition={{ delay: i * 0.02, duration: 0.8 }}
                  className="flex-1 bg-brand-blue/20 hover:bg-brand-blue transition-colors rounded-t-sm relative group"
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-midnight text-white text-[10px] px-2 py-1 rounded-sharp whitespace-nowrap">
                      Day {i + 1}: ${Math.floor(Math.random() * 5000)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="flex justify-between mt-4 mono-label text-[9px] text-midnight/20">
              <span>APR 01</span>
              <span>APR 14</span>
              <span>APR 30</span>
            </div>
          </div>

          {/* Recent Events List */}
          <div className="lg:col-span-1 card-coastal p-8">
            <h3 className="mono-label text-brand-blue mb-6">ACTIVE EVENTS</h3>
            
            {/* Search and Status Filter */}
            <div className="space-y-4 mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="SEARCH EVENTS..."
                  value={eventSearchTerm}
                  onChange={(e) => setEventSearchTerm(e.target.value)}
                  className="w-full bg-midnight/5 border border-black/5 rounded-sharp px-4 py-2.5 pl-10 mono-label text-[10px] outline-none focus:border-brand-blue/30 transition-colors"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-midnight/20" />
              </div>
              <div className="relative">
                <select
                  value={eventStatusFilter}
                  onChange={(e) => setEventStatusFilter(e.target.value as any)}
                  className="w-full appearance-none bg-midnight/5 border border-black/5 rounded-sharp px-4 py-2.5 pl-10 mono-label text-[10px] outline-none focus:border-brand-blue/30 transition-colors cursor-pointer"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="ON SALE">ON SALE</option>
                  <option value="DRAFT">DRAFT</option>
                </select>
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-midnight/20" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-midnight/20">
                  <ArrowDownRight size={10} className="rotate-45" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {recentEvents
                .filter(event => {
                  const matchesSearch = event.name.toLowerCase().includes(eventSearchTerm.toLowerCase());
                  const matchesStatus = eventStatusFilter === 'ALL' || event.status === eventStatusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map((event) => (
                  <div 
                    key={event.id} 
                    className={`pb-6 border-b border-black/5 last:border-0 last:pb-0 cursor-pointer group ${selectedEventId === event.id ? 'bg-sky-tint/5 rounded-sharp -mx-4 px-4 pt-4' : ''}`}
                    onClick={() => {
                      setPaymentFilter('event');
                      setSelectedEventId(event.id);
                    }}
                  >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className={`text-sm font-medium transition-colors ${selectedEventId === event.id ? 'text-brand-blue' : 'group-hover:text-brand-blue'}`}>{event.name}</h4>
                    <button className="text-midnight/30 hover:text-midnight"><MoreHorizontal size={14} /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className={`text-[9px] px-2 py-0.5 rounded-sharp mono-label ${
                      event.status === 'ON SALE' ? 'bg-green-100 text-green-700' : 'bg-midnight/5 text-midnight/40'
                    }`}>
                      {event.status}
                    </div>
                    <div className="text-[10px] mono-label text-midnight/60">
                      {event.sold} SOLD
                    </div>
                  </div>
                  <div className="mt-3 h-1 bg-midnight/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-blue" 
                      style={{ width: event.sold.includes('/') ? `${(parseInt(event.sold.split('/')[0].replace(',', '')) / parseInt(event.sold.split('/')[1].replace(',', ''))) * 100}%` : '0%' }} 
                    />
                  </div>
                  {selectedEventId === event.id && (
                    <div className="mt-3 flex items-center gap-1 text-[9px] mono-label text-brand-blue animate-pulse">
                      <div className="w-1 h-1 bg-brand-blue rounded-full" /> CURRENTLY VIEWING
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full mt-8 py-3 border border-black/10 rounded-sharp mono-label text-[10px] hover:bg-sky-tint transition-colors">
              VIEW ALL EVENTS
            </button>
          </div>
        </div>

        {/* Technical Logs / Activity */}
        <div className="mt-12 card-coastal bg-midnight text-white p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="mono-label text-sky-tint">SYSTEM ACTIVITY / LOGS</h3>
            <span className="text-[10px] mono-label text-white/40">LIVE UPDATES ENABLED</span>
          </div>
          <div className="space-y-4 font-mono text-[11px]">
            <div className="flex gap-4 text-white/40">
              <span className="text-sky-tint/60">[18:42:01]</span>
              <span className="text-white">SUCCESS: Ticket TKT-8291-XJ verified at SF_GATE_04</span>
            </div>
            <div className="flex gap-4 text-white/40">
              <span className="text-sky-tint/60">[18:41:55]</span>
              <span className="text-white">ORDER: New purchase confirmed for Coastal Tech Summit (Seat A12)</span>
            </div>
            <div className="flex gap-4 text-white/40">
              <span className="text-sky-tint/60">[18:40:32]</span>
              <span className="text-white">SYSTEM: Zone "VIP_FRONT" capacity reached for event ID: 4412</span>
            </div>
            <div className="flex gap-4 text-white/40">
              <span className="text-sky-tint/60">[18:38:12]</span>
              <span className="text-white">AUTH: Organizer login detected from IP: 192.168.1.42</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
