/**
 * Cookie Test Helpers
 *
 * Utilities for asserting cookie behavior in integration tests.
 * Handles different cookie deletion methods (Max-Age vs Expires).
 */

/**
 * Assert that a cookie has been cleared/deleted
 *
 * Express's `res.clearCookie()` can use different methods to delete cookies:
 * - Set `Max-Age=0` (forces immediate expiration)
 * - Set `Expires` to epoch time (Thu, 01 Jan 1970 00:00:00 GMT)
 * - Set empty value with expiration
 *
 * This helper accepts any valid cookie deletion method.
 *
 * @param setCookieHeader - Response Set-Cookie header value
 * @param cookieName - Name of cookie to check for deletion
 * @throws Error if cookie is not properly cleared
 *
 * @example
 * ```typescript
 * const response = await request(app).post('/api/auth/logout');
 * expectCookieCleared(
 *   response.headers['set-cookie'] as unknown as string[],
 *   'refreshToken'
 * );
 * ```
 */
export function expectCookieCleared(
  setCookieHeader: string[] | undefined,
  cookieName: string
): void {
  expect(setCookieHeader).toBeDefined();

  const cookie = setCookieHeader?.find((c: string) => c.startsWith(`${cookieName}=`));
  expect(cookie).toBeDefined();

  // Verify cookie is cleared using one of these methods:
  // 1. Empty value (e.g., "refreshToken=; Path=/")
  const hasEmptyValue = !!cookie?.match(new RegExp(`^${cookieName}=;`));

  // 2. Expires set to epoch time (1970-01-01)
  const isExpired = !!cookie?.match(/Expires=.*(?:1970|Thu, 01 Jan 1970)/);

  // 3. Max-Age set to 0 (immediate expiration)
  const hasMaxAgeZero = cookie?.includes('Max-Age=0') || false;

  const isCleared = hasEmptyValue || isExpired || hasMaxAgeZero;

  expect(isCleared).toBe(true);
}

/**
 * Assert that a cookie has expected attributes
 *
 * @param setCookieHeader - Response Set-Cookie header value
 * @param cookieName - Name of cookie to check
 * @param expectedAttributes - Expected cookie attributes
 *
 * @example
 * ```typescript
 * const response = await request(app).post('/api/auth/login');
 * expectCookieAttributes(
 *   response.headers['set-cookie'] as unknown as string[],
 *   'refreshToken',
 *   {
 *     httpOnly: true,
 *     secure: false, // Test environment
 *     sameSite: 'Strict',
 *     path: '/'
 *   }
 * );
 * ```
 */
export function expectCookieAttributes(
  setCookieHeader: string[] | undefined,
  cookieName: string,
  expectedAttributes: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
    domain?: string;
    maxAge?: number;
  }
): void {
  expect(setCookieHeader).toBeDefined();

  const cookie = setCookieHeader?.find((c: string) => c.startsWith(`${cookieName}=`));
  expect(cookie).toBeDefined();

  if (expectedAttributes.httpOnly !== undefined) {
    if (expectedAttributes.httpOnly) {
      expect(cookie).toContain('HttpOnly');
    } else {
      expect(cookie).not.toContain('HttpOnly');
    }
  }

  if (expectedAttributes.secure !== undefined) {
    if (expectedAttributes.secure) {
      expect(cookie).toContain('Secure');
    } else {
      expect(cookie).not.toContain('Secure');
    }
  }

  if (expectedAttributes.sameSite) {
    expect(cookie).toContain(`SameSite=${expectedAttributes.sameSite}`);
  }

  if (expectedAttributes.path) {
    expect(cookie).toContain(`Path=${expectedAttributes.path}`);
  }

  if (expectedAttributes.domain) {
    expect(cookie).toContain(`Domain=${expectedAttributes.domain}`);
  }

  if (expectedAttributes.maxAge !== undefined) {
    expect(cookie).toContain(`Max-Age=${expectedAttributes.maxAge}`);
  }
}

/**
 * Extract cookie value from Set-Cookie header
 *
 * @param setCookieHeader - Response Set-Cookie header value
 * @param cookieName - Name of cookie to extract
 * @returns Cookie value or undefined if not found
 *
 * @example
 * ```typescript
 * const response = await request(app).post('/api/auth/login');
 * const refreshToken = extractCookieValue(
 *   response.headers['set-cookie'] as unknown as string[],
 *   'refreshToken'
 * );
 * expect(refreshToken).toBeDefined();
 * expect(refreshToken).toHaveLength(200); // Approximate JWT length
 * ```
 */
export function extractCookieValue(
  setCookieHeader: string[] | undefined,
  cookieName: string
): string | undefined {
  const cookie = setCookieHeader?.find((c: string) => c.startsWith(`${cookieName}=`));
  if (!cookie) return undefined;

  // Extract value between "cookieName=" and first ";"
  const match = cookie.match(new RegExp(`^${cookieName}=([^;]+)`));
  return match ? match[1] : undefined;
}
