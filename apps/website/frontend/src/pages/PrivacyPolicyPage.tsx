import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { generateWebPage } from '../utils/structuredData';

/**
 * Privacy Policy Page
 *
 * GDPR Article 13 Requirements: ✓
 * CalOPPA Compliance: ✓
 * COPPA Considerations: N/A (not targeted at children)
 * Plain Language Requirement: ✓
 * Contact Information Displayed: ✓
 */

interface PolicySection {
  id: string;
  title: string;
}

const POLICY_SECTIONS: PolicySection[] = [
  { id: 'introduction', title: 'Introduction' },
  { id: 'data-collection', title: 'Data Collection Statement' },
  { id: 'victim-protection', title: 'Victim Information Protection' },
  { id: 'third-party', title: 'Third-Party Sharing' },
  { id: 'technical-safeguards', title: 'Technical Safeguards' },
  { id: 'user-rights', title: 'Your Rights' },
  { id: 'contact', title: 'Contact Information' },
  { id: 'updates', title: 'Policy Updates' },
];

const EFFECTIVE_DATE = 'January 5, 2025';
const LAST_UPDATED = 'January 5, 2025';
const POLICY_VERSION = '1.0';

export const PrivacyPolicyPage = () => {
  // SEO metadata and structured data
  useSEO({
    title: 'Privacy Policy',
    description:
      'Privacy policy for MISJustice Alliance. Learn how we protect your privacy, handle data, and maintain anonymity for whistleblowers and case submissions.',
    keywords:
      'privacy policy, data protection, GDPR compliance, user privacy, whistleblower protection, anonymous submissions, legal advocacy privacy',
    canonicalUrl: 'https://misjusticealliance.org/privacy',
    structuredData: generateWebPage(
      'Privacy Policy',
      'Privacy policy for MISJustice Alliance legal advocacy platform',
      'https://misjusticealliance.org/privacy',
      [
        { name: 'Home', url: 'https://misjusticealliance.org' },
        { name: 'Privacy Policy', url: 'https://misjusticealliance.org/privacy' },
      ]
    ),
  });

  useEffect(() => {
    // Scroll to top on page load
    window.scrollTo(0, 0);

    // Handle hash navigation
    if (window.location.hash) {
      const element = document.querySelector(window.location.hash);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-primary-700 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center space-x-2 text-sm text-primary-200">
              <li>
                <Link to="/" className="hover:text-gold-400 transition-colors">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-gold-400">
                Privacy Policy
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-primary-200">
            Your privacy is our priority
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents - Sidebar */}
          <aside className="lg:col-span-1">
            <nav
              aria-label="Table of Contents"
              className="sticky top-24 bg-white rounded-lg shadow-sm border border-neutral-200 p-4"
            >
              <h2 className="font-bold text-primary-700 mb-3 text-sm uppercase tracking-wide">
                Contents
              </h2>
              <ul className="space-y-2">
                {POLICY_SECTIONS.map((section) => (
                  <li key={section.id}>
                    <button
                      onClick={() => scrollToSection(section.id)}
                      className="text-left w-full text-sm text-neutral-600 hover:text-primary-600
                                 hover:bg-primary-50 px-2 py-1 rounded transition-colors cursor-pointer"
                    >
                      {section.title}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Main Content */}
          <article className="lg:col-span-3 prose prose-lg max-w-none">
            {/* Policy Metadata */}
            <div className="bg-primary-50 border-l-4 border-primary-500 p-4 mb-8 not-prose">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="font-medium text-primary-700">Effective Date</dt>
                  <dd className="text-neutral-700">{EFFECTIVE_DATE}</dd>
                </div>
                <div>
                  <dt className="font-medium text-primary-700">Last Updated</dt>
                  <dd className="text-neutral-700">{LAST_UPDATED}</dd>
                </div>
                <div>
                  <dt className="font-medium text-primary-700">Version</dt>
                  <dd className="text-neutral-700">{POLICY_VERSION}</dd>
                </div>
              </dl>
            </div>

            {/* Section 1: Introduction */}
            <section id="introduction" className="scroll-mt-24">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                1. Introduction
              </h2>
              <p className="text-neutral-700 leading-relaxed mb-4">
                MISJustice Alliance ("we," "our," or "us") is committed to protecting the privacy
                and security of all individuals who interact with our platform. This Privacy Policy
                explains our practices regarding information collection, use, and disclosure.
              </p>
              <p className="text-neutral-700 leading-relaxed mb-4">
                As a civil rights advocacy organization dedicated to documenting legal misconduct
                and protecting victims of institutional abuse, we understand the critical importance
                of privacy and anonymity. Our platform is designed with a <strong>privacy-first
                approach</strong>, minimizing data collection to protect both victims and advocates.
              </p>
              <p className="text-neutral-700 leading-relaxed">
                This policy applies to all services provided through misjusticealliance.org and
                any associated subdomains or services.
              </p>
            </section>

            {/* Section 2: Data Collection Statement */}
            <section id="data-collection" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                2. Data Collection Statement
              </h2>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 not-prose">
                <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Our Privacy Commitment
                </h3>
                <p className="text-green-900 font-medium">
                  MISJustice Alliance does <strong>NOT</strong> collect, log, track, or store any
                  personally identifiable information (PII) through standard browsing of our website.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                What We Do NOT Collect
              </h3>
              <ul className="space-y-2 text-neutral-700 mb-6">
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>IP Addresses</strong> – We do not log or store visitor IP addresses</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>Tracking Cookies</strong> – We do not use cookies for tracking or analytics</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>Browsing Behavior</strong> – We do not monitor page views, clicks, or navigation patterns</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>Device Identifiers</strong> – We do not collect device fingerprints or unique identifiers</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>Location Data</strong> – We do not track geographic location</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-500 mr-2" aria-hidden="true">✗</span>
                  <span><strong>Third-Party Analytics</strong> – We do not use Google Analytics or similar services</span>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Information You May Choose to Provide
              </h3>
              <p className="text-neutral-700 leading-relaxed mb-4">
                If you voluntarily contact us or submit information through our contact form, you
                may provide:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-neutral-700 mb-4">
                <li>Email address (for correspondence)</li>
                <li>Name (if you choose to provide it)</li>
                <li>Case-related information you voluntarily share</li>
              </ul>
              <p className="text-neutral-700 leading-relaxed">
                Any information you provide is used solely to respond to your inquiry and is
                handled with strict confidentiality. You may contact us anonymously using
                encrypted email services if preferred.
              </p>
            </section>

            {/* Section 3: Victim Information Protection */}
            <section id="victim-protection" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                3. Victim Information Protection
              </h2>

              <div className="bg-gold-50 border border-gold-200 rounded-lg p-6 mb-6 not-prose">
                <h3 className="text-lg font-bold text-gold-800 mb-3">
                  Default Redaction Policy
                </h3>
                <p className="text-gold-900">
                  <strong>All victim information is fully redacted by default.</strong> No victim
                  names, identifying details, or personal information will appear in any public
                  case documentation unless explicit written permission has been granted.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Permission-Based Disclosure
              </h3>
              <p className="text-neutral-700 leading-relaxed mb-4">
                Names or identifying information are only disclosed with explicit written
                permission from the victim to MISJustice Alliance. Our permission process includes:
              </p>
              <ol className="list-decimal pl-6 space-y-2 text-neutral-700 mb-6">
                <li>
                  <strong>Informed Consent</strong> – Victims receive a clear explanation of what
                  information will be disclosed and where it will appear
                </li>
                <li>
                  <strong>Written Authorization</strong> – All permissions are documented in writing,
                  including the specific scope of disclosure
                </li>
                <li>
                  <strong>Revocation Right</strong> – Victims may revoke permission at any time;
                  we will make reasonable efforts to remove disclosed information
                </li>
                <li>
                  <strong>Secure Storage</strong> – Permission records are stored securely and
                  handled only by authorized personnel
                </li>
              </ol>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Permanent Archive Considerations
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                Our case documentation is archived on the Arweave permaweb for permanent,
                censorship-resistant preservation. Before any information is archived:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-neutral-700 mt-2">
                <li>Victims are informed of the permanent nature of permaweb archival</li>
                <li>Only redacted or permission-granted content is archived</li>
                <li>Technical measures ensure victim anonymity by default</li>
              </ul>
            </section>

            {/* Section 4: Third-Party Sharing */}
            <section id="third-party" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                4. Third-Party Sharing
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6 not-prose">
                <p className="text-blue-900 font-medium">
                  No user data is shared with third parties without explicit permission.
                </p>
              </div>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Essential Service Providers
              </h3>
              <p className="text-neutral-700 leading-relaxed mb-4">
                To operate our platform, we work with the following essential service providers:
              </p>
              <ul className="space-y-4 text-neutral-700 mb-6">
                <li>
                  <strong className="text-primary-700">Web Hosting Provider</strong>
                  <p className="text-sm mt-1">
                    Provides server infrastructure. No visitor tracking data is shared or retained.
                  </p>
                </li>
                <li>
                  <strong className="text-primary-700">SSL/TLS Certificate Authority</strong>
                  <p className="text-sm mt-1">
                    Ensures encrypted connections. Certificate validation does not involve
                    personal data collection.
                  </p>
                </li>
                <li>
                  <strong className="text-primary-700">Arweave Network</strong>
                  <p className="text-sm mt-1">
                    Decentralized storage for permanent case documentation. Only redacted or
                    permission-granted content is stored.
                  </p>
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Legal Compliance
              </h3>
              <p className="text-neutral-700 leading-relaxed">
                We may disclose information only if required by law, such as in response to a
                valid court order. However, since we do not collect personal data through normal
                website usage, there is typically nothing to disclose. We will resist any
                overreaching legal requests to the fullest extent permitted by law.
              </p>
            </section>

            {/* Section 5: Technical Safeguards */}
            <section id="technical-safeguards" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                5. Technical Safeguards
              </h2>
              <p className="text-neutral-700 leading-relaxed mb-6">
                We implement the following technical measures to protect your privacy:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 not-prose mb-6">
                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h4 className="font-semibold text-primary-700">SSL/TLS Encryption</h4>
                  </div>
                  <p className="text-sm text-neutral-600">
                    All connections use TLS 1.3 encryption, protecting data in transit.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    <h4 className="font-semibold text-primary-700">No Tracking Cookies</h4>
                  </div>
                  <p className="text-sm text-neutral-600">
                    We do not use tracking cookies, analytics cookies, or any persistent identifiers.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <h4 className="font-semibold text-primary-700">No Social Tracking</h4>
                  </div>
                  <p className="text-sm text-neutral-600">
                    No social media tracking pixels, share buttons, or embedded third-party scripts.
                  </p>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h4 className="font-semibold text-primary-700">Minimal Server Logs</h4>
                  </div>
                  <p className="text-sm text-neutral-600">
                    Server logs are minimized and automatically purged. No IP addresses are retained.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Recommended User Practices
              </h3>
              <p className="text-neutral-700 leading-relaxed mb-2">
                For additional privacy protection, we recommend:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-neutral-700">
                <li>Using a VPN or Tor browser for enhanced anonymity</li>
                <li>Using encrypted email (ProtonMail, Tutanota) for correspondence</li>
                <li>Avoiding browser auto-fill when submitting sensitive information</li>
              </ul>
            </section>

            {/* Section 6: User Rights */}
            <section id="user-rights" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                6. Your Rights
              </h2>
              <p className="text-neutral-700 leading-relaxed mb-6">
                Under applicable privacy laws including GDPR and CCPA, you have the following rights:
              </p>

              <div className="space-y-4 not-prose">
                <div className="border-l-4 border-primary-500 bg-white p-4 rounded-r-lg shadow-sm">
                  <h4 className="font-semibold text-primary-700 mb-1">Right to Information Removal</h4>
                  <p className="text-sm text-neutral-600">
                    If you have submitted information to us, you may request its deletion. We will
                    comply within 30 days, except for information archived on the permanent permaweb
                    (which cannot be deleted by design).
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 bg-white p-4 rounded-r-lg shadow-sm">
                  <h4 className="font-semibold text-primary-700 mb-1">Right to Update Information</h4>
                  <p className="text-sm text-neutral-600">
                    You may request corrections to any information you have shared with us.
                    Updated information will be reflected in our records within 15 business days.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 bg-white p-4 rounded-r-lg shadow-sm">
                  <h4 className="font-semibold text-primary-700 mb-1">Right to Withdraw Permission</h4>
                  <p className="text-sm text-neutral-600">
                    If you previously granted permission for disclosure of your identifying
                    information, you may withdraw that permission at any time. We will make
                    reasonable efforts to remove disclosed information from our platform.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 bg-white p-4 rounded-r-lg shadow-sm">
                  <h4 className="font-semibold text-primary-700 mb-1">Right to Access</h4>
                  <p className="text-sm text-neutral-600">
                    You may request a copy of any personal information we hold about you. Since
                    we collect minimal data, this may consist only of correspondence records.
                  </p>
                </div>

                <div className="border-l-4 border-primary-500 bg-white p-4 rounded-r-lg shadow-sm">
                  <h4 className="font-semibold text-primary-700 mb-1">Right to Data Portability</h4>
                  <p className="text-sm text-neutral-600">
                    You may request your data in a portable, machine-readable format. We will
                    provide this within 30 days of your request.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 7: Contact Information */}
            <section id="contact" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                7. Contact Information
              </h2>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 not-prose">
                <h3 className="text-lg font-bold text-primary-700 mb-4">
                  Privacy Inquiries
                </h3>
                <p className="text-neutral-700 mb-4">
                  For questions about this privacy policy or to exercise your rights, contact us at:
                </p>
                <div className="space-y-2">
                  <p>
                    <strong className="text-primary-700">Email:</strong>{' '}
                    <a
                      href="mailto:admin@misjusticealliance.org?subject=Privacy%20Inquiry%20-%20"
                      className="text-primary-600 hover:text-primary-800 underline"
                    >
                      admin@misjusticealliance.org
                    </a>
                  </p>
                  <p>
                    <strong className="text-primary-700">Subject Line Format:</strong>{' '}
                    <code className="bg-neutral-200 px-2 py-1 rounded text-sm">
                      Privacy Inquiry - [Your Concern]
                    </code>
                  </p>
                  <p>
                    <strong className="text-primary-700">Response Time:</strong>{' '}
                    Within 5 business days
                  </p>
                </div>
              </div>

              <p className="text-neutral-700 leading-relaxed mt-6">
                For urgent privacy concerns or potential security vulnerabilities, please include
                "URGENT" in your subject line. We take all privacy matters seriously and will
                prioritize your request accordingly.
              </p>
            </section>

            {/* Section 8: Policy Updates */}
            <section id="updates" className="scroll-mt-24 mt-12">
              <h2 className="text-2xl font-serif font-bold text-primary-700 mb-4">
                8. Policy Updates
              </h2>
              <p className="text-neutral-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time to reflect changes in our
                practices or applicable laws. When we make changes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-neutral-700 mb-6">
                <li>
                  The "Last Updated" date at the top of this page will be revised
                </li>
                <li>
                  Significant changes will be announced on our homepage for at least 30 days
                </li>
                <li>
                  If you have provided contact information, we may notify you directly of
                  material changes
                </li>
                <li>
                  The previous version will be archived and available upon request
                </li>
              </ul>

              <h3 className="text-xl font-semibold text-primary-600 mb-3">
                Version History
              </h3>
              <div className="not-prose">
                <table className="w-full text-sm border border-neutral-200 rounded-lg overflow-hidden">
                  <thead className="bg-neutral-100">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-primary-700">Version</th>
                      <th className="px-4 py-2 text-left font-semibold text-primary-700">Date</th>
                      <th className="px-4 py-2 text-left font-semibold text-primary-700">Changes</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200">
                      <td className="px-4 py-2 text-neutral-700">1.0</td>
                      <td className="px-4 py-2 text-neutral-700">{EFFECTIVE_DATE}</td>
                      <td className="px-4 py-2 text-neutral-700">Initial privacy policy</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Closing Statement */}
            <section className="mt-12 pt-8 border-t border-neutral-200">
              <p className="text-neutral-600 text-sm italic">
                This privacy policy is designed to be clear and transparent. If any part is
                unclear or you have questions about our practices, please don't hesitate to
                contact us. Your privacy and trust are fundamental to our mission.
              </p>
            </section>

            {/* Back to Top */}
            <div className="mt-8 text-center not-prose">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center px-4 py-2 text-sm text-primary-600
                           hover:text-primary-800 hover:bg-primary-50 rounded-lg
                           transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                Back to top
              </button>
            </div>
          </article>
        </div>
      </div>

      {/* Print Styles (handled via Tailwind) */}
      <style>{`
        @media print {
          header, nav[aria-label="Table of Contents"], footer, button {
            display: none !important;
          }
          article {
            max-width: 100% !important;
            padding: 0 !important;
          }
          section {
            page-break-inside: avoid;
          }
          a {
            text-decoration: underline;
          }
          a[href^="mailto:"]::after {
            content: " (" attr(href) ")";
            font-size: 0.8em;
          }
        }
      `}</style>
    </main>
  );
};

export default PrivacyPolicyPage;
