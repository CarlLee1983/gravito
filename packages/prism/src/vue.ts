import { defineComponent, h, type PropType } from 'vue'
import { type ImageOptions, ImageService } from './ImageService'

/**
 * Gravito Image component for Vue.
 *
 * A thin wrapper around the native `<img>` tag that uses `ImageService` to
 * automatically generate optimized attributes, including responsive `srcset`
 * and accessibility-compliant alt text.
 *
 * @example
 * ```vue
 * <template>
 *   <GravitoImage
 *     src="/hero.jpg"
 *     alt="Hero Image"
 *     :width="800"
 *     loading="eager"
 *   />
 * </template>
 *
 * <script setup>
 * import { Image as GravitoImage } from '@gravito/prism/vue';
 * </script>
 * ```
 *
 * @public
 * @since 3.0.0
 */
export const Image = defineComponent({
  name: 'GravitoImage',
  props: {
    src: {
      type: String,
      required: true,
    },
    alt: {
      type: String,
      required: true,
    },
    width: {
      type: Number,
      default: undefined,
    },
    height: {
      type: Number,
      default: undefined,
    },
    loading: {
      type: String as PropType<'lazy' | 'eager'>,
      default: 'lazy',
    },
    sizes: {
      type: String,
      default: undefined,
    },
    srcset: {
      type: [Boolean, Array] as PropType<boolean | number[]>,
      default: undefined,
    },
    decoding: {
      type: String as PropType<'async' | 'auto' | 'sync'>,
      default: 'async',
    },
    fetchpriority: {
      type: String as PropType<'high' | 'low' | 'auto'>,
      default: undefined,
    },
  },
  setup(props, { attrs }) {
    const service = new ImageService()

    return () => {
      // Map boolean false to undefined to match ImageOptions type
      const srcsetOption = props.srcset === false ? false : props.srcset

      const options: ImageOptions = {
        src: props.src,
        alt: props.alt,
        width: props.width,
        height: props.height,
        loading: props.loading,
        sizes: props.sizes,
        srcset: srcsetOption,
        class: typeof attrs.class === 'string' ? attrs.class : undefined,
        style: typeof attrs.style === 'string' ? attrs.style : undefined,
        decoding: props.decoding,
        fetchpriority: props.fetchpriority,
      }

      // Generate optimized attributes using the core service
      const imgAttrs = service.generateImageAttributes(options)

      // Render native <img> tag with optimized attributes
      return h('img', imgAttrs)
    }
  },
})
