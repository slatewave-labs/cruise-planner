import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
];

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-secondary">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-lg font-heading font-bold text-white tracking-wide">
              Static Site Template
            </Link>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-6" aria-label="Main navigation">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === to
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              className="sm:hidden p-2 text-gray-300 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile nav */}
          {menuOpen && (
            <nav className="sm:hidden pb-4 border-t border-gray-700 pt-2" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className={`block py-2 text-sm font-medium ${
                    location.pathname === to
                      ? 'text-white'
                      : 'text-gray-300 hover:text-white'
                  }`}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-gray-400 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Your Company. All rights reserved.</p>
          <p className="mt-1 text-gray-500">
            Built with React + Tailwind CSS. Deployed on AWS S3 &amp; CloudFront.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
