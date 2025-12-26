<script setup lang="ts">
import Logo from './Logo.vue'
import { StaticLink, useFreeze } from '@gravito/freeze-vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { Globe, ChevronDown, Menu, X, ArrowUpRight } from 'lucide-vue-next'
import { useI18n } from '../composables/useI18n'

const isMobileMenuOpen = ref(false)

const isScrolled = ref(false)
const showLangMenu = ref(false)

const handleScroll = () => {
  isScrolled.value = window.scrollY > 20
}
// ... existing scroll logic ...
onMounted(() => {
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

// Use @gravito/freeze-vue for locale management
const { locale, navigateToLocale } = useFreeze()
const { t } = useI18n()

const navLinks = [
  { label: 'Features', path: '/features' },
  { label: 'Documentation', path: '/docs/introduction' },
  { label: 'Frameworks', path: '/docs/frameworks' },
  { label: 'Gravito Framework', path: 'https://gravito.dev/en/docs/guide/seo-engine' },
  { label: 'GitHub', path: 'https://github.com/gravito-framework/gravito/tree/main/packages/luminosity' },
]

const toggleLang = () => {
  showLangMenu.value = !showLangMenu.value
}

const switchLang = (lang: string) => {
  navigateToLocale(lang)
}
</script>

<template>
  <header 
    class="fixed top-0 left-0 right-0 z-50 transition-all duration-500 py-6"
    :class="{ 'py-4 backdrop-blur-xl bg-void/80 border-b border-white/5 shadow-2xl shadow-singularity/5': isScrolled }"
  >
    <div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <StaticLink href="/" @click="isMobileMenuOpen = false">
          <Logo size="sm" />
        </StaticLink>
      </div>
      
      <nav class="hidden md:flex items-center gap-2 p-1.5 backdrop-blur-md bg-white/5 rounded-2xl border border-white/5">
        <template v-for="link in navLinks" :key="link.path">
            <a 
              v-if="link.path.startsWith('http')"
              :href="link.path"
              target="_blank"
              class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-singularity hover:bg-white/5 rounded-xl transition-all"
            >
              {{ link.label }}
            </a>
            <StaticLink 
              v-else
              :href="link.path"
              class="px-4 py-2 text-sm font-medium text-gray-400 hover:text-singularity hover:bg-white/5 rounded-xl transition-all"
            >
              {{ link.label }}
            </StaticLink>
        </template>
      </nav>
      
      <div class="flex items-center gap-4">
        <!-- Language Switcher -->
        <div class="relative">
          <button 
            @click="toggleLang"
            class="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors"
          >
            <Globe :size="18" />
            <span class="text-xs font-bold uppercase">{{ locale }}</span>
            <ChevronDown :size="14" />
          </button>
          
          <div 
            v-if="showLangMenu" 
            class="absolute top-full right-0 mt-2 w-32 bg-panel border border-white/10 rounded-xl shadow-xl overflow-hidden backdrop-blur-xl flex flex-col z-50"
            @mouseleave="showLangMenu = false"
          >
            <button @click="switchLang('en')" class="px-4 py-3 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors">English</button>
            <button @click="switchLang('zh')" class="px-4 py-3 text-left hover:bg-white/5 text-sm text-gray-300 hover:text-white transition-colors">繁體中文</button>
          </div>
        </div>

        <StaticLink 
          href="/docs/getting-started" 
          class="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-singularity text-void text-sm font-bold rounded-xl hover:scale-105 hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all"
        >
          {{ t.nav.start }}
        </StaticLink>

        <!-- Mobile Menu Toggle -->
        <button 
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Menu v-if="!isMobileMenuOpen" :size="24" />
          <X v-else :size="24" />
        </button>
      </div>
    </div>

    <!-- Mobile Menu Overlay -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div 
        v-if="isMobileMenuOpen"
        class="md:hidden absolute top-full left-0 right-0 bg-void/95 backdrop-blur-2xl border-b border-white/5 py-8 px-6 shadow-2xl space-y-6 flex flex-col items-center text-center"
      >
        <template v-for="link in navLinks" :key="link.path">
            <a 
              v-if="link.path.startsWith('http')"
              :href="link.path"
              target="_blank"
              class="text-xl font-bold text-gray-400 hover:text-singularity transition-colors"
              @click="isMobileMenuOpen = false"
            >
              {{ link.label }}
            </a>
            <StaticLink 
              v-else
              :href="link.path"
              class="text-xl font-bold text-gray-400 hover:text-singularity transition-colors"
              @click="isMobileMenuOpen = false"
            >
              {{ link.label }}
            </StaticLink>
        </template>
        
        <div class="w-full h-px bg-white/5 my-4"></div>
        
        <StaticLink 
          href="/docs/getting-started" 
          class="w-full py-4 bg-singularity text-void font-bold rounded-2xl flex items-center justify-center gap-2"
          @click="isMobileMenuOpen = false"
        >
          {{ t.nav.start }}
        </StaticLink>
      </div>
    </transition>
  </header>
</template>
