<template>
  <div class="min-h-screen bg-base text-gray-900 dark:text-slate-200 flex font-sans transition-colors duration-500 overflow-hidden">
    
    <!-- EXECUTIVE SIDEBAR -->
    <aside class="w-72 bg-white dark:bg-[#020617] flex flex-col h-screen sticky top-0 border-r border-gray-100 dark:border-white/5 z-[60] transition-all duration-500">
      
      <!-- Brand Terminal Section -->
      <div class="p-8 pb-10">
        <Link href="/admin" class="flex items-center space-x-4 group text-left">
          <div class="relative w-12 h-12 flex items-center justify-center">
            <div class="absolute inset-0 bg-brand-600 rounded-2xl group-hover:rotate-180 transition-transform duration-700 shadow-xl shadow-brand-500/20" />
            <div class="i-carbon-settings text-white text-2xl relative z-10" />
          </div>
          <div class="flex flex-col">
            <span class="text-xl font-black tracking-tighter leading-none text-gray-900 dark:text-white">PORTAL</span>
            <span class="text-[10px] font-black text-brand-600 dark:text-brand-400 tracking-[0.2em] uppercase mt-1 leading-none">Gravito Admin</span>
          </div>
        </Link>
      </div>

      <!-- Navigation Matrix -->
      <nav class="flex-1 px-6 space-y-8 overflow-y-auto custom-scrollbar">
        <!-- Main Ingestion Group -->
        <div>
          <h4 class="px-4 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-4">{{ t('admin.nav.main_menu') }}</h4>
          <div class="space-y-1">
            <Link 
              v-for="item in primaryNav"
              :key="item.href"
              :href="item.href" 
              class="flex items-center space-x-4 px-4 py-3.5 rounded-[1.25rem] transition-all duration-300 relative group"
              :class="isNavActive(item.href) ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'"
            >
              <!-- Active Indicator Bar -->
              <div 
                v-if="isNavActive(item.href)"
                class="absolute left-0 w-1 h-6 bg-brand-600 rounded-full -translate-x-1 shadow-[0_0_10px_rgba(124,58,237,0.8)]"
              />
              
              <div class="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 shadow-inner" :class="isNavActive(item.href) ? 'bg-white dark:bg-brand-900/40 shadow-brand-500/10' : 'bg-gray-100 dark:bg-white/5 group-hover:scale-110'">
                <div :class="item.icon" class="text-lg" />
              </div>
              <span class="font-bold tracking-tight text-sm">{{ t(item.labelKey) }}</span>
            </Link>
          </div>
        </div>

        <!-- System Ops Group -->
        <div>
          <h4 class="px-4 text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.3em] mb-4">{{ t('admin.nav.system') }}</h4>
          <div class="space-y-1">
            <Link 
              href="/" 
              class="flex items-center space-x-4 px-4 py-3.5 rounded-[1.25rem] text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-300 group"
            >
              <div class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <div class="i-carbon-launch text-lg" />
              </div>
              <span class="font-bold tracking-tight text-sm">{{ t('admin.nav.view_site') }}</span>
            </Link>

            <!-- Language Rapid Switch (Integrated) -->
            <div class="p-1.5 bg-gray-100/50 dark:bg-black/20 rounded-2xl flex items-center mt-4 border border-gray-100 dark:border-white/5">
              <Link 
                v-for="l in ['en', 'zh-TW']"
                :key="l"
                :href="getLanguageLink(l)"
                class="flex-1 py-2 text-[10px] font-black rounded-xl transition-all"
                :class="getLocale() === l ? 'bg-white dark:bg-gray-800 text-brand-600 dark:text-brand-400 shadow-xl' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-400'"
              >
                {{ l === 'en' ? 'EN' : '繁中' }}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <!-- Executive Footer -->
      <div class="p-6 border-t border-gray-100 dark:border-white/5">
        <div v-if="$page.props.auth?.user" class="bg-soft rounded-3xl p-4 mb-4 border border-gray-100 dark:border-white/5">
          <div class="flex items-center space-x-3 mb-1">
            <div class="w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white font-black text-xs">
              {{ $page.props.auth.user.name?.substring(0, 2).toUpperCase() || 'AD' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-black text-gray-900 dark:text-white truncate">{{ $page.props.auth.user.name }}</p>
              <p class="text-[9px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest">{{ $page.props.auth.user.role }}</p>
            </div>
          </div>
        </div>
        
        <Link 
          href="/logout" 
          method="post" 
          as="button"
          class="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-brand-600 dark:hover:bg-brand-500 dark:hover:text-white transition-all shadow-xl shadow-gray-900/10 dark:shadow-none"
        >
          <div class="i-carbon-logout text-lg" />
          <span class="text-xs font-black uppercase tracking-widest">{{ t('admin.nav.sign_out') }}</span>
        </Link>
      </div>
    </aside>

    <!-- MAIN TERMINAL AREA -->
    <main class="flex-1 flex flex-col overflow-hidden relative">
      <!-- High-Precision Header -->
      <header class="h-20 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex items-center justify-between px-10 sticky top-0 z-50">
        <div class="flex items-center space-x-4">
          <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          <h2 class="text-xs font-black text-gray-400 dark:text-indigo-300/40 uppercase tracking-[0.4em] leading-none">
            {{ getPageTitle() }}
          </h2>
        </div>

        <div class="flex items-center space-x-6">
          <!-- Theme Driver -->
          <button 
            @click="toggleDark"
            class="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-all border border-gray-100 dark:border-white/5 shadow-sm"
          >
            <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-xl" />
          </button>

          <div class="relative group">
            <button class="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all border border-gray-100 dark:border-white/5">
              <div class="i-carbon-notification text-xl" />
              <div class="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#020617]" />
            </button>
          </div>

          <div class="h-8 w-px bg-gray-100 dark:bg-white/10" />
          
          <div class="flex items-center space-x-3 bg-brand-50 dark:bg-brand-900/20 px-4 py-2 rounded-xl border border-brand-100 dark:border-brand-500/20">
            <div class="i-carbon-security text-brand-600 dark:text-brand-400" />
            <span class="text-[10px] font-black text-brand-700 dark:text-brand-300 uppercase tracking-widest">{{ t('admin.meta.enterprise') }}</span>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-10 bg-soft transition-colors duration-500 custom-scrollbar">
        <!-- System Ingest Notification -->
        <TransitionGroup
          enter-active-class="transition duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          enter-from-class="transform -translate-y-4 opacity-0 scale-95"
          enter-to-class="transform translate-y-0 opacity-100 scale-100"
        >
          <div v-if="$page.props.flash.success" key="success" class="bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500 shadow-xl shadow-green-900/5 mb-10 py-5 px-8 rounded-2xl flex items-center">
            <div class="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mr-5 flex-shrink-0">
              <div class="i-carbon-checkmark-filled text-2xl" />
            </div>
            <span class="text-sm font-black text-green-900 dark:text-green-100">{{ $page.props.flash.success }}</span>
          </div>
          
          <div v-if="$page.props.flash.error" key="error" class="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 shadow-xl shadow-red-900/5 mb-10 py-5 px-8 rounded-2xl flex items-center">
            <div class="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 mr-5 flex-shrink-0">
              <div class="i-carbon-error-filled text-2xl" />
            </div>
            <span class="text-sm font-black text-red-900 dark:text-red-100">{{ $page.props.flash.error }}</span>
          </div>
        </TransitionGroup>

        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect } from 'vue'
import { Link, usePage } from '@inertiajs/vue3'
import { useI18n } from '../composables/useI18n'

const { t, getLocale } = useI18n()
const page = usePage()

// THEME TERMINAL LOGIC
const isDark = ref(false)
const toggleDark = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value)
  }
})

const primaryNav = [
  { labelKey: 'admin.nav.overview', href: '/admin', icon: 'i-carbon-dashboard' },
  { labelKey: 'admin.nav.events', href: '/admin/events', icon: 'i-carbon-calendar' },
  {
    labelKey: 'admin.nav.registrations',
    href: '/admin/registrations',
    icon: 'i-carbon-user-identification',
  },
  { labelKey: 'admin.nav.users', href: '/admin/users', icon: 'i-carbon-group' },
]

const isNavActive = (href: string) => {
  if (href === '/admin') return page.url === '/admin'
  return page.url.startsWith(href)
}

const getPageTitle = () => {
  const item = primaryNav.find((i) => isNavActive(i.href))
  return item ? t(item.labelKey) : t('admin.nav.main_menu')
}

const getLanguageLink = (lang: string) => {
  if (typeof window === 'undefined') return '#'
  const url = new URL(window.location.href)
  url.searchParams.set('lang', lang)
  return url.pathname + url.search
}

onMounted(() => {
  isDark.value =
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
})
</script>

<style>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.1); border-radius: 10px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); }
</style>
