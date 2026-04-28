# Privacy Policy Documentation

This document provides instructions for maintaining and updating the MISJustice Alliance privacy policy.

## File Structure

```
frontend/
├── public/
│   ├── privacy-policy.html    # Standalone static HTML version
│   ├── privacy-policy.css     # Dedicated stylesheet
│   └── README-privacy.md      # This documentation
└── src/
    └── pages/
        └── PrivacyPolicyPage.tsx  # React component version
```

## Two Versions Explained

The privacy policy exists in two formats:

### 1. React Component (`PrivacyPolicyPage.tsx`)
- Integrated with the React SPA
- Uses Tailwind CSS classes
- Accessible via React Router at `/privacy`
- Benefits from shared layout (header, footer)
- Recommended for most users navigating the site

### 2. Standalone HTML (`privacy-policy.html`)
- Static HTML file in `/public`
- Self-contained with its own CSS
- Accessible directly at `/privacy-policy.html`
- Useful for:
  - Search engine crawlers
  - Email links
  - Legal documentation requirements
  - Archival purposes

## Updating the Privacy Policy

### Step 1: Update the Effective Dates

Both files contain dates that must be synchronized:

**In `PrivacyPolicyPage.tsx`:**
```tsx
const EFFECTIVE_DATE = 'January 5, 2025';
const LAST_UPDATED = 'January 5, 2025';
const POLICY_VERSION = '1.0';
```

**In `privacy-policy.html`:**
```html
<dd>January 5, 2025</dd>  <!-- Effective Date -->
<dd>January 5, 2025</dd>  <!-- Last Updated -->
<dd>1.0</dd>              <!-- Version -->
```

Also update the JSON-LD structured data:
```json
"datePublished": "2025-01-05",
"dateModified": "2025-01-05"
```

### Step 2: Update Version History

Add a new row to the version history table in both files:

**React version:**
```tsx
<tr className="border-t border-neutral-200">
  <td className="px-4 py-2 text-neutral-700">1.1</td>
  <td className="px-4 py-2 text-neutral-700">March 15, 2025</td>
  <td className="px-4 py-2 text-neutral-700">Added cookie policy clarification</td>
</tr>
```

**HTML version:**
```html
<tr>
    <td>1.1</td>
    <td>March 15, 2025</td>
    <td>Added cookie policy clarification</td>
</tr>
```

### Step 3: Update Content

When modifying policy content, ensure changes are made in **both files** to maintain consistency.

Key sections to review:
1. Data Collection Statement (Section 2)
2. Victim Protection (Section 3)
3. Third-Party Services (Section 4)
4. User Rights (Section 6)
5. Contact Information (Section 7)

### Step 4: Notify Users (if significant changes)

For material changes:
1. Add a banner to the homepage for 30 days
2. Update the "Last Updated" date
3. Consider email notification if contact info is collected
4. Archive the previous version

## Compliance Checklist

Before publishing updates, verify:

### Legal Requirements
- [ ] GDPR Article 13 requirements addressed
- [ ] CalOPPA compliance elements included
- [ ] COPPA considerations documented (N/A for adult-focused site)
- [ ] Plain language used throughout
- [ ] Contact information prominently displayed

### Technical Requirements
- [ ] HTML validates (use [W3C Validator](https://validator.w3.org/))
- [ ] WCAG 2.1 AA compliant (test with [WAVE](https://wave.webaim.org/))
- [ ] Mobile responsive (test on real devices)
- [ ] Print styles work correctly
- [ ] All internal links functional
- [ ] JSON-LD structured data valid

### Content Sync
- [ ] React component updated
- [ ] Static HTML updated
- [ ] Dates synchronized
- [ ] Version numbers match
- [ ] Contact email correct

## Testing Commands

```bash
# Validate HTML
npx html-validate frontend/public/privacy-policy.html

# Check accessibility
npx pa11y https://misjusticealliance.org/privacy-policy.html

# Test lighthouse score
npx lighthouse https://misjusticealliance.org/privacy-policy.html --only-categories=accessibility,seo
```

## CSS Customization

The `privacy-policy.css` file uses CSS custom properties for easy theming:

```css
:root {
    /* Brand Colors */
    --color-primary-500: #123262;  /* Navy Blue */
    --color-gold-500: #B49650;      /* Gold accent */

    /* Typography */
    --font-sans: 'Inter', system-ui, sans-serif;
    --font-serif: 'Merriweather', Georgia, serif;

    /* Spacing */
    --space-4: 1rem;
    --space-8: 2rem;

    /* Layout */
    --max-width-content: 65ch;
}
```

To match site theme changes:
1. Update custom properties in `:root`
2. Colors should match `tailwind.config.js`
3. Fonts should match site typography

## Accessibility Features

The privacy policy includes:

- Skip link for keyboard navigation
- Semantic HTML5 elements (`<header>`, `<main>`, `<article>`, `<section>`, `<footer>`)
- ARIA labels for navigation regions
- Focus indicators (outline on interactive elements)
- High contrast mode support (`prefers-contrast: high`)
- Reduced motion support (`prefers-reduced-motion: reduce`)
- Print-optimized styles
- 4.5:1 minimum contrast ratio for text

## SEO Considerations

The standalone HTML includes:
- Canonical URL reference
- Open Graph meta tags
- Twitter Card meta tags
- JSON-LD structured data
- Proper heading hierarchy
- Descriptive link text

## Contact

For privacy policy questions or updates, contact:
- **Email:** admin@misjusticealliance.org
- **Subject:** Privacy Policy Update

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2025-01-05 | 1.0 | Initial privacy policy created |
