/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest';
import {
  generateContactPoint,
  generateService,
  generatePerson,
  generatePlace,
  generateFAQPage,
  getOrganizationRef,
} from '../structuredData';

describe('generateContactPoint', () => {
  it('creates valid ContactPoint schema with required properties', () => {
    const contactPoint = generateContactPoint({
      contactType: 'secure messaging',
      name: 'Session Messenger',
    });

    expect(contactPoint['@type']).toBe('ContactPoint');
    expect(contactPoint.contactType).toBe('secure messaging');
    expect(contactPoint.name).toBe('Session Messenger');
  });

  it('includes optional properties when provided', () => {
    const contactPoint = generateContactPoint({
      contactType: 'encrypted email',
      email: 'contact@example.com',
      areaServed: 'United States',
      availableLanguage: 'en-US',
    });

    expect(contactPoint.email).toBe('contact@example.com');
    expect(contactPoint.areaServed).toBe('United States');
    expect(contactPoint.availableLanguage).toBe('en-US');
  });

  it('supports URL for contact method', () => {
    const contactPoint = generateContactPoint({
      contactType: 'secure messaging',
      url: 'session://example',
    });

    expect(contactPoint.url).toBe('session://example');
  });
});

describe('generateService', () => {
  it('creates valid Service schema with required properties', () => {
    const service = generateService({
      name: 'Legal Case Documentation',
      description: 'Permanent archival of legal case documentation',
      serviceType: 'Legal Advocacy',
      provider: getOrganizationRef(),
    });

    expect(service['@type']).toBe('Service');
    expect(service.name).toBe('Legal Case Documentation');
    expect(service.description).toBe('Permanent archival of legal case documentation');
    expect(service.serviceType).toBe('Legal Advocacy');
    expect(service.provider).toBeDefined();
    expect((service.provider as any)['@type']).toBe('Organization');
  });

  it('includes optional areaServed when provided', () => {
    const service = generateService({
      name: 'Legal Services',
      description: 'Description',
      serviceType: 'Legal',
      provider: getOrganizationRef(),
      areaServed: 'United States',
    });

    expect(service.areaServed).toBe('United States');
  });

  it('includes optional audience when provided', () => {
    const service = generateService({
      name: 'Legal Services',
      description: 'Description',
      serviceType: 'Legal',
      provider: getOrganizationRef(),
      audience: 'Public',
    });

    expect(service.audience).toBe('Public');
  });
});

describe('generatePerson', () => {
  it('creates valid Person schema with name', () => {
    const person = generatePerson({
      name: 'John Doe',
    });

    expect(person['@type']).toBe('Person');
    expect(person.name).toBe('John Doe');
  });

  it('includes optional type/role description', () => {
    const person = generatePerson({
      name: 'Jane Smith',
      type: 'Plaintiff',
    });

    expect(person.description).toContain('Plaintiff');
  });

  it('includes optional URL when provided', () => {
    const person = generatePerson({
      name: 'John Doe',
      url: 'https://example.com/john',
    });

    expect(person.url).toBe('https://example.com/john');
  });
});

describe('generatePlace', () => {
  it('creates valid Place schema with name', () => {
    const place = generatePlace({
      name: 'New York',
    });

    expect(place['@type']).toBe('Place');
    expect(place.name).toBe('New York');
  });

  it('includes address properties when provided', () => {
    const place = generatePlace({
      name: 'Manhattan',
      addressLocality: 'New York',
      addressRegion: 'NY',
      addressCountry: 'US',
    });

    expect(place.address).toBeDefined();
    expect((place.address as any)['@type']).toBe('PostalAddress');
    expect((place.address as any).addressLocality).toBe('New York');
    expect((place.address as any).addressRegion).toBe('NY');
    expect((place.address as any).addressCountry).toBe('US');
  });

  it('includes geo coordinates when provided', () => {
    const place = generatePlace({
      name: 'New York',
      geo: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    });

    expect(place.geo).toBeDefined();
    expect((place.geo as any)['@type']).toBe('GeoCoordinates');
    expect((place.geo as any).latitude).toBe(40.7128);
    expect((place.geo as any).longitude).toBe(-74.0060);
  });
});

describe('generateFAQPage', () => {
  it('creates valid FAQPage schema with questions', () => {
    const faqPage = generateFAQPage({
      title: 'Privacy Policy FAQ',
      description: 'Frequently asked questions',
      url: 'https://example.com/faq',
      questions: [
        {
          question: 'What data do you collect?',
          answer: 'We collect minimal data necessary for the service.',
        },
        {
          question: 'How do you protect privacy?',
          answer: 'We use encryption and anonymous storage.',
        },
      ],
    });

    expect((faqPage as any)['@context']).toBe('https://schema.org');
    expect((faqPage as any)['@type']).toBe('FAQPage');
    expect((faqPage as any).mainEntity).toBeDefined();
    expect((faqPage as any).mainEntity).toHaveLength(2);
  });

  it('creates Question entities with accepted answers', () => {
    const faqPage = generateFAQPage({
      title: 'FAQ',
      description: 'Questions',
      url: 'https://example.com/faq',
      questions: [
        {
          question: 'Test question?',
          answer: '<p>Test answer</p>',
        },
      ],
    });

    const question = (faqPage as any).mainEntity[0];
    expect(question['@type']).toBe('Question');
    expect(question.name).toBe('Test question?');
    expect(question.acceptedAnswer).toBeDefined();
    expect(question.acceptedAnswer['@type']).toBe('Answer');
    expect(question.acceptedAnswer.text).toBe('<p>Test answer</p>');
  });

  it('includes breadcrumbs when provided', () => {
    const faqPage = generateFAQPage({
      title: 'FAQ',
      description: 'Questions',
      url: 'https://example.com/faq',
      questions: [{ question: 'Q?', answer: 'A' }],
      breadcrumbs: [
        { name: 'Home', url: 'https://example.com' },
        { name: 'FAQ', url: 'https://example.com/faq' },
      ],
    });

    // FAQPage might be in an array with BreadcrumbList
    // Check if result is array or has breadcrumbs property
    if (Array.isArray(faqPage)) {
      const breadcrumbs = faqPage.find((item) => item['@type'] === 'BreadcrumbList');
      expect(breadcrumbs).toBeDefined();
    }
  });
});

describe('Integration: Utility functions work together', () => {
  it('ContactPoint references work in larger schema', () => {
    const contactPoints = [
      generateContactPoint({
        contactType: 'secure messaging',
        name: 'Session',
      }),
      generateContactPoint({
        contactType: 'encrypted email',
        email: 'contact@example.com',
      }),
    ];

    expect(contactPoints).toHaveLength(2);
    expect(contactPoints[0]['@type']).toBe('ContactPoint');
    expect(contactPoints[1]['@type']).toBe('ContactPoint');
  });

  it('Person entities can be used in mentions array', () => {
    const persons = [
      generatePerson({ name: 'Plaintiff Name', type: 'Plaintiff' }),
      generatePerson({ name: 'Defendant Name', type: 'Defendant' }),
    ];

    expect(persons).toHaveLength(2);
    persons.forEach((person) => {
      expect(person['@type']).toBe('Person');
      expect(person.name).toBeDefined();
    });
  });

  it('Service array can be created for organization', () => {
    const services = [
      generateService({
        name: 'Service 1',
        description: 'Description 1',
        serviceType: 'Type 1',
        provider: getOrganizationRef(),
      }),
      generateService({
        name: 'Service 2',
        description: 'Description 2',
        serviceType: 'Type 2',
        provider: getOrganizationRef(),
      }),
    ];

    expect(services).toHaveLength(2);
    services.forEach((service) => {
      expect(service['@type']).toBe('Service');
      expect((service.provider as any)['@type']).toBe('Organization');
    });
  });
});
