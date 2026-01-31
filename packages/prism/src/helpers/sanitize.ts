import type { HelperFunction } from '../engine/TemplateEngine'
import { Sanitizer } from '../security/Sanitizer'

export function createSanitizeHelper(): HelperFunction {
  const sanitizer = new Sanitizer()

  return (
    args: Record<string, string | number | boolean>,
    data: Record<string, unknown>
  ): string => {
    const htmlArg = args.html ?? args.content

    if (!htmlArg) {
      throw new Error('Sanitize helper requires "html" or "content" parameter')
    }

    let html: string
    if (typeof htmlArg === 'string') {
      html = htmlArg
    } else if (typeof data[String(htmlArg)] === 'string') {
      html = String(data[String(htmlArg)])
    } else {
      html = String(htmlArg)
    }

    const mode = args.mode ? String(args.mode) : 'default'

    if (mode === 'strip') {
      return sanitizer.stripAllTags(html)
    }

    if (mode === 'strict') {
      const strictSanitizer = new Sanitizer({
        allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
        allowedAttributes: ['class'],
      })
      return strictSanitizer.sanitize(html)
    }

    return sanitizer.sanitize(html)
  }
}
