/**
 * Standard HTML SEO metadata configuration.
 *
 * Defines the core metadata used by search engines to index the page.
 *
 * @public
 * @since 3.0.0
 */
export interface MetaConfig {
  /** The page title tag content. */
  title: string
  /** The meta description content. */
  description?: string
  /** An array of keywords for the meta keywords tag. */
  keywords?: string[]
  /** The canonical URL for the page. */
  canonical?: string
  /** The robots directive (e.g., 'index, follow'). */
  robots?: string
}

/**
 * Open Graph metadata configuration for social sharing.
 *
 * Used by Facebook, LinkedIn, Discord, etc., to generate rich previews.
 *
 * @public
 * @since 3.0.0
 */
export interface OpenGraphConfig {
  /** The type of your object, e.g., 'website', 'article'. */
  type?: 'website' | 'article' | 'product' | 'profile' | string
  /** The title of your object as it should appear within the graph. */
  title: string
  /** A one to two sentence description of your object. */
  description?: string
  /** The URL of an image which should represent your object within the graph. */
  image?: string | { url: string; width?: number; height?: number; alt?: string }
  /** The canonical URL of your object that will be used as its permanent ID in the graph. */
  url?: string
  /** If your object is part of a larger web site, the name which should be displayed for the whole site. */
  siteName?: string
  /** The locale these tags are marked up in. Defaults to en_US. */
  locale?: string
  /** An array of other locales this page is available in. */
  alternateLocales?: string[]
}

/**
 * Twitter Card metadata configuration.
 *
 * Used by Twitter (X) to generate summary cards for shared links.
 *
 * @public
 * @since 3.0.0
 */
export interface TwitterCardConfig {
  /** The card type, which will be one of 'summary', 'summary_large_image', 'app', or 'player'. */
  card?: 'summary' | 'summary_large_image' | 'app' | 'player'
  /** @username for the website used in the card footer. */
  site?: string
  /** @username for the content creator / author. */
  creator?: string
  /** Title of content (max 70 characters). */
  title?: string
  /** Description of content (maximum 200 characters). */
  description?: string
  /** URL of image to use in the card. */
  image?: string
}

/**
 * JSON-LD structured data configuration.
 *
 * Used to provide search engines with detailed information about the page content
 * (e.g., product details, organization info).
 *
 * @public
 * @since 3.0.0
 */
export interface JsonLdConfig {
  /** The schema.org type, e.g., 'Organization', 'WebSite'. */
  type: string
  /** The raw schema data object. */
  data: Record<string, unknown>
}

/**
 * Configuration for various web analytics tracking pixels and scripts.
 *
 * Allows injecting tracking codes for popular analytics platforms.
 *
 * @public
 * @since 3.0.0
 */
export interface AnalyticsConfig {
  /** Google Analytics 4 (gtag.js) Measurement ID. */
  gtag?: string // G-XXXXXXX
  /** Meta (Facebook) Pixel ID. */
  pixel?: string // FB Pixel
  /** Baidu Tongji (HM) Tracking ID. */
  baidu?: string // Baidu HM
}

/**
 * Combined SEO configuration for a single page.
 *
 * Aggregates all SEO-related configurations into a single object for easy management.
 *
 * @public
 * @since 3.0.0
 */
export interface PageSeoConfig {
  /** Standard HTML meta tags. */
  meta: MetaConfig
  /** Open Graph tags. */
  og?: OpenGraphConfig
  /** Twitter Card tags. */
  twitter?: TwitterCardConfig
  /** Structured data in JSON-LD format. */
  jsonLd?: JsonLdConfig | JsonLdConfig[]
  /** Analytics tracking configurations. */
  analytics?: AnalyticsConfig
}
