import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Ticket, LayoutDashboard, ScanLine, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', path: '/', roles: ['user', 'organizer', 'checker', null] },
    { name: 'My Tickets', path: '/my-tickets', icon: <Ticket size={18} />, roles: ['user'] },
    { name: 'Organizer', path: '/organizer/dashboard', icon: <LayoutDashboard size={18} />, roles: ['organizer'] },
    { name: 'Checker', path: '/checker', icon: <ScanLine size={18} />, roles: ['checker', 'organizer'] },
  ];

  const filteredLinks = navLinks.filter(link => 
    !link.roles || (role && link.roles.includes(role))
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/8">
        <div className="max-w-7xl mx-auto px-6 h-20 grid grid-cols-2 md:grid-cols-3 items-center">
          {/* Logo */}
          <div className="flex justify-start">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 gradient-coastal rounded-sharp flex items-center justify-center">
                <Ticket className="text-midnight" />
              </div>
              <span className="text-2xl font-medium tracking-tighter hidden sm:block">TOOKET-THER</span>
            </Link>
          </div>

          {/* Centered Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center justify-center gap-8">
            {filteredLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`mono-label transition-colors hover:text-brand-blue ${
                  location.pathname === link.path ? 'text-brand-blue' : 'text-midnight/60'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-4">
            <div className="hidden sm:flex items-center gap-4">
              <div className="relative">
                {role ? (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-sharp bg-sky-tint/20 mono-label text-[10px]">
                      <User size={16} />
                      {role.toUpperCase()}
                    </div>
                    <button 
                      onClick={() => { logout(); navigate('/'); }}
                      className="p-2 text-midnight/40 hover:text-red-500 transition-colors"
                      title="Logout"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/login"
                    className="flex items-center gap-2 p-2 rounded-sharp hover:bg-sky-tint transition-colors mono-label text-[10px]"
                  >
                    <User size={20} />
                    LOGIN
                  </Link>
                )}
              </div>
              <Link to="/booking" className="btn-primary py-2 px-4 text-sm whitespace-nowrap">
                BOOK NOW
              </Link>
            </div>
            
            {/* Mobile Menu Toggle */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-midnight hover:bg-sky-tint transition-colors rounded-sharp"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden absolute top-20 left-0 w-full bg-white border-b border-black/8 p-6 space-y-6 shadow-xl"
          >
            <div className="flex flex-col gap-4">
              {filteredLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`mono-label text-sm flex items-center gap-3 ${
                    location.pathname === link.path ? 'text-brand-blue' : 'text-midnight/60'
                  }`}
                >
                  {link.icon || <Ticket size={18} />}
                  {link.name}
                </Link>
              ))}
            </div>
            
            <div className="pt-6 border-t border-black/5 flex flex-col gap-4">
              {role ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 mono-label text-[10px] text-brand-blue">
                    <User size={16} />
                    {role.toUpperCase()}
                  </div>
                  <button onClick={() => { logout(); setIsMobileMenuOpen(false); navigate('/'); }} className="text-red-500 mono-label text-[10px] flex items-center gap-2">
                    <LogOut size={16} /> LOGOUT
                  </button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="btn-secondary py-3 text-center">LOGIN</Link>
              )}
              <Link to="/booking" onClick={() => setIsMobileMenuOpen(false)} className="btn-primary py-3 text-center">BOOK NOW</Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-midnight text-white py-20">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 gradient-coastal rounded-sharp flex items-center justify-center">
                <Ticket className="text-midnight" size={16} />
              </div>
              <span className="text-xl font-medium tracking-tighter">TOOKET-THER</span>
            </div>
            <p className="text-white/60 max-w-sm leading-relaxed">
              The intelligence infrastructure for modern event experiences. 
              Seamless booking, secure verification, and powerful analytics.
            </p>
          </div>

          <div>
            <h4 className="mono-label text-white/40 mb-6">PLATFORM</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="text-sm hover:text-brand-blue transition-colors">Events</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mono-label text-white/40 mb-6">RESOURCES</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-sm hover:text-brand-blue transition-colors">Help Center</a></li>
              <li><a href="#" className="text-sm hover:text-brand-blue transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="mono-label text-white/20">© 2026 TOOKET-THER TICKETS / RESEARCH / APRIL 2026</span>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-white transition-colors"><ScanLine size={18} /></a>
            <a href="#" className="text-white/40 hover:text-white transition-colors"><Ticket size={18} /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}