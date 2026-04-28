/**
 * Contact configuration
 * Values are loaded from environment variables for security and flexibility
 */

export const CONTACT_CONFIG = {
  session: {
    id: import.meta.env.VITE_SESSION_ID || '05b91206d21de1fe1a00e18d8ee1bce06cfcaf22fd3025bc0f0065e675e6722324',
  },
  signal: {
    username: import.meta.env.VITE_SIGNAL_USERNAME || 'MISJusticeAlliance64.86',
    qrCodeUrl: '/signal-qr-code.png',
  },
  quiet: {
    address: import.meta.env.VITE_QUIET_ADDRESS || 'misjustice-alliance-contact',
  },
  email: {
    address: import.meta.env.VITE_CONTACT_EMAIL || 'admin@misjusticealliance.org',
    pgpFingerprint: import.meta.env.VITE_PGP_FINGERPRINT || '9916 8F6F 2FDF 81C6 069A 0B40 E2D5 C801 8559 0916',
    pgpPublicKeyUrl: import.meta.env.VITE_PGP_PUBLIC_KEY_URL || '/admin_misjusticealliance.org.asc',
  },
  tor: {
    onionAddress: import.meta.env.VITE_TOR_ONION_ADDRESS || 'misjusticexyz123abc.onion',
  },
  links: {
    sessionDownload: 'https://getsession.org',
    signalDownload: 'https://signal.org/download/',
    quietDownload: 'https://tryquiet.org',
    torDownload: 'https://www.torproject.org',
  },
} as const;
