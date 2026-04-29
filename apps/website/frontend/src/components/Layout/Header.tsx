import { Link } from 'react-router-dom';
import { ScaleIcon, MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline';

export const Header = () => {
  return (
    <header className="fixed top-4 left-4 right-4 z-50">
      <nav className="mx-auto max-w-7xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link to="/" className="flex items-center space-x-3 cursor-pointer group">
            <div className="bg-primary-500 p-2 rounded-lg group-hover:bg-primary-600 transition-colors duration-200">
              <ScaleIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-primary-700 font-serif">
                MISJustice Alliance
              </h1>
              <p className="text-xs text-neutral-600">
                Legal Advocacy Platform
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/cases"
              className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200 cursor-pointer"
            >
              Cases
            </Link>
            <Link
              to="/mission"
              className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200 cursor-pointer"
            >
              Mission Statement
            </Link>
            <Link
              to="/contact"
              className="text-neutral-700 hover:text-primary-600 font-medium transition-colors duration-200 cursor-pointer"
            >
              Contact
            </Link>
{/* Temporarily disabled - Docs Demo
            <Link
              to="/documents/demo"
              className="inline-flex items-center space-x-1 text-gold-600 hover:text-gold-700 font-medium transition-colors duration-200 cursor-pointer"
            >
              <span>Docs Demo</span>
              <span className="text-xs px-2 py-0.5 bg-gold-100 text-gold-700 rounded-full font-semibold">
                New
              </span>
            </Link>
            */}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-4">
            <button
              className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200 cursor-pointer"
              aria-label="Search"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
            <button
              className="p-2 text-neutral-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors duration-200 cursor-pointer"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
            </button>
            <button className="bg-primary-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-600 transition-colors duration-200 cursor-pointer">
              Get Involved
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
};
