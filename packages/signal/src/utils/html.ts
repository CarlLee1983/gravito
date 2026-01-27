/**
 * HTML utility functions.
 *
 * Provides helper methods for processing and transforming HTML content,
 * primarily for generating plain text alternatives for emails.
 *
 * @module utils/html
 * @since 3.1.0
 */

/**
 * Convert HTML content to plain text.
 *
 * Removes all HTML tags, styles, scripts, and normalizes whitespace.
 * This is essential for generating the `text` part of a multipart email
 * to ensure compatibility with mail clients that do not support HTML.
 *
 * @param html - Source HTML string to be stripped
 * @returns Plain text content with tags and entities removed
 *
 * @example
 * ```typescript
 * const text = stripHtml('<h1>Hello</h1><p>World</p>')
 * // Returns: 'Hello World'
 * ```
 *
 * @public
 * @since 3.1.0
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, '')
    .replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}
