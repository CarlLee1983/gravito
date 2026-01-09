<script setup lang="ts">
import { Head, useForm } from '@inertiajs/vue3'
import { ArrowLeft, Save, Loader2, AlertCircle, Eye, Edit3, User, Tag } from 'lucide-vue-next'
import { Link } from '@inertiajs/vue3'

import { computed, ref } from 'vue'
import { marked } from 'marked'

const props = defineProps<{
  auth: {
    user: {
      name: string
      email: string
    } | null
  }
  categories: Array<{
    id: number
    name: string
  }>
}>()

const showPreview = ref(false)

const form = useForm({
  category_id: props.categories[0]?.id || null,
  title: '',
  slug: '',
  excerpt: '',
  content: '',
  author: props.auth.user?.name || 'Antigravity',
  status: 'published',
  feature_image: '',
  feature_image_file: null as File | null
})

const submit = () => {
  form.post('/admin/posts', {
    onSuccess: () => form.reset(),
  })
}

const previewHtml = computed(() => {
  return marked.parse(form.content || '')
})

const currentCategory = computed(() => {
  return props.categories.find(c => c.id === form.category_id)?.name || 'Uncategorized'
})

// 簡單的 Slug 自動產生器
const generateSlug = () => {
  if (!form.slug) {
    form.slug = form.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
}


const previewImage = ref('')

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    form.feature_image_file = file
    previewImage.value = URL.createObjectURL(file)
  }
}
</script>

<template>
  <Head title="Create New Post" />

  <div class="min-h-screen cyber-grid py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto">
      <Link href="/" class="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors gap-2">
        <ArrowLeft :size="20" /> Cancel and back
      </Link>

      <div class="glass-card p-8 border-primary/20 bg-primary/5 mb-8 flex justify-between items-center">
        <div>
          <h1 class="text-3xl font-bold mb-2 neon-glow">New Post</h1>
          <p class="text-gray-400">Craft your next masterpiece on the Gravito Network.</p>
        </div>
        <button 
          @click="showPreview = !showPreview"
          type="button"
          class="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-all text-sm font-medium"
          :class="{ 'text-primary border-primary/50 bg-primary/5': showPreview }"
        >
          <Eye v-if="!showPreview" :size="18" />
          <Edit3 v-else :size="18" />
          {{ showPreview ? 'Back to Editor' : 'Live Preview' }}
        </button>
      </div>

      <form @submit.prevent="submit" class="space-y-6">
        <div v-if="!showPreview" class="grid gap-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Category -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Category</label>
              <select 
                v-model="form.category_id"
                class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white appearance-none"
              >
                <option v-for="cat in props.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>

            <!-- Author -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Author</label>
              <input 
                v-model="form.author" 
                type="text" 
                class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white"
                required
              />
            </div>

            <!-- Status -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Status</label>
              <select 
                v-model="form.status"
                class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white appearance-none"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </div>

            <!-- Feature Image -->
            <div class="space-y-2">
              <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Feature Image</label>
              <div class="space-y-3">
                 <input 
                  type="file" 
                  @change="handleFileChange"
                  accept="image/*"
                  class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/80"
                />
                 <div v-if="previewImage" class="mt-2">
                    <img :src="previewImage" alt="Preview" class="h-48 w-full object-cover rounded-xl border border-white/10" />
                 </div>
                 <input 
                  v-if="!form.feature_image_file"
                  v-model="form.feature_image" 
                  type="text" 
                  placeholder="Or enter image URL..."
                  class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white text-sm"
                />
              </div>
            </div>
          </div>

          <!-- Title -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Title</label>
            <input 
              v-model="form.title" 
              @blur="generateSlug"
              type="text" 
              placeholder="The Future of MVC"
              class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white"
              required
            />
            <div v-if="form.errors.title" class="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle :size="12" /> {{ form.errors.title }}
            </div>
          </div>

          <!-- Slug -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">URL Slug</label>
            <input 
              v-model="form.slug" 
              type="text" 
              placeholder="future-of-mvc"
              class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white font-mono text-sm"
              required
            />
          </div>

          <!-- Excerpt -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Excerpt</label>
            <textarea 
              v-model="form.excerpt" 
              rows="2"
              placeholder="A short summary for the feed..."
              class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white"
            ></textarea>
          </div>

          <!-- Content -->
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-300 uppercase tracking-wider">Content (Markdown)</label>
            <textarea 
              v-model="form.content" 
              rows="12"
              placeholder="Write your story here..."
              class="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary/50 transition-all text-white font-mono text-sm"
              required
            ></textarea>
          </div>
        </div>

        <!-- Preview Mode -->
        <div v-else class="glass-card p-8 border-white/10 bg-black/40 min-h-[400px]">
          <h2 class="text-4xl font-bold mb-4">{{ form.title || 'Untitled Post' }}</h2>
          <div class="flex items-center gap-4 text-gray-400 text-sm mb-8 border-b border-white/5 pb-4">
            <span class="flex items-center gap-1"><User :size="14" /> {{ form.author }}</span>
            <span class="flex items-center gap-1"><Tag :size="14" /> {{ currentCategory }}</span>
          </div>
          <div class="prose prose-invert max-w-none" v-html="previewHtml"></div>
        </div>

        <div class="flex items-center justify-end pt-4">
          <button 
            type="submit" 
            :disabled="form.processing"
            class="flex items-center gap-2 bg-primary hover:bg-primary/80 disabled:opacity-50 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            <Loader2 v-if="form.processing" class="animate-spin" :size="20" />
            <Save v-else :size="20" />
            Publish Post
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.prose :deep(h1) { @apply text-3xl font-bold mb-4 text-white; }
.prose :deep(h2) { @apply text-2xl font-bold mt-8 mb-4 text-white border-b border-white/10 pb-2; }
.prose :deep(h3) { @apply text-xl font-bold mt-6 mb-3 text-white; }
.prose :deep(p) { @apply mb-4 text-gray-300 leading-relaxed; }
.prose :deep(ul) { @apply list-disc list-inside mb-4 text-gray-300; }
.prose :deep(ol) { @apply list-decimal list-inside mb-4 text-gray-300; }
.prose :deep(code) { @apply bg-white/10 px-1.5 py-0.5 rounded text-primary text-sm; }
.prose :deep(pre) { @apply bg-black/60 p-4 rounded-xl border border-white/10 mb-4 overflow-x-auto; }
.prose :deep(pre code) { @apply bg-transparent p-0 text-gray-300 block; }
.prose :deep(blockquote) { @apply border-l-4 border-primary/50 pl-4 italic text-gray-400 mb-4; }
.prose :deep(img) { @apply rounded-xl border border-white/10 max-w-full h-auto mb-4; }
</style>
