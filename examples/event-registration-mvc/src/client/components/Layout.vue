<template>
  <div class="min-h-screen flex flex-col bg-base text-gray-900 dark:text-slate-200 font-sans selection:bg-brand-500/30 selection:text-brand-900 transition-colors duration-500">
    <!-- Premium Header -->
    <header 
      class="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      :class="isScrolled ? 'py-3' : 'py-6'"
    >
      <div class="container-wide">
        <div 
          class="glass-header rounded-2xl flex justify-between items-center px-6 transition-all duration-500"
          :class="isScrolled ? 'h-14 shadow-xl dark:shadow-black/20' : 'h-20 shadow-none border-transparent bg-transparent'"
        >
          <!-- Logo -->
          <Link href="/" class="flex items-center space-x-3 group relative text-left">
            <div class="relative w-10 h-10 flex items-center justify-center">
              <div class="absolute inset-0 bg-brand-600 rounded-xl group-hover:rotate-180 transition-transform duration-700" />
              <div class="i-carbon-event text-white text-2xl relative z-10" />
            </div>
            <div class="flex flex-col">
              <span class="text-xl font-black tracking-tighter leading-none bg-gradient-to-r from-indigo-600 via-brand-600 to-cyan-600 bg-clip-text text-transparent">
                GRAVITO
              </span>
              <span class="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase leading-none mt-1">{{ t('common.events_platform') }}</span>
            </div>
          </Link>
          
          <!-- Desktop Navigation -->
          <nav class="hidden lg:flex items-center space-x-1">
            <Link 
              v-for="item in navLinks"
              :key="item.href"
              :href="item.href" 
              class="px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 relative group"
              :class="$page.url === item.href ? 'text-brand-600' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'"
            >
              {{ item.label }}
              <div 
                class="absolute bottom-1 left-4 right-4 h-0.5 bg-brand-600 rounded-full transition-all duration-300 transform scale-x-0 group-hover:scale-x-100"
                :class="{ 'scale-x-100': $page.url === item.href }"
              />
            </Link>
            
            <div class="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-4" />

            <!-- Theme Toggle (Premium) -->
            <button 
              @click="toggleDark"
              class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 transition-all mr-2"
              title="Toggle Theme"
            >
              <div :class="isDark ? 'i-carbon-moon' : 'i-carbon-sun'" class="text-xl" />
            </button>

            <!-- Language Toggle (Professional) -->
            <div class="flex p-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl mr-4 ring-1 ring-gray-200/50 dark:ring-gray-700/50">
              <Link 
                v-for="l in ['en', 'zh-TW']"
                :key="l"
                :href="getLanguageLink(l)"
                class="px-3 py-1.5 text-[10px] font-black rounded-lg transition-all"
                :class="getLocale() === l ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'"
              >
                {{ l === 'en' ? 'EN' : '繁中' }}
              </Link>
            </div>

            <template v-if="$page.props.auth?.user">
              <div class="flex items-center space-x-3 ml-2">
                <Link 
                  href="/profile" 
                  class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 hover:text-brand-600 transition-all border-1 border-transparent hover:border-brand-100 shadow-inner"
                  title="My Profile"
                >
                  <div class="i-carbon-user-avatar text-xl" />
                </Link>
                
                <Link
                  v-if="$page.props.auth?.user?.role === 'admin'"
                  href="/admin"
                  class="btn-secondary text-sm !py-2"
                >
                  {{ t('common.dashboard') }}
                </Link>
                
                <Link 
                  href="/logout" 
                  method="post" 
                  as="button"
                  class="btn-primary !py-2 text-sm"
                >
                  {{ t('common.logout') }}
                </Link>
              </div>
            </template>
            
            <template v-else>
              <div class="flex items-center space-x-3 ml-2">
                <Link href="/login" class="btn-ghost text-sm">
                  {{ t('common.sign_in') }}
                </Link>
                <Link href="/register" class="btn-primary text-sm">
                  {{ t('common.get_started') }}
                </Link>
              </div>
            </template>
          </nav>

          <!-- Mobile Toggle -->
          <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 text-gray-600">
            <div :class="isMobileMenuOpen ? 'i-carbon-close' : 'i-carbon-menu'" class="text-2xl" />
          </button>
        </div>
      </div>
    </header>

    <!-- Notification Toasts (Premium) -->
    <div class="fixed top-24 right-6 z-[100] w-full max-w-sm space-y-3 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
        enter-from-class="transform translate-x-12 opacity-0 scale-95"
        enter-to-class="transform translate-x-0 opacity-100 scale-100"
        leave-active-class="transition duration-300 ease-in"
        leave-from-class="transform translate-x-0 opacity-100"
        leave-to-class="transform translate-x-12 opacity-0"
      >
        <div v-if="successMessage" key="success" class="pointer-events-auto">
          <div class="glass border-l-4 border-l-green-500 rounded-2xl p-4 flex items-start shadow-2xl shadow-green-500/10">
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mr-3 flex-shrink-0">
              <div class="i-carbon-checkmark-filled text-lg" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-gray-900">{{ t('common.success') }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ successMessage }}</p>
            </div>
            <button @click="successMessage = null" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-black/5 ml-2 transition-colors">
              <div class="i-carbon-close text-base" />
            </button>
          </div>
        </div>
        
        <div v-if="errorMessage" key="error" class="pointer-events-auto">
          <div class="glass border-l-4 border-l-red-500 rounded-2xl p-4 flex items-start shadow-2xl shadow-red-500/10">
            <div class="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
              <div class="i-carbon-error-filled text-lg" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-gray-900">{{ t('common.attention') }}</p>
              <p class="text-xs text-gray-500 mt-0.5">{{ errorMessage }}</p>
            </div>
            <button @click="errorMessage = null" class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-black/5 ml-2 transition-colors">
              <div class="i-carbon-close text-base" />
            </button>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <!-- Page Transition Wrapper -->
    <main class="flex-1 pt-24">
      <Transition
        name="fade"
        mode="out-in"
        appear
      >
        <div :key="$page.url">
          <slot />
        </div>
      </Transition>
    </main>

    <!-- Modern Footer -->
    <footer class="bg-white border-t border-gray-100 pt-20 pb-10 mt-20 relative overflow-hidden">
      <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-gray-100 to-transparent" />
      <div class="container-wide">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div class="col-span-1 md:col-span-2 space-y-6">
            <div class="flex items-center space-x-3">
              <div class="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center">
                <div class="i-carbon-event text-white text-xl" />
              </div>
              <span class="text-2xl font-black tracking-tighter">{{ t('common.gravito_events') }}</span>
            </div>
            <p class="text-gray-500 max-w-sm leading-relaxed">
              {{ t('common.footer_desc') }}
            </p>
            <div class="flex space-x-4">
              <a href="#" class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-500 hover:text-white transition-all"><div class="i-carbon-logo-twitter" /></a>
              <a href="#" class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-500 hover:text-white transition-all"><div class="i-carbon-logo-github" /></a>
              <a href="#" class="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-brand-500 hover:text-white transition-all"><div class="i-carbon-logo-linkedin" /></a>
            </div>
          </div>
          
          <div>
            <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">{{ t('common.platform') }}</h4>
            <ul class="space-y-4 text-sm font-bold text-gray-500">
              <li><Link href="/events" class="hover:text-brand-600 transition-colors">{{ t('common.explore') }}</Link></li>
              <li><Link href="/docs" class="hover:text-brand-600 transition-colors">Documentation</Link></li>
              <li><Link href="/status" class="hover:text-brand-600 transition-colors">API {{ t('common.status') }}</Link></li>
            </ul>
          </div>

          <div>
            <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">{{ t('common.support') }}</h4>
            <ul class="space-y-4 text-sm font-bold text-gray-500">
              <li><Link href="/help" class="hover:text-brand-600 transition-colors">{{ t('common.help_center') }}</Link></li>
              <li><Link href="/terms" class="hover:text-brand-600 transition-colors">{{ t('common.terms') }}</Link></li>
              <li><Link href="/privacy" class="hover:text-brand-600 transition-colors">{{ t('common.privacy') }}</Link></li>
            </ul>
          </div>
        </div>
        
        <div class="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {{ t('common.copyright') }}
          </p>
          <div class="flex items-center space-x-6 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>v1.0.4-stable</span>
            <div class="flex items-center">
              <div class="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
              {{ t('common.all_systems_operational') }}
            </div>
          </div>
        </div>
      </div>
    </footer>

    <!-- Mobile Menu Overlay -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isMobileMenuOpen" class="fixed inset-0 z-[60] bg-gray-900/90 backdrop-blur-lg p-6 lg:hidden">
        <div class="flex justify-end mb-12">
          <button @click="isMobileMenuOpen = false" class="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 text-white">
            <div class="i-carbon-close text-2xl" />
          </button>
        </div>
        <nav class="flex flex-col space-y-6">
          <Link 
            v-for="item in navLinks" 
            :key="item.href" 
            :href="item.href" 
            @click="isMobileMenuOpen = false"
            class="text-3xl font-black text-white hover:text-brand-400 transition-colors"
          >
            {{ item.label }}
          </Link>
          <div class="h-px bg-white/10 my-6" />
          <Link href="/login" class="text-xl font-bold text-white/60">{{ t('common.login') }}</Link>
          <Link href="/register" class="btn-primary !py-4 text-center">{{ t('common.get_started') }}</Link>
        </nav>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watchEffect, computed, watch } from 'vue';
import { Link, usePage } from '@inertiajs/vue3';
import { useI18n } from '../composables/useI18n';

const { t, getLocale } = useI18n();
const isScrolled = ref(false);
const isMobileMenuOpen = ref(false);
const page = usePage();
const successMessage = ref<any>(page.props.flash?.success);
const errorMessage = ref<any>(page.props.flash?.error);

watch(() => page.props.flash?.success, (val) => {
  successMessage.value = val;
  if (val) setTimeout(() => successMessage.value = null, 5000);
});

watch(() => page.props.flash?.error, (val) => {
  errorMessage.value = val;
  if (val) setTimeout(() => errorMessage.value = null, 5000);
});

// Dark Mode logic
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

const navLinks = computed(() => [
  { label: t('common.home'), href: '/' },
  { label: t('common.explore'), href: '/events' },
]);

const getLanguageLink = (lang: string) => {
  if (typeof window === 'undefined') return '#';
  const url = new URL(window.location.href);
  url.searchParams.set('lang', lang);
  return url.pathname + url.search;
};

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20;
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
  // Initialize theme from storage or system
  isDark.value = localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
