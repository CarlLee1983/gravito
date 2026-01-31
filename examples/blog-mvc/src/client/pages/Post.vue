<script setup lang="ts">
import { marked } from 'marked'
import { computed } from 'vue'

const props = defineProps<{
  post: {
    title: string
    content: string
    author: string
    published_at: string
    category: {
      id: number
      name: string
      slug: string
    } | null
    tags: Array<{
      id: number
      name: string
      slug: string
    }>
  }
  relatedPosts: Array<{
    title: string
    slug: string
    excerpt: string
    published_at: string
    feature_image: string | null
    category: { name: string } | null
  }>
}>()

const postHtml = computed(() => {
  return marked.parse(props.post.content || '')
})

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <Head :title="post.title" />

  <div class="min-h-screen cyber-grid py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto">
      <Link href="/" class="inline-flex items-center text-gray-400 hover:text-white mb-12 transition-colors gap-2">
        <ArrowLeft :size="20" /> Back to feed
      </Link>

      <article>
        <header class="mb-12">
          <h1 class="text-4xl sm:text-6xl font-bold tracking-tight mb-8 neon-glow leading-tight text-white">
            {{ post.title }}
          </h1>
          
          <div class="flex flex-wrap items-center gap-6 text-gray-400 border-y border-white/5 py-6">
            <div class="flex items-center gap-2">
              <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                {{ post.author[0] }}
              </div>
              <div>
                <p class="text-white font-medium">{{ post.author }}</p>
                <p class="text-xs uppercase tracking-tighter">Author</p>
              </div>
            </div>
            
            <div class="flex items-center gap-2">
              <Calendar class="text-primary" :size="20" />
              <span>{{ formatDate(post.published_at) }}</span>
            </div>

            <div v-if="post.category" class="flex items-center gap-2">
              <TagIcon class="text-primary" :size="20" />
              <span class="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded font-bold text-xs">
                {{ post.category.name }}
              </span>
            </div>

            <!-- Tags Display -->
            <div v-if="post.tags && post.tags.length > 0" class="flex flex-wrap items-center gap-2 ml-4 pl-4 border-l border-white/10">
               <div v-for="tag in post.tags" :key="tag.id" class="flex items-center text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-full hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer">
                  <Hash :size="12" class="mr-1 opacity-50"/> {{ tag.name }}
               </div>
            </div>
          </div>
        </header>

        <div class="prose prose-invert prose-lg max-w-none mb-20" v-html="postHtml"></div>

        <div class="flex items-center justify-between border-t border-white/5 pt-8 mb-20">
          <div class="flex gap-4">
            <button class="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors">
              <MessageSquare :size="18" /> Feedback
            </button>
            <button class="glass-card px-4 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors">
              <Share2 :size="18" /> Share
            </button>
          </div>
          </div>


        <!-- Related Posts Section -->
        <section v-if="relatedPosts.length > 0" class="border-t border-white/10 pt-16 mt-16">
           <h3 class="text-3xl font-bold mb-8 text-white flex items-center gap-3">
              <span class="text-primary">///</span> Related Signals
           </h3>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Link v-for="related in relatedPosts" :key="related.slug" :href="`/posts/${related.slug}`" class="group block bg-black/40 border border-white/5 hover:border-primary/50 transition-all p-6 rounded-xl relative overflow-hidden">
                 <div class="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                 
                 <div class="flex items-center gap-2 mb-3">
                    <span v-if="related.category" class="text-xs font-bold text-primary uppercase tracking-wider">{{ related.category.name }}</span>
                    <span class="text-xs text-gray-500">•</span>
                    <span class="text-xs text-gray-500">{{ formatDate(related.published_at) }}</span>
                 </div>
                 
                 <h4 class="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">
                    {{ related.title }}
                 </h4>
                 
                 <p class="text-gray-400 text-sm line-clamp-2 mb-4">
                    {{ related.excerpt }}
                 </p>
                 
                 <div class="flex items-center text-primary text-sm font-medium group-hover:translate-x-2 transition-transform">
                    Read Stream <ArrowRight :size="16" class="ml-1" />
                 </div>
              </Link>
           </div>
        </section>
      </article>
    </div>
  </div>
</template>

<style scoped>
.prose :deep(h1) { @apply text-3xl font-bold mb-4 text-white; }
.prose :deep(h2) { @apply text-2xl font-bold mt-8 mb-4 text-white border-b border-white/10 pb-2; }
.prose :deep(h3) { @apply text-xl font-bold mt-6 mb-3 text-white; }
.prose :deep(p) { @apply mb-6 text-gray-300 leading-relaxed text-xl; }
.prose :deep(ul) { @apply list-disc list-inside mb-6 text-gray-300 text-lg; }
.prose :deep(ol) { @apply list-decimal list-inside mb-6 text-gray-300 text-lg; }
.prose :deep(code) { @apply bg-white/10 px-1.5 py-0.5 rounded text-primary text-base; }
.prose :deep(pre) { @apply bg-black/60 p-6 rounded-xl border border-white/10 mb-8 overflow-x-auto; }
.prose :deep(pre code) { @apply bg-transparent p-0 text-gray-300 block text-sm; }
.prose :deep(blockquote) { @apply border-l-4 border-primary/50 pl-6 italic text-gray-400 mb-8 text-xl; }
.prose :deep(img) { @apply rounded-xl border border-white/10 max-w-full h-auto mb-8 mx-auto shadow-2xl; }
</style>
