<template>
  <div class="min-h-screen bg-base text-gray-900 dark:text-slate-200 flex font-sans transition-colors duration-500">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-900 dark:bg-[#030712] text-white flex flex-col sticky top-0 h-screen overflow-y-auto transition-all border-r dark:border-white/5">
      <div class="p-6 text-left">
        <Link href="/admin" class="flex items-center space-x-3 group text-left">
          <div class="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-lg shadow-brand-500/20">
            <div class="i-carbon-settings text-white text-xl" />
          </div>
          <span class="text-xl font-black tracking-tighter leading-none">{{ t('common.admin_portal') }}</span>
        </Link>
      </div>

      <nav class="flex-1 px-4 space-y-1 text-sm text-left">
        <div class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-widest px-4 mb-2 mt-6">{{ t('common.main_menu') }}</div>
        <Link 
          v-for="item in navItems"
          :key="item.href"
          :href="item.href" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300"
          :class="$page.url.startsWith(item.href) && (item.href !== '/admin' || $page.url === '/admin') ? 'bg-brand-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-white/5 hover:text-white'"
        >
          <div :class="item.icon" class="text-xl" />
          <span class="font-bold">{{ item.label }}</span>
        </Link>

        <div class="text-[10px] font-black text-gray-500 dark:text-gray-600 uppercase tracking-widest px-4 mb-2 mt-8">{{ t('common.system') }}</div>
        
        <!-- Language Switcher -->
        <div class="flex items-center space-x-1 px-4 py-2 bg-gray-800/50 dark:bg-black/20 rounded-xl mx-2 mb-2">
          <Link 
            v-for="l in ['en', 'zh-TW']"
            :key="l"
            :href="getLanguageLink(l)"
            class="flex-1 text-center py-1.5 text-[10px] font-black rounded-lg transition-all"
            :class="getLocale() === l ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
          >
            {{ l === 'en' ? 'EN' : '繁中' }}
          </Link>
        </div>

        <Link 
          href="/" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 dark:hover:bg-white/5 hover:text-white transition-colors"
        >
          <div class="i-carbon-launch text-xl" />
          <span class="font-bold">{{ t('common.view_live_site') }}</span>
        </Link>
      </nav>

      <div class="p-4 border-t border-gray-800 dark:border-white/5">
        <div class="flex items-center space-x-3 px-4 py-3 mb-2 text-left">
          <div class="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-xs font-black uppercase border-1 border-brand-500/30">
            {{ $page.props.auth.user.name.substring(0, 2) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-black text-white truncate leading-none">{{ $page.props.auth.user.name }}</p>
            <p class="text-[10px] text-gray-500 truncate mt-1">{{ $page.props.auth.user.role }}</p>
          </div>
        </div>
        <Link 
          href="/logout" 
          method="post" 
          as="button"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-red-900/30 hover:text-red-400 text-gray-400 transition-all text-xs font-black uppercase tracking-widest"
        >
          <div class="i-carbon-logout" />
          <span>{{ t('common.logout') }}</span>
        </Link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Header -->
      <header class="h-16 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-md border-b border-gray-200 dark:border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
        <h2 class="text-xs font-black text-gray-400 dark:text-indigo-400/40 uppercase tracking-[0.3em]">
          {{ getPageTitle() }}
        </h2>
        <div class="flex items-center space-x-4">
          <!-- Theme Toggle -->
          <button 
            @click="toggleDark"
            class="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-all border border-gray-100 dark:border-white/5"
          >
            <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-lg" />
          </button>

          <button class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors relative">
            <div class="i-carbon-notification text-xl" />
            <div class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#020617]" />
          </button>
          <div class="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2" />
          <div class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Gravito Enterprise
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-8 bg-soft">
        <!-- Flash Messages -->
        <TransitionGroup
          enter-active-class="transition duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          enter-from-class="transform -translate-y-4 opacity-0 scale-95"
          enter-to-class="transform translate-y-0 opacity-100 scale-100"
        >
          <div v-if="successMessage" key="success" class="alert-success shadow-xl dark:shadow-green-900/10 mb-8 py-4 px-6 rounded-2xl flex items-center border-none">
            <div class="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mr-4 flex-shrink-0 shadow-inner">
              <div class="i-carbon-checkmark-filled text-xl" />
            </div>
            <span class="text-sm font-bold dark:text-green-100 flex-1">{{ successMessage }}</span>
            <button @click="successMessage = null" class="w-6 h-6 flex items-center justify-center text-green-700 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800 rounded-full transition-colors">
              <div class="i-carbon-close text-base" />
            </button>
          </div>
          
          <div v-if="errorMessage" key="error" class="alert-error shadow-xl dark:shadow-red-900/10 mb-8 py-4 px-6 rounded-2xl flex items-center border-none">
            <div class="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center text-red-600 dark:text-red-400 mr-4 flex-shrink-0 shadow-inner">
              <div class="i-carbon-error-filled text-xl" />
            </div>
            <span class="text-sm font-bold dark:text-red-100 flex-1">{{ errorMessage }}</span>
            <button @click="errorMessage = null" class="w-6 h-6 flex items-center justify-center text-red-700 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800 rounded-full transition-colors">
              <div class="i-carbon-close text-base" />
            </button>
          </div>
        </TransitionGroup>

        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watchEffect, computed, watch } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { useI18n } from '../composables/useI18n';

const { t, getLocale } = useI18n();
const page = usePage();
const successMessage = ref(page.props.flash?.success);
const errorMessage = ref(page.props.flash?.error);

watch(() => page.props.flash?.success, (val) => {
  successMessage.value = val;
  if (val) setTimeout(() => successMessage.value = null, 5000);
});

watch(() => page.props.flash?.error, (val) => {
  errorMessage.value = val;
  if (val) setTimeout(() => errorMessage.value = null, 5000);
});

// Theme Logic
const isDark = ref(false);
const toggleDark = () => {
  isDark.value = !isDark.value;
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
};

watchEffect(() => {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value);
  }
});

const navItems = computed(() => [
  { label: t('common.dashboard'), href: '/admin', icon: 'i-carbon-dashboard' },
  { label: t('common.explore'), href: '/admin/events', icon: 'i-carbon-calendar' },
  { label: t('common.my_registrations'), href: '/admin/registrations', icon: 'i-carbon-user-identification' },
  { label: t('auth.name'), href: '/admin/users', icon: 'i-carbon-group' },
]);

const getPageTitle = () => {
  const url = page.url;
  if (url === '/admin') return t('common.dashboard');
  if (url.startsWith('/admin/events')) return t('common.event_management');
  if (url.startsWith('/admin/registrations')) return t('common.registration_records');
  if (url.startsWith('/admin/users')) return t('common.user_management');
  return t('common.admin');
};

const getLanguageLink = (lang: string) => {
  if (typeof window === 'undefined') return '#';
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  return url.pathname + url.search;
};

onMounted(() => {
  isDark.value = localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
});
</script>