/**
 * Date formatting utilities for consistent date display across the application
 */

/**
 * Formats a date string into a human-readable format
 * @param dateString - ISO date string, null, or undefined
 * @param options - Optional Intl.DateTimeFormat options
 * @returns Formatted date string or 'N/A' if invalid
 */
export const formatDate = (
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
): string => {
  if (!dateString) return 'N/A';

  try {
    return new Date(dateString).toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Invalid date format:', dateString, error);
    return 'Invalid Date';
  }
};

/**
 * Formats a date into a short format (MM/DD/YYYY)
 */
export const formatDateShort = (dateString: string | null | undefined): string => {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
};

/**
 * Formats a date with relative time (e.g., "2 days ago")
 */
export const formatRelativeDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
};
