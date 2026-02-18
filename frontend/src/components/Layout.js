import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ship, Compass, FileText, Home } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/trips', label: 'My Trips', icon: Ship },
  { path: '/trips/new', label: 'New Trip', icon: Compass },
  { path: '/terms', label: 'Terms', icon: FileText },
];

export default function Layout({ children }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-secondary flex flex-col" data-testid="app-layout">
      {/* Desktop Top Nav */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-primary text-primary-foreground sticky top-0 z-40" data-testid="desktop-nav">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight">ShoreExplorer</span>
        </Link>
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-5 py-3 bg-primary text-primary-foreground sticky top-0 z-40" data-testid="mobile-header">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <Compass className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading text-lg font-bold">ShoreExplorer</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-40 safe-bottom" data-testid="mobile-bottom-nav">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`mobile-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                className={`flex flex-col items-center gap-0.5 min-w-[48px] min-h-[48px] justify-center rounded-xl transition-all ${
                  active ? 'text-accent' : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
