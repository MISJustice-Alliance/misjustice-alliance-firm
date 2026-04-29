import {
  ShieldCheckIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  KeyIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { CONTACT_CONFIG } from '../config/contactConfig';
import { useSEO } from '../hooks/useSEO';
import { ContactForm } from '../components/ContactForm';
import { generateContactPoint, getOrganizationRef } from '../utils/structuredData';

export const ContactPage = () => {
  useSEO({
    title: 'Secure Contact Methods',
    description:
      'Contact MISJustice Alliance securely and anonymously. Use Session Messenger, Quiet, PGP encrypted email, or Tor for private communication. Your privacy and anonymity are protected.',
    keywords:
      'secure contact, anonymous contact, encrypted messaging, Session messenger, PGP email, Tor browser, whistleblower contact, private communication, end-to-end encryption',
    canonicalUrl: 'https://misjusticealliance.org/contact',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Secure Contact - MISJustice Alliance',
      description:
        'Multiple secure and anonymous communication channels for contacting MISJustice Alliance.',
      url: 'https://misjusticealliance.org/contact',
      mainEntity: {
        ...getOrganizationRef(),
        contactPoint: [
          generateContactPoint({
            contactType: 'secure messaging',
            name: 'Session Messenger',
            url: `session://${CONTACT_CONFIG.session.id}`,
            areaServed: 'United States',
            availableLanguage: 'en-US',
          }),
          generateContactPoint({
            contactType: 'secure messaging',
            name: 'Signal Messenger',
            areaServed: 'United States',
            availableLanguage: 'en-US',
          }),
          generateContactPoint({
            contactType: 'secure messaging',
            name: 'Quiet',
            areaServed: 'United States',
            availableLanguage: 'en-US',
          }),
          generateContactPoint({
            contactType: 'encrypted email',
            email: CONTACT_CONFIG.email.address,
            areaServed: 'United States',
            availableLanguage: 'en-US',
          }),
          generateContactPoint({
            contactType: 'anonymous web',
            name: 'Tor Access',
            url: `http://${CONTACT_CONFIG.tor.onionAddress}`,
            areaServed: 'United States',
          }),
        ],
      },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-primary-700 font-serif mb-2">
          Secure Contact Methods
        </h1>
        <p className="text-neutral-600">
          Protecting your privacy and anonymity is our top priority. Use these secure
          communication channels to reach us safely.
        </p>
      </div>

      {/* Security Notice */}
      <div className="bg-gold-50 border border-gold-200 rounded-xl p-6 mb-8">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-gold-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-gold-900 font-bold mb-2">Your Privacy Matters</h3>
            <p className="text-gold-800 text-sm">
              We never track IP addresses, store personal information, or share data with third
              parties. All communication channels listed below use end-to-end encryption and do
              not require revealing your identity.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Session Messenger */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-700" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">Session Messenger</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            End-to-end encrypted messaging with no phone number or email required. Session uses
            onion routing for metadata protection.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-1">Session ID:</p>
            <p className="font-mono text-sm text-primary-700 break-all">
              {CONTACT_CONFIG.session.id}
            </p>
          </div>
          <a
            href={CONTACT_CONFIG.links.sessionDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Session →
          </a>
        </div>

        {/* Signal Messenger */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">Signal Messenger</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            Popular end-to-end encrypted messaging app. Signal is widely trusted and easy to use,
            with strong privacy protections and disappearing messages.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Scan to connect:</p>
            <div className="flex justify-center mb-3">
              <img
                src={CONTACT_CONFIG.signal.qrCodeUrl}
                alt="MISJustice Alliance Signal QR Code"
                className="w-48 h-48 rounded-lg"
              />
            </div>
            <p className="text-sm font-medium text-neutral-700 mb-1">Username:</p>
            <p className="font-mono text-sm text-primary-700">{CONTACT_CONFIG.signal.username}</p>
          </div>
          <a
            href={CONTACT_CONFIG.links.signalDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Signal →
          </a>
        </div>

        {/* Quiet Messenger */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-primary-100 p-3 rounded-lg">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-primary-700" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">Quiet</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            Private, encrypted messenger designed for anonymous communication. No servers, no
            metadata collection, fully peer-to-peer.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Scan to connect:</p>
            <div className="flex justify-center">
              <img
                src="/misjustice-alliance-quiet-qr-code.png"
                alt="MISJustice Alliance Quiet QR Code"
                className="w-48 h-48"
              />
            </div>
          </div>
          <a
            href={CONTACT_CONFIG.links.quietDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Quiet →
          </a>
        </div>

        {/* PGP Encrypted Email */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gold-100 p-3 rounded-lg">
              <EnvelopeIcon className="h-6 w-6 text-gold-700" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">PGP Encrypted Email</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            For highly sensitive information, use PGP encryption. We recommend using Proton Mail
            or Tutanota for maximum privacy.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-1">Email:</p>
            <p className="font-mono text-sm text-primary-700 break-all mb-3">
              {CONTACT_CONFIG.email.address}
            </p>
            <p className="text-sm font-medium text-neutral-700 mb-1">PGP Fingerprint:</p>
            <p className="font-mono text-xs text-neutral-600 break-all">
              {CONTACT_CONFIG.email.pgpFingerprint}
            </p>
          </div>
          <a
            href={CONTACT_CONFIG.email.pgpPublicKeyUrl}
            download
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Public Key →
          </a>
        </div>

        {/* Tor Browser */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-purple-100 p-3 rounded-lg">
              <GlobeAltIcon className="h-6 w-6 text-purple-700" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">Tor Access</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            This website supports{' '}
            <a
              href="https://blog.cloudflare.com/cloudflare-onion-service/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
            >
              Cloudflare Onion Routing
            </a>
            . When you visit our site using Tor Browser, your connection is automatically routed
            through the Tor network—no special .onion address needed.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">How it works:</p>
            <p className="text-sm text-neutral-600">
              Simply open Tor Browser and visit{' '}
              <span className="font-mono text-primary-700">misjusticealliance.org</span>. Your IP
              address and location are automatically hidden—we cannot see who you are.
            </p>
          </div>
          <a
            href={CONTACT_CONFIG.links.torDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Tor Browser →
          </a>
        </div>

        {/* Anonymous File Upload */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-indigo-100 p-3 rounded-lg">
              <ArrowUpTrayIcon className="h-6 w-6 text-indigo-700" />
            </div>
            <h3 className="text-xl font-bold text-primary-700">Anonymous File Upload</h3>
          </div>
          <p className="text-neutral-600 mb-4">
            Securely and anonymously upload documents, evidence, or other files using our Tor hidden
            service. Your identity remains completely hidden—we cannot see your IP address or
            location.
          </p>
          <div className="bg-neutral-50 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">How to upload:</p>
            <ol className="text-sm text-neutral-600 space-y-2">
              <li>
                <span className="font-medium">1.</span> Open Tor Browser
              </li>
              <li>
                <span className="font-medium">2.</span> Copy and paste the .onion address below
              </li>
              <li>
                <span className="font-medium">3.</span> Upload your files securely
              </li>
            </ol>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-purple-700 mb-1">Onion Address (Tor Browser only):</p>
            <p className="font-mono text-xs text-purple-900 break-all select-all">
              http://5gvssi2ezqntam32nvdndn3ktmft253tkr5uhj66w37dyakddok4tqid.onion/
            </p>
          </div>
          <a
            href={CONTACT_CONFIG.links.torDownload}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            Download Tor Browser →
          </a>
        </div>
      </div>

      {/* Contact Form Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <InboxIcon className="h-6 w-6 text-primary-700" />
          <h2 className="text-2xl font-bold text-primary-700">Send Us a Message</h2>
        </div>
        <p className="text-neutral-600 mb-6">
          Use the form below to send us a message directly. For maximum privacy, we recommend
          using the encrypted messaging options above instead.
        </p>
        <ContactForm />
      </div>

      {/* Security Best Practices */}
      <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-8 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <KeyIcon className="h-6 w-6 text-primary-700" />
          <h2 className="text-2xl font-bold text-primary-700">Security Best Practices</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-bold text-neutral-900 mb-2">✓ Recommended</h4>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Use Tor Browser for maximum anonymity
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Create a new email address not linked to your identity
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Use Signal, Session, or Quiet for instant messaging
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Encrypt sensitive documents before sharing
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Use public WiFi networks (not your home/work connection) with Tor or ProtonVPN
              </li>
              <li className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Use Proton.me services (ProtonMail, ProtonVPN, ProtonDrive) for enhanced privacy
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-neutral-900 mb-2">✗ Avoid</h4>
            <ul className="space-y-2 text-sm text-neutral-700">
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                Using Facebook, WhatsApp, or iMessage for sensitive topics
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                Sharing personal details that could identify you
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                Using your work or school email address
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                Accessing from your home IP address without Tor/VPN
              </li>
              <li className="flex items-start">
                <span className="text-red-600 mr-2">•</span>
                Sending unencrypted documents via regular email
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <ExclamationTriangleIcon className="h-6 w-6 text-red-700 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-900 font-bold mb-2">Important Security Notice</h3>
            <p className="text-red-800 text-sm">
              If you are in immediate danger or experiencing an emergency, contact local law
              enforcement or emergency services directly. This platform is designed for
              documentation and advocacy, not emergency response. Your safety is paramount—use
              caution when documenting sensitive information and consider consulting with a lawyer
              or legal aid organization before sharing details of ongoing legal matters.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
