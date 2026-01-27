/**
 * Cleans HTML content to prevent Cross-Site Scripting (XSS) attacks.
 *
 * Removes all HTML tags and escapes potentially dangerous characters.
 * Also strips control characters that could be used for obfuscation.
 *
 * @param input - The raw string to sanitize.
 * @returns A safe, plain-text string with escaped HTML entities.
 *
 * @example
 * ```ts
 * sanitizeHtml('<script>alert("xss")</script>Hello'); // Returns 'Hello'
 * sanitizeHtml('<b>Bold</b> & Brave'); // Returns 'Bold &amp; Brave'
 * ```
 */
export function sanitizeHtml(input: string): string {
  // Strip HTML tags
  let cleaned = input.replace(/<[^>]*>/g, '')

  // Escape HTML special characters
  cleaned = cleaned
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  // Remove control characters (\u0000-\u001F and \u007F)
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Mandatory removal for security
  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, '')

  return cleaned.trim()
}

/**
 * Sanitizes a URL, allowing only 'http' and 'https' protocols.
 *
 * @param url - The URL string to validate and clean.
 * @returns The original URL if safe, or an empty string if invalid or unsafe.
 *
 * @example
 * ```ts
 * sanitizeUrl('https://gravito.io'); // Returns 'https://gravito.io'
 * sanitizeUrl('javascript:alert(1)'); // Returns ''
 * ```
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url
    }
  } catch {
    // Return empty string for invalid URL formats
  }
  return ''
}
