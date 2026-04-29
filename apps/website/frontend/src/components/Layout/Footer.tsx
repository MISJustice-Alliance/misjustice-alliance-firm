import { Link } from 'react-router-dom';
import { EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-primary-900 text-white mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-gold-400 font-serif mb-4">
              MISJustice Alliance
            </h3>
            <p className="text-neutral-300 mb-4">
              Documenting and advocating for justice in cases of misconduct,
              civil rights violations, and prosecutorial abuse. Our mission is
              to ensure transparency and accountability through permanent,
              decentralized record-keeping.
            </p>
            <div className="flex space-x-2">
              <span className="inline-block bg-primary-800 px-3 py-1 rounded-full text-xs font-medium">
                Arweave
              </span>
              <span className="inline-block bg-primary-800 px-3 py-1 rounded-full text-xs font-medium">
                Permaweb
              </span>
              <span className="inline-block bg-primary-800 px-3 py-1 rounded-full text-xs font-medium">
                Transparency
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/cases"
                  className="text-neutral-300 hover:text-gold-400 transition-colors duration-200 cursor-pointer"
                >
                  Browse Cases
                </Link>
              </li>
              <li>
                <Link
                  to="/mission"
                  className="text-neutral-300 hover:text-gold-400 transition-colors duration-200 cursor-pointer"
                >
                  Mission Statement
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="text-neutral-300 hover:text-gold-400 transition-colors duration-200 cursor-pointer"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy"
                  className="text-neutral-300 hover:text-gold-400 transition-colors duration-200 cursor-pointer"
                >
                  Privacy Policy
                </Link>
              </li>
{/* Temporarily disabled - Docs Demo
              <li>
                <Link
                  to="/documents/demo"
                  className="text-neutral-300 hover:text-gold-400 transition-colors duration-200 cursor-pointer"
                >
                  Documentation Demo
                </Link>
              </li>
              */}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-bold text-gold-400 mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-2">
                <EnvelopeIcon className="h-5 w-5 text-gold-400 mt-0.5" />
                <span className="text-neutral-300">
                  contact@misjustice.org
                </span>
              </li>
              <li className="flex items-start space-x-2">
                <MapPinIcon className="h-5 w-5 text-gold-400 mt-0.5" />
                <span className="text-neutral-300">
                  Decentralized Network
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-neutral-400 text-sm">
            © {currentYear} MISJustice Alliance. All rights reserved.
          </p>
          <nav aria-label="Legal" className="mt-4 md:mt-0">
            <Link
              to="/privacy"
              className="text-neutral-400 text-sm hover:text-gold-400 transition-colors duration-200 cursor-pointer"
            >
              Privacy Policy
            </Link>
          </nav>
          <p className="text-neutral-400 text-sm mt-4 md:mt-0">
            Powered by Arweave Permaweb
          </p>
        </div>
      </div>
    </footer>
  );
};
