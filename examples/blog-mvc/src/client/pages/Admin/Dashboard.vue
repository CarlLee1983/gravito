<script setup lang="ts">
import { Head, Link, router } from '@inertiajs/vue3'
import { 
  LayoutDashboard, 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  LogOut,
  ChevronRight,
  TrendingUp,
  Users,
  MessageSquare
} from 'lucide-vue-next'

defineProps<{
  posts: {
    data: any[]
    pagination: any
  },
  stats: {
    totalPosts: number
    subscribers: number
    totalComments: number
    pendingComments: number
  }
}>()

const deletePost = (id: number) => {
  if (confirm('Are you sure you want to delete this post?')) {
    router.delete(`/admin/posts/${id}`)
  }
}

const logout = () => {
  router.post('/logout')
}
</script>

<template>
  <Head title="Admin Dashboard" />

  <div class="min-h-screen text-foreground flex transition-colors duration-500 relative overflow-hidden font-sans">
    <div class="mesh-container">
      <div class="blob blob-1 !w-[80vw] !h-[80vw]"></div>
      <div class="blob blob-2 !opacity-20"></div>
      <div class="blob blob-3"></div>
    </div>
    <div class="noise-overlay"></div>
    <div class="cyber-grid opacity-30"></div>
    <!-- Sidebar -->
    <aside class="w-72 border-r border-white/10 dark:bg-black/40 bg-white/40 backdrop-blur-2xl hidden md:flex flex-col transition-all duration-500 relative z-20">
      <div class="p-6">
        <div class="flex items-center gap-3 text-cyan-400 font-bold text-xl tracking-tighter">
          <div class="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            G
          </div>
          GRAVITO
        </div>
      </div>

      <nav class="flex-1 px-6 py-8 space-y-2">
        <Link href="/admin/dashboard" class="flex items-center gap-3 px-4 py-3 bg-primary/10 text-primary rounded-2xl transition-all border border-primary/20 shadow-lg shadow-primary/10">
          <LayoutDashboard :size="20" stroke-width="2.5" />
          <span class="font-bold tracking-tight">Dashboard</span>
        </Link>
        <Link href="/" class="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-foreground hover:bg-primary/5 rounded-2xl transition-all font-bold tracking-tight group">
          <Eye :size="20" class="group-hover:text-primary transition-colors" />
          <span>View Site</span>
        </Link>
      </nav>

      <div class="p-4 border-t border-white/10">
        <button @click="logout" class="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
          <LogOut :size="20" />
          <span class="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col min-w-0">
      <header class="h-16 border-b border-white/10 dark:bg-[#0a0c14]/50 bg-white/50 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10 transition-colors duration-300">
        <h1 class="text-lg font-semibold text-foreground">Dashboard Overview</h1>
        
        <div class="flex items-center gap-4">
          <ThemeSwitcher />
          <Link href="/admin/posts/create" class="btn-premium py-2 text-sm shadow-cyan-500/10">
            <Plus :size="18" />
            New Post
          </Link>
        </div>
      </header>

      <div class="p-8 space-y-8 max-w-7xl mx-auto w-full">
        <!-- Stats Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div class="p-8 glass-card group">
            <div class="absolute -right-6 -bottom-6 text-primary/5 group-hover:text-primary/10 group-hover:scale-110 transition-all duration-700">
              <FileText :size="120" />
            </div>
            <div class="flex items-center gap-5 mb-6">
              <div class="p-4 bg-primary/10 rounded-2xl text-primary shadow-inner">
                <FileText :size="28" />
              </div>
              <div>
                <div class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">Total Posts</div>
                <div class="text-3xl font-black tracking-tight">{{ stats.totalPosts }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-green-500 font-bold">
              <TrendingUp :size="14" />
              <span>+12% Organic Growth</span>
            </div>
          </div>

          <div class="p-8 glass-card group">
            <div class="absolute -right-6 -bottom-6 text-purple-500/5 group-hover:text-purple-500/10 group-hover:scale-110 transition-all duration-700">
              <Users :size="120" />
            </div>
            <div class="flex items-center gap-5 mb-6">
              <div class="p-4 bg-purple-500/10 rounded-2xl text-purple-500 shadow-inner">
                <Users :size="28" />
              </div>
              <div>
                <div class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">Subscribers</div>
                <div class="text-3xl font-black tracking-tight">{{ stats.subscribers }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-green-500 font-bold">
              <TrendingUp :size="14" />
              <span>+5% New Nodes</span>
            </div>
          </div>

          <div class="p-8 glass-card group">
            <div class="absolute -right-6 -bottom-6 text-pink-500/5 group-hover:text-pink-500/10 group-hover:scale-110 transition-all duration-700">
              <MessageSquare :size="120" />
            </div>
            <div class="flex items-center gap-5 mb-6">
              <div class="p-4 bg-pink-500/10 rounded-2xl text-pink-500 shadow-inner">
                <MessageSquare :size="28" />
              </div>
              <div>
                <div class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">Engagements</div>
                <div class="text-3xl font-black tracking-tight">{{ stats.totalComments }}</div>
              </div>
            </div>
            <div class="flex items-center gap-1.5 text-xs text-gray-500 font-bold">
              <span class="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
              <span>{{ stats.totalComments > 0 ? '3 Awaiting Sync' : 'System Healthy' }}</span>
            </div>
          </div>
        </div>

        <!-- Recent Posts Table -->
        <div class="bg-card border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div class="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 class="text-lg font-semibold flex items-center gap-2">
              <FileText :size="20" class="text-cyan-400" />
              Recent Posts
            </h2>
            <Link href="/admin/posts/create" class="text-sm text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1 font-medium">
              Create New <ChevronRight :size="16" />
            </Link>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-black/20 text-gray-400 text-xs uppercase tracking-widest font-bold">
                  <th class="px-6 py-4">Title</th>
                  <th class="px-6 py-4">Status</th>
                  <th class="px-6 py-4">Category</th>
                  <th class="px-6 py-4">Date</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                <tr v-for="post in posts.data" :key="post.id" class="hover:bg-white/[0.02] transition-colors group">
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-white/10">
                        <img v-if="post.feature_image" :src="post.feature_image" class="w-full h-full object-cover" />
                        <div v-else class="w-full h-full flex items-center justify-center text-gray-600">
                           <FileText :size="20" />
                        </div>
                      </div>
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-foreground group-hover:text-cyan-400 transition-colors truncate">{{ post.title }}</div>
                        <div class="text-xs text-gray-500 truncate">{{ post.slug }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span :class="[
                      'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                      post.status === 'published' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    ]">
                      {{ post.status || 'published' }}
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-400">{{ post.category?.name || 'Uncategorized' }}</div>
                  </td>
                  <td class="px-6 py-4">
                    <div class="text-sm text-gray-400">{{ new Date(post.created_at).toLocaleDateString() }}</div>
                  </td>
                  <td class="px-6 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-2">
                       <Link :href="`/posts/${post.slug}`" target="_blank" class="p-2 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all" title="View">
                        <Eye :size="18" />
                      </Link>
                      <Link :href="`/admin/posts/${post.id}/edit`" class="p-2 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-all" title="Edit">
                        <Edit :size="18" />
                      </Link>
                      <button @click="deletePost(post.id)" class="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all" title="Delete">
                        <Trash2 :size="18" />
                      </button>
                    </div>
                  </td>
                </tr>
                <tr v-if="posts.data.length === 0">
                   <td colspan="5" class="px-6 py-12 text-center text-gray-500 italic">
                      No posts found. Start by creating your first article.
                   </td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <!-- Pagination -->
          <div class="p-6 border-t border-white/5 bg-black/10 flex items-center justify-between">
             <div class="text-xs text-gray-500">
                Showing {{ posts.data.length }} of {{ posts.pagination.total }} total entries
             </div>
             <div class="flex items-center gap-2">
                <button 
                  @click="router.get(`/admin/dashboard?page=${posts.pagination.page - 1}`)"
                  :disabled="!posts.pagination.hasPrev"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                   Previous
                </button>

                <div class="flex items-center gap-1">
                   <button 
                     v-for="p in posts.pagination.totalPages" 
                     :key="p"
                     @click="router.get(`/admin/dashboard?page=${p}`)"
                     :class="[
                       'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                       p === posts.pagination.page ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'
                     ]"
                   >
                     {{ p }}
                   </button>
                </div>

                <button 
                  @click="router.get(`/admin/dashboard?page=${posts.pagination.page + 1}`)"
                  :disabled="!posts.pagination.hasNext"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-gray-400 hover:bg-white/5 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                   Next
                </button>
             </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Glassmorphism effects */
.backdrop-blur-xl {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
</style>
