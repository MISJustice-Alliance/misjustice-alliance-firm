import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl?: string;
  ogType?: string;
  ogImage?: string;
  twitterCard?: 'summary' | 'summary_large_image';
  noIndex?: boolean;
  structuredData?: object;
}

const BASE_URL = 'https://misjusticealliance.org';
const DEFAULT_IMAGE = `${BASE_URL}/favicon.png`;
const SITE_NAME = 'MISJustice Alliance';

/**
 * Custom SEO hook for React 19
 * Manages document head meta tags for SEO and social sharing
 */
export function useSEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogType = 'website',
  ogImage = DEFAULT_IMAGE,
  twitterCard = 'summary_large_image',
  noIndex = false,
  structuredData,
}: SEOProps) {
  useEffect(() => {
    // Store original title to restore on unmount
    const originalTitle = document.title;

    // Set page title
    const fullTitle = `${title} | ${SITE_NAME}`;
    document.title = fullTitle;

    // Helper to set or create meta tag
    const setMetaTag = (
      attribute: 'name' | 'property',
      key: string,
      content: string
    ) => {
      let meta = document.querySelector(
        `meta[${attribute}="${key}"]`
      ) as HTMLMetaElement | null;

      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, key);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
      meta.setAttribute('data-seo-managed', 'true');
    };

    // Helper to set or create link tag
    const setLinkTag = (rel: string, href: string) => {
      let link = document.querySelector(
        `link[rel="${rel}"]`
      ) as HTMLLinkElement | null;

      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', rel);
        document.head.appendChild(link);
      }
      link.setAttribute('href', href);
      link.setAttribute('data-seo-managed', 'true');
    };

    // Primary meta tags
    setMetaTag('name', 'title', fullTitle);
    setMetaTag('name', 'description', description);
    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }
    setMetaTag('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    // Canonical URL
    if (canonicalUrl) {
      setLinkTag('canonical', canonicalUrl);
    }

    // Open Graph meta tags
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:title', fullTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:site_name', SITE_NAME);
    if (canonicalUrl) {
      setMetaTag('property', 'og:url', canonicalUrl);
    }

    // Twitter meta tags
    setMetaTag('name', 'twitter:card', twitterCard);
    setMetaTag('name', 'twitter:title', fullTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);
    if (canonicalUrl) {
      setMetaTag('name', 'twitter:url', canonicalUrl);
    }

    // Structured data (JSON-LD)
    if (structuredData) {
      let script = document.querySelector(
        'script[data-seo-structured]'
      ) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-structured', 'true');
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(structuredData);
    }

    // Cleanup on unmount
    return () => {
      document.title = originalTitle;
      // Remove dynamically added structured data script
      const structuredScript = document.querySelector('script[data-seo-structured]');
      if (structuredScript) {
        structuredScript.remove();
      }
    };
  }, [title, description, keywords, canonicalUrl, ogType, ogImage, twitterCard, noIndex, structuredData]);
}

export default useSEO;
