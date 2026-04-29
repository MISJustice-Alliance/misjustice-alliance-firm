import { Link } from 'react-router-dom';
import { ScaleIcon, ShieldCheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useSEO } from '../hooks/useSEO';

export const HomePage = () => {
  useSEO({
    title: 'Civil Rights Advocacy & Legal Misconduct Documentation',
    description:
      'Documenting legal misconduct and civil rights violations through decentralized, censorship-resistant technology. Permanent archive on Arweave permaweb with anonymous submissions.',
    keywords:
      'civil rights, legal misconduct, police misconduct, prosecutorial misconduct, Arweave, permaweb, decentralized, whistleblower, constitutional rights',
    canonicalUrl: 'https://misjusticealliance.org/',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'MISJustice Alliance - Home',
      description:
        'Documenting legal misconduct and civil rights violations through decentralized technology.',
      url: 'https://misjusticealliance.org/',
      mainEntity: {
        '@type': 'Organization',
        name: 'MISJustice Alliance',
        description:
          'Non-profit civil litigation advocacy collective defending constitutional and civil rights.',
      },
    },
  });
  /**
   * Track CTA button clicks for analytics
   * In production, this would integrate with an analytics service (e.g., Google Analytics, Plausible)
   */
  const handleCTAClick = (ctaName: string) => {
    // Log for development/debugging
    console.log(`CTA clicked: ${ctaName}`);

    // In production, integrate with analytics service:
    // window.gtag?.('event', 'cta_click', { cta_name: ctaName });
    // or
    // window.plausible?.('CTA Click', { props: { name: ctaName } });
  };
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary-700 to-primary-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold font-serif mb-6 text-white">
              MISJustice Alliance
            </h1>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Documenting Legal Misconduct and Civil Rights Violations Through
              Decentralized, Censorship-Resistant Technology
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/cases"
                onClick={() => handleCTAClick('Browse Cases - Hero')}
                className="bg-gold-600 text-primary-900 px-8 py-3 rounded-lg font-semibold hover:bg-gold-500 transition-colors duration-200"
              >
                Browse Cases
              </Link>
              <Link
                to="/contact"
                onClick={() => handleCTAClick('Contact Us - Hero')}
                className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold border-2 border-white hover:bg-primary-500 transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="py-16 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ScaleIcon className="h-8 w-8 text-primary-700" />
              </div>
              <h3 className="text-xl font-bold text-primary-700 mb-2">
                Document Misconduct
              </h3>
              <p className="text-neutral-600">
                Comprehensive database of legal misconduct, civil rights violations, and
                systemic injustices with verifiable evidence.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-gold-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheckIcon className="h-8 w-8 text-gold-700" />
              </div>
              <h3 className="text-xl font-bold text-primary-700 mb-2">
                Permanent Archive
              </h3>
              <p className="text-neutral-600">
                All cases archived on Arweave permaweb for permanent, immutable storage that
                cannot be censored or deleted.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <GlobeAltIcon className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="text-xl font-bold text-primary-700 mb-2">
                Decentralized & Anonymous
              </h3>
              <p className="text-neutral-600">
                Submit cases anonymously with end-to-end encryption. No central authority can
                remove or alter documented evidence.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-primary-700 mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-neutral-600 mb-8 max-w-2xl mx-auto">
            Browse documented cases, submit new evidence, or learn more about our mission to
            fight legal misconduct through transparency and accountability.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/cases"
              onClick={() => handleCTAClick('View Cases - Bottom')}
              className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-colors duration-200"
            >
              View Cases
            </Link>
            <Link
              to="/contact"
              onClick={() => handleCTAClick('Contact Us Securely - Bottom')}
              className="bg-neutral-200 text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-neutral-300 transition-colors duration-200"
            >
              Contact Us Securely
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
