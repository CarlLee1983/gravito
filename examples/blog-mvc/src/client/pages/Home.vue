<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit,
  LogIn,
  LogOut,
  Newspaper,
  PlusCircle,
  Search,
  Tag,
  Trash2,
  User,
} from 'lucide-vue-next'
import { ref, watch } from 'vue'
import ThemeSwitcher from '../components/ThemeSwitcher.vue'

const props = defineProps<{
  posts: {
    data: Array<{
      id: number
      slug: string
      title: string
      excerpt: string
      author: string
      status: string
      feature_image: string | null
      published_at: string
      category: {
        id: number
        name: string
        slug: string
      } | null
    }>
    pagination: {
      page: number
      perPage: number
      total: number
      totalPages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
  categories: Array<{
    id: number
    name: string
    slug: string
  }>
  filters: {
    search: string | null
    category: string | null
  }
  auth: {
    user: {
      name: string
      email: string
    } | null
  }
}>()

const search = ref(props.filters.search || '')

watch(search, (value) => {
  router.get(
    '/',
    {
      search: value,
      category: props.filters.category,
    },
    {
      preserveState: true,
      replace: true,
    }
  )
})

const filterByCategory = (slug: string | null) => {
  router.get(
    '/',
    {
      search: search.value,
      category: slug,
    },
    {
      preserveState: true,
    }
  )
}

const navigate = (page: number) => {
  router.get(
    '/',
    {
      search: search.value,
      category: props.filters.category,
      page,
    },
    {
      preserveState: true,
    }
  )
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const deletePost = (id: number) => {
  if (confirm('Are you sure you want to delete this transmission?')) {
    router.delete(`/admin/posts/${id}`)
  }
}
</script>

<template>
  <Head title="Gravito Blog" />

  <div class="min-h-screen text-foreground py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500 relative overflow-hidden">
    <!-- Base Layer: Animated Mesh -->
    <div class="mesh-container">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
    </div>
    
    <!-- Pattern Layer -->
    <div class="cyber-grid"></div>
    
    <!-- Texture Layer -->
    <div class="noise-overlay"></div>

    <div class="max-w-4xl mx-auto relative z-10">
      <header class="mb-20 text-center">
        <div class="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-6 border border-primary/20 animate-pulse">
          Signal Detected // v0.4.2
        </div>
        <h1 class="text-6xl font-black tracking-tighter mb-6">
          GRAVITO <span class="text-primary italic">CORE</span>
        </h1>
        <p class="text-muted-foreground text-xl max-w-2xl mx-auto leading-relaxed mb-10 opacity-70 font-medium">
          Architecting high-performance digital narratives.
        </p>
        
        <div class="flex items-center justify-center gap-6 mb-12">
          <template v-if="auth.user">
            <Link 
              href="/admin/posts/create" 
              class="btn-premium"
            >
              <PlusCircle :size="18" />
              New Post
            </Link>
            <button 
              @click="router.post('/logout')"
              class="flex items-center gap-2 text-gray-500 hover:text-foreground text-sm font-bold transition-all uppercase tracking-widest"
            >
              <LogOut :size="16" />
              Sign Out
            </button>
          </template>
          <template v-else>
            <Link 
              href="/login" 
              class="btn-premium"
            >
              <LogIn :size="18" />
              Admin Portal
            </Link>
          </template>
          
          <ThemeSwitcher />
        </div>

        <div class="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-primary/30 to-transparent mb-12"></div>

        <!-- Functional Filter Controls -->
        <div class="space-y-8 mb-16">
          <div class="relative max-w-xl mx-auto group">
            <div class="absolute -inset-1 bg-gradient-to-r from-primary/20 to-blue-500/20 rounded-2xl blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <Search :size="20" class="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary transition-colors" />
            <input 
              v-model="search"
              type="text" 
              placeholder="Search data streams..."
              class="relative w-full bg-card/50 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:border-primary/50 transition-all text-foreground placeholder:text-gray-500 font-medium"
            />
          </div>

          <div class="flex flex-wrap justify-center gap-3">
            <button 
              @click="filterByCategory(null)"
              :class="[
                'px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all duration-300',
                !filters.category ? 'bg-primary border-primary text-black shadow-lg shadow-primary/30' : 'bg-card border-white/5 text-gray-400 hover:text-foreground hover:border-primary/30'
              ]"
            >
              All Signals
            </button>
            <button 
              v-for="cat in categories" 
              :key="cat.id"
              @click="filterByCategory(cat.slug)"
              :class="[
                'px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all duration-300',
                filters.category === cat.slug ? 'bg-primary border-primary text-black shadow-lg shadow-primary/30' : 'bg-card border-white/5 text-gray-400 hover:text-foreground hover:border-primary/30'
              ]"
            >
              {{ cat.name }}
            </button>
          </div>
        </div>
      </header>

      <div class="relative">
        <!-- Subtle inner runway -->
        <div class="absolute -inset-x-8 -inset-y-12 bg-primary/5 rounded-[4rem] blur-3xl opacity-50 pointer-events-none"></div>
        
        <div class="grid gap-16 relative z-10">
          <article v-for="post in posts.data" :key="post.id" class="glass-card flex flex-col md:flex-row gap-10 p-12 group rounded-[2.5rem]">
          <div v-if="post.feature_image" class="w-full md:w-56 h-56 rounded-2xl overflow-hidden flex-shrink-0 border border-white/10 group-hover:border-primary/40 transition-colors shadow-xl">
             <img :src="post.feature_image" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          </div>
          <div v-else class="w-full md:w-56 h-56 rounded-2xl bg-primary/5 flex items-center justify-center flex-shrink-0 border border-white/10 text-primary/20 group-hover:text-primary/40 transition-colors shadow-inner">
             <Newspaper :size="64" stroke-width="1.5" />
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-center">
            <div class="flex items-center space-x-4 mb-5 text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              <span v-if="post.category" class="text-primary flex items-center gap-1.5">
                <Tag :size="12" /> {{ post.category.name }}
              </span>
              <span class="flex items-center gap-1.5"><User :size="14" /> {{ post.author }}</span>
              <span v-if="post.published_at" class="flex items-center gap-1.5"><Calendar :size="14" /> {{ formatDate(post.published_at) }}</span>
            </div>
            
            <Link :href="`/posts/${post.slug}`">
              <h2 class="text-3xl font-extrabold mb-5 group-hover:text-primary transition-colors leading-tight">
                {{ post.title }}
              </h2>
            </Link>
            
            <p class="text-muted-foreground leading-relaxed mb-8 line-clamp-2 opacity-80 text-lg">
              {{ post.excerpt }}
            </p>
            
            <div class="flex items-center justify-between mt-auto">
              <Link :href="`/posts/${post.slug}`" class="neon-glow inline-flex items-center font-bold text-sm uppercase tracking-widest gap-2">
                Launch Transmission <ChevronRight :size="18" />
              </Link>
            </div>
          </div>

            <!-- Admin Actions -->
            <div v-if="auth.user" class="flex flex-col gap-2 ml-4">
              <Link 
                :href="`/admin/posts/${post.id}/edit`"
                class="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all"
                title="Edit transmission"
              >
                <Edit :size="16" />
              </Link>
              <button 
                @click="deletePost(post.id)"
                class="p-2 rounded-lg bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-500/50 text-gray-400 hover:text-red-500 transition-all"
                title="Redact transmission"
              >
                <Trash2 :size="16" />
              </button>
            </div>
        </article>
        </div>
      </div>

      <!-- Pagination Controls -->
      <div v-if="posts.pagination.totalPages > 1" class="mt-12 flex items-center justify-center gap-4">
        <button 
          @click="navigate(posts.pagination.page - 1)"
          :disabled="!posts.pagination.hasPrev"
          class="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-20 transition-all hover:bg-white/10"
        >
          <ChevronLeft :size="20" />
        </button>
        
        <span class="text-sm font-mono text-gray-400">
          PAGE {{ posts.pagination.page }} OF {{ posts.pagination.totalPages }}
        </span>

        <button 
          @click="navigate(posts.pagination.page + 1)"
          :disabled="!posts.pagination.hasNext"
          class="p-2 rounded-lg bg-white/5 border border-white/10 disabled:opacity-20 transition-all hover:bg-white/10"
        >
          <ChevronRight :size="20" />
        </button>
      </div>

      <footer class="mt-20 text-center text-gray-500 text-sm">
        Powered by Gravito Planet Core & Orbit Ion
      </footer>
    </div>
  </div>
</template>
