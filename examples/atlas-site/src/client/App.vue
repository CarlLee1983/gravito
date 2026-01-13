<template>
  <div class="min-h-screen bg-atlas-void text-white font-sans selection:bg-primary selection:text-white flex flex-col">
    
    <!-- Ambient Background Effects -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <!-- Subtle Grid -->
      <div class="absolute inset-0 bg-subtle-grid opacity-20"></div>
      
      <!-- Top Gradient Glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary-glow/20 blur-[120px] rounded-full mix-blend-screen opacity-50"></div>
      
      <!-- Bottom Ambient -->
      <div class="absolute bottom-0 right-0 w-[800px] h-[600px] bg-atlas-nebula/30 blur-[100px] rounded-full mix-blend-screen opacity-30"></div>
    </div>

    <!-- Navbar -->
    <nav class="sticky top-0 z-50 w-full border-b border-white/5 bg-atlas-void/70 backdrop-blur-xl supports-[backdrop-filter]:bg-atlas-void/60 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        <!-- Logo -->
        <div class="flex items-center gap-3 cursor-pointer group" @click="$router.push('/')">
          <div class="relative w-8 h-8 flex items-center justify-center">
             <div class="absolute inset-0 bg-primary/20 rounded-lg rotate-3 group-hover:rotate-6 transition-transform"></div>
             <div class="absolute inset-0 bg-primary/20 rounded-lg -rotate-3 group-hover:-rotate-6 transition-transform"></div>
             <div class="relative z-10 bg-atlas-surface border border-white/10 rounded-lg w-full h-full flex items-center justify-center shadow-lg group-hover:border-primary/50 transition-colors">
                <svg class="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                  <path d="M2 17L12 22L22 17" />
                  <path d="M2 12L12 17L22 12" />
                </svg>
             </div>
          </div>
          <span class="text-lg font-display font-bold tracking-tight text-white group-hover:text-primary-glow transition-colors">
            Gravito <span class="text-primary">Atlas</span>
          </span>
        </div>

        <!-- Desktop Links -->
        <div class="hidden md:flex items-center gap-1 bg-white/5 rounded-full px-1.5 py-1 border border-white/5 backdrop-blur-md">
           <template v-for="link in navLinks" :key="link.path">
            <StaticLink v-if="link.external" :href="link.path" target="_blank" class="px-4 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">{{ t(link.name) }}</StaticLink>
            <StaticLink v-else :to="link.path" class="px-4 py-1.5 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5" active-class="bg-white/10 text-white shadow-sm">{{ t(link.name) }}</StaticLink>
          </template>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <button @click="toggleLang" class="text-xs font-mono font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-wider px-2 py-1 border border-transparent hover:border-white/10 rounded">
             {{ locale === 'en' ? 'TW' : 'EN' }}
          </button>
          
          <a href="https://github.com/gravito-framework/gravito" target="_blank" class="text-gray-400 hover:text-white transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
          </a>

          <a href="/docs" class="hidden sm:inline-flex items-center gap-2 px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-glow hover:shadow-glow-sm transition-all duration-300">
            Get Started
          </a>
        </div>
      </div>
    </nav>

    <!-- Content -->
    <div class="relative z-10 flex-grow flex flex-col">
       <router-view v-slot="{ Component }">
          <transition 
            enter-active-class="transition duration-300 ease-out" 
            enter-from-class="opacity-0 translate-y-4" 
            enter-to-class="opacity-100 translate-y-0" 
            leave-active-class="transition duration-200 ease-in" 
            leave-from-class="opacity-100" 
            leave-to-class="opacity-0" 
            mode="out-in"
          >
              <component :is="Component" />
          </transition>
      </router-view>
    </div>

    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Footer from './components/Footer.vue'
import StaticLink from './components/StaticLink.vue'

const { t, locale } = useI18n()

const navLinks = [
  { name: 'nav.home', path: '/' },
  { name: 'nav.features', path: '/features' },
  { name: 'nav.docs', path: 'https://gravito.dev/en/docs/guide/orm-usage', external: true },
]

function toggleLang() {
  locale.value = locale.value === 'en' ? 'zh-TW' : 'en'
}
</script>
