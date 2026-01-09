import { deepMerge } from './utils/deepMerge'

export class FileMerger {
  /**
   * Merge content of two files based on their type.
   */
  merge(fileName: string, baseContent: string, overlayContent: string): string {
    if (fileName.endsWith('.json')) {
      return this.mergeJson(baseContent, overlayContent)
    }

    if (fileName.endsWith('.env') || fileName.endsWith('.env.example')) {
      return this.mergeEnv(baseContent, overlayContent)
    }

    // Default: Overlay replaces base
    return overlayContent
  }

  private mergeJson(base: string, overlay: string): string {
    try {
      const baseJson = JSON.parse(base)
      const overlayJson = JSON.parse(overlay)
      const merged = deepMerge(baseJson, overlayJson)
      return JSON.stringify(merged, null, 2)
    } catch (e) {
      console.warn('Failed to merge JSON, returning overlay', e)
      return overlay
    }
  }

  private mergeEnv(base: string, overlay: string): string {
    // Simple append for now
    return `${base}\n# --- Overlay ---\n${overlay}`
  }
}
