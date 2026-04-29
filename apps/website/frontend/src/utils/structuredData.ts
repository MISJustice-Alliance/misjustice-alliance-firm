/**
 * Structured Data Utilities for SEO
 * Generates Schema.org JSON-LD markup for rich results in Google Search
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

const BASE_URL = 'https://misjusticealliance.org';
const ORG_NAME = 'MISJustice Alliance';
const ORG_LOGO = `${BASE_URL}/favicon.png`;

// Type definitions for structured data
interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface ArticleData {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
}

interface CaseData {
  id: string;
  caseNumber: string;
  plaintiff: string;
  defendant: string;
  caseFacts?: string;
  jurisdiction?: string;
  filedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  causesOfAction?: string[];
  status: string;
}

interface CollectionPageData {
  name: string;
  description: string;
  url: string;
  itemCount?: number;
}

/**
 * Generate Organization reference for embedding in other schemas
 */
export function getOrganizationRef() {
  return {
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    name: ORG_NAME,
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: ORG_LOGO,
    },
  };
}

/**
 * Generate BreadcrumbList structured data
 * @param items Array of breadcrumb items with name and optional URL
 */
export function generateBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && index < items.length - 1 ? { item: item.url } : {}),
    })),
  };
}

/**
 * Generate WebPage structured data
 * @param title Page title
 * @param description Page description
 * @param url Page URL
 * @param breadcrumbs Optional breadcrumb items
 */
export function generateWebPage(
  title: string,
  description: string,
  url: string,
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${url}#webpage`,
    name: title,
    description,
    url,
    isPartOf: {
      '@id': `${BASE_URL}/#website`,
    },
    about: {
      '@id': `${BASE_URL}/#organization`,
    },
    inLanguage: 'en-US',
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbList(breadcrumbs);
  }

  return schema;
}

/**
 * Generate Article structured data for case detail pages
 * Treats legal cases as articles with full documentation
 */
export function generateArticle(data: ArticleData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${data.url}#article`,
    headline: data.headline,
    description: data.description,
    url: data.url,
    image: data.image || ORG_LOGO,
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    author: getOrganizationRef(),
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: ORG_NAME,
      logo: {
        '@type': 'ImageObject',
        url: ORG_LOGO,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': data.url,
    },
    isAccessibleForFree: true,
    inLanguage: 'en-US',
  };
}

/**
 * Generate LegalCase structured data
 * Uses the more specific Schema.org LegalCase type when appropriate
 */
export function generateLegalCase(caseData: CaseData) {
  const caseUrl = `${BASE_URL}/cases/${caseData.id}`;
  const caseName = `${caseData.plaintiff} v. ${caseData.defendant}`;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${caseUrl}#article`,
    headline: `${caseData.caseNumber}: ${caseName}`,
    name: caseName,
    description:
      caseData.caseFacts?.substring(0, 300) ||
      `Legal case documentation for ${caseName} in ${caseData.jurisdiction || 'Unknown jurisdiction'}`,
    url: caseUrl,
    datePublished: caseData.filedDate || caseData.createdAt,
    dateModified: caseData.updatedAt,
    author: getOrganizationRef(),
    publisher: {
      '@type': 'Organization',
      '@id': `${BASE_URL}/#organization`,
      name: ORG_NAME,
      logo: {
        '@type': 'ImageObject',
        url: ORG_LOGO,
      },
    },
    about: [
      ...(caseData.causesOfAction || []).map((cause) => ({
        '@type': 'Thing',
        name: cause,
      })),
      {
        '@type': 'Thing',
        name: 'Civil Rights',
      },
    ],
    mentions: [
      {
        '@type': 'Person',
        name: caseData.plaintiff,
        description: 'Plaintiff',
      },
      {
        '@type': 'Organization',
        name: caseData.defendant,
        description: 'Defendant',
      },
    ],
    locationCreated: caseData.jurisdiction
      ? {
          '@type': 'Place',
          name: caseData.jurisdiction,
        }
      : undefined,
    isAccessibleForFree: true,
    inLanguage: 'en-US',
  };
}

/**
 * Generate CollectionPage structured data for case listing
 */
export function generateCollectionPage(data: CollectionPageData) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${data.url}#collectionpage`,
    name: data.name,
    description: data.description,
    url: data.url,
    isPartOf: {
      '@id': `${BASE_URL}/#website`,
    },
    about: {
      '@id': `${BASE_URL}/#organization`,
    },
    mainEntity: {
      '@type': 'ItemList',
      name: 'Documented Legal Cases',
      description:
        'Searchable database of documented legal misconduct and civil rights violation cases',
      numberOfItems: data.itemCount,
      itemListOrder: 'https://schema.org/ItemListOrderDescending',
    },
    inLanguage: 'en-US',
  };
}

/**
 * Generate ContactPage structured data
 */
export function generateContactPage() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    '@id': `${BASE_URL}/contact#contactpage`,
    name: 'Contact MISJustice Alliance',
    description:
      'Secure and anonymous contact methods for submitting cases or inquiries to MISJustice Alliance.',
    url: `${BASE_URL}/contact`,
    mainEntity: {
      '@id': `${BASE_URL}/#organization`,
    },
    isPartOf: {
      '@id': `${BASE_URL}/#website`,
    },
    inLanguage: 'en-US',
  };
}

/**
 * Generate AboutPage structured data
 */
export function generateAboutPage() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    '@id': `${BASE_URL}/mission#aboutpage`,
    name: 'About MISJustice Alliance',
    description:
      'Learn about MISJustice Alliance mission to document legal misconduct and defend civil rights through decentralized technology.',
    url: `${BASE_URL}/mission`,
    mainEntity: {
      '@id': `${BASE_URL}/#organization`,
    },
    isPartOf: {
      '@id': `${BASE_URL}/#website`,
    },
    inLanguage: 'en-US',
  };
}

/**
 * Generate Dataset structured data for the case database
 * Useful for Google Dataset Search visibility
 */
export function generateDataset(caseCount?: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    '@id': `${BASE_URL}/#dataset`,
    name: 'MISJustice Alliance Legal Misconduct Case Database',
    description:
      'Comprehensive database of documented legal misconduct cases, civil rights violations, and institutional abuse. Includes case documentation, evidence archives, and legal analysis stored permanently on Arweave permaweb.',
    url: `${BASE_URL}/cases`,
    identifier: `${BASE_URL}/cases`,
    keywords: [
      'civil rights violations',
      'legal misconduct',
      'police misconduct',
      'prosecutorial misconduct',
      'judicial corruption',
      'institutional abuse',
      'whistleblower cases',
      'Section 1983 claims',
    ],
    license: 'https://creativecommons.org/licenses/by-nc/4.0/',
    creator: getOrganizationRef(),
    publisher: getOrganizationRef(),
    datePublished: '2024-01-01',
    dateModified: new Date().toISOString().split('T')[0],
    spatialCoverage: {
      '@type': 'Place',
      name: 'United States',
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/html',
        contentUrl: `${BASE_URL}/cases`,
      },
    ],
    ...(caseCount !== undefined && { numberOfItems: caseCount }),
    isAccessibleForFree: true,
    inLanguage: 'en-US',
  };
}

/**
 * Generate ItemPage structured data for individual case pages
 * More specific than Article for database-driven content
 */
export function generateItemPage(
  name: string,
  description: string,
  url: string,
  dateCreated?: string,
  dateModified?: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemPage',
    '@id': `${url}#itempage`,
    name,
    description,
    url,
    isPartOf: {
      '@id': `${BASE_URL}/#website`,
    },
    about: {
      '@id': `${BASE_URL}/#organization`,
    },
    dateCreated,
    dateModified: dateModified || dateCreated,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    publisher: getOrganizationRef(),
  };
}

/**
 * Generate ContactPoint structured data
 * Used for organization contact information
 */
export interface ContactPointOptions {
  contactType: string;
  name?: string;
  telephone?: string;
  email?: string;
  url?: string;
  areaServed?: string;
  availableLanguage?: string;
  hoursAvailable?: string;
}

export function generateContactPoint(options: ContactPointOptions) {
  const contactPoint: Record<string, unknown> = {
    '@type': 'ContactPoint',
    contactType: options.contactType,
  };

  if (options.name) contactPoint.name = options.name;
  if (options.telephone) contactPoint.telephone = options.telephone;
  if (options.email) contactPoint.email = options.email;
  if (options.url) contactPoint.url = options.url;
  if (options.areaServed) contactPoint.areaServed = options.areaServed;
  if (options.availableLanguage) contactPoint.availableLanguage = options.availableLanguage;
  if (options.hoursAvailable) contactPoint.hoursAvailable = options.hoursAvailable;

  return contactPoint;
}

/**
 * Generate Service structured data
 * Describes services provided by the organization
 */
export interface ServiceOptions {
  name: string;
  description: string;
  serviceType: string;
  provider: object;
  areaServed?: string;
  audience?: string;
}

export function generateService(options: ServiceOptions) {
  const service: Record<string, unknown> = {
    '@type': 'Service',
    name: options.name,
    description: options.description,
    serviceType: options.serviceType,
    provider: options.provider,
  };

  if (options.areaServed) service.areaServed = options.areaServed;
  if (options.audience) service.audience = options.audience;

  return service;
}

/**
 * Generate Person structured data
 * Used for mentions of people in cases (plaintiff, defendant, etc.)
 */
export interface PersonOptions {
  name: string;
  type?: string;
  url?: string;
  description?: string;
}

export function generatePerson(options: PersonOptions) {
  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: options.name,
  };

  if (options.type) {
    person.description = options.type;
  }

  if (options.url) person.url = options.url;
  if (options.description && !options.type) person.description = options.description;

  return person;
}

/**
 * Generate Place structured data
 * Used for jurisdiction and location information
 */
export interface PlaceOptions {
  name: string;
  addressLocality?: string;
  addressRegion?: string;
  addressCountry?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
}

export function generatePlace(options: PlaceOptions) {
  const place: Record<string, unknown> = {
    '@type': 'Place',
    name: options.name,
  };

  // Add address if any address fields are provided
  if (options.addressLocality || options.addressRegion || options.addressCountry) {
    const address: Record<string, unknown> = {
      '@type': 'PostalAddress',
    };

    if (options.addressLocality) address.addressLocality = options.addressLocality;
    if (options.addressRegion) address.addressRegion = options.addressRegion;
    if (options.addressCountry) address.addressCountry = options.addressCountry;

    place.address = address;
  }

  // Add geo coordinates if provided
  if (options.geo) {
    place.geo = {
      '@type': 'GeoCoordinates',
      latitude: options.geo.latitude,
      longitude: options.geo.longitude,
    };
  }

  return place;
}

/**
 * Generate FAQPage structured data
 * Used for pages with frequently asked questions
 */
export interface FAQOptions {
  title: string;
  description: string;
  url: string;
  questions: Array<{ question: string; answer: string }>;
  breadcrumbs?: BreadcrumbItem[];
}

export function generateFAQPage(options: FAQOptions) {
  const faqPage = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${options.url}#faqpage`,
    name: options.title,
    description: options.description,
    url: options.url,
    mainEntity: options.questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
    inLanguage: 'en-US',
  };

  // If breadcrumbs provided, return array with both FAQ and breadcrumbs
  if (options.breadcrumbs && options.breadcrumbs.length > 0) {
    return [faqPage, generateBreadcrumbList(options.breadcrumbs)];
  }

  return faqPage;
}

/**
 * Combine multiple structured data objects into an array
 * Useful for pages that need multiple schema types
 */
export function combineStructuredData(...schemas: object[]) {
  return schemas;
}

export default {
  generateBreadcrumbList,
  generateWebPage,
  generateArticle,
  generateLegalCase,
  generateCollectionPage,
  generateContactPage,
  generateAboutPage,
  generateDataset,
  generateItemPage,
  generateContactPoint,
  generateService,
  generatePerson,
  generatePlace,
  generateFAQPage,
  getOrganizationRef,
  combineStructuredData,
};
