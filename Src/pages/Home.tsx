import { motion } from 'motion/react';
import { ArrowRight, Star, MapPin, Calendar, Users, Zap, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
  const stats = [
    { label: 'ACTIVE EVENTS', value: '1,284' },
    { label: 'TICKETS SOLD', value: '42.5M' },
    { label: 'SECURE CHECK-INS', value: '99.9%' },
  ];

  const featuredEvents = [
    {
      id: 1,
      title: 'Coastal Tech Summit 2026',
      date: 'MAY 12-14, 2026',
      location: 'SAN FRANCISCO, CA',
      price: '$299',
      image: 'https://picsum.photos/seed/tech/800/600',
    },
    {
      id: 2,
      title: 'Neon Nights Music Festival',
      date: 'JUNE 05, 2026',
      location: 'MIAMI, FL',
      price: '$149',
      image: 'https://picsum.photos/seed/music/800/600',
    },
    {
      id: 3,
      title: 'Global Design Conference',
      date: 'JULY 20, 2026',
      location: 'LONDON, UK',
      price: '$399',
      image: 'https://picsum.photos/seed/design/800/600',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl"
          >
            <span className="mono-label text-brand-blue mb-4 block">INFRASTRUCTURE / TICKETING</span>
            <h1 className="text-6xl md:text-8xl font-medium tracking-[-0.04em] leading-[0.9] mb-8">
              The Intelligence <br />
              <span className="text-brand-blue">Infrastructure.</span>
            </h1>
            <p className="text-xl text-midnight/60 mb-10 max-w-xl leading-relaxed">
              Coastal Tickets provides the high-precision tools needed to build, 
              manage, and scale world-class event experiences.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/booking" className="btn-primary flex items-center gap-2">
                EXPLORE EVENTS <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Background Illustration */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-40 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] gradient-coastal blur-[120px] rounded-full" />
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-black/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex flex-col"
              >
                <span className="text-5xl font-medium mb-2">{stat.value}</span>
                <span className="mono-label text-brand-blue">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-32 bg-cream-base/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="mono-label text-brand-blue mb-4 block">CURATED / SELECTION</span>
              <h2 className="text-4xl md:text-5xl">Featured Experiences</h2>
            </div>
            <Link to="/booking" className="mono-label flex items-center gap-2 hover:text-brand-blue transition-colors">
              VIEW ALL <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredEvents.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card-coastal group overflow-hidden"
              >
                <div className="aspect-[4/3] overflow-hidden relative">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-sharp mono-label text-xs">
                    {event.price}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl mb-4 group-hover:text-brand-blue transition-colors">{event.title}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-midnight/60">
                      <Calendar size={14} /> {event.date}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-midnight/60">
                      <MapPin size={14} /> {event.location}
                    </div>
                  </div>
                  <Link
                    to="/booking"
                    className="mt-6 w-full btn-primary py-2 text-sm flex justify-center items-center gap-2"
                  >
                    BOOK SEATS <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Section (Dark) */}
      <section className="py-32 bg-midnight text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-sky-tint/10 border border-sky-tint/20 rounded-sharp mb-8">
                <ShieldCheck size={16} className="text-sky-tint" />
                <span className="mono-label text-sky-tint">ENTERPRISE SECURITY</span>
              </div>
              <h2 className="text-5xl md:text-6xl mb-8 leading-tight">
                Built for <br />
                <span className="text-sky-tint">Scale & Trust.</span>
              </h2>
              <p className="text-white/60 text-lg mb-12 leading-relaxed">
                Our platform handles millions of requests with sub-millisecond latency. 
                From real-time seat mapping to encrypted ticket verification, 
                we provide the backbone for the world's most demanding events.
              </p>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Zap className="text-brand-yellow" size={24} />
                  <h4 className="font-medium">Real-time Sync</h4>
                  <p className="text-sm text-white/40">Instant seat updates across all devices.</p>
                </div>
                <div className="space-y-2">
                  <Users className="text-brand-blue" size={24} />
                  <h4 className="font-medium">Queue Management</h4>
                  <p className="text-sm text-white/40">Fair access during high-demand drops.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
