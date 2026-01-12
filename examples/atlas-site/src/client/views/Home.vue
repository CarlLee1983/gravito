<template>
  <div class="relative z-10 pb-32">
    <!-- Hero Section -->
    <main class="relative z-20 flex flex-col items-center justify-center px-6 md:px-20 max-w-7xl mx-auto w-full min-h-[85vh] pt-24 md:pt-32 text-center">
      
      <!-- Announcement Badge -->
      <div class="mb-8 animate-slide-in-up" style="animation-delay: 0.1s">
        <a href="https://github.com/gravito-framework/gravito" target="_blank" class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-primary-glow hover:bg-white/10 hover:border-primary/30 transition-all cursor-pointer group backdrop-blur-md">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Atlas v1.0 is now available
          <span class="group-hover:translate-x-0.5 transition-transform">→</span>
        </a>
      </div>

      <!-- Main Heading -->
      <h1 class="text-5xl md:text-7xl lg:text-8xl font-display font-bold text-white mb-8 leading-[1.1] tracking-tight max-w-5xl mx-auto animate-slide-in-up" style="animation-delay: 0.2s">
        The <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary-glow to-primary">Universal</span><br class="hidden md:block" /> Database Interface
      </h1>
      
      <!-- Subheading -->
      <p class="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-in-up" style="animation-delay: 0.3s">
        {{ t('hero.desc') }}
      </p>

      <!-- CTA Buttons -->
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-center animate-slide-in-up" style="animation-delay: 0.4s">
        <StaticLink href="#installation" class="h-12 px-8 rounded-full bg-white text-atlas-void font-bold text-base hover:bg-gray-100 transition-colors flex items-center justify-center shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform duration-200">
            {{ t('nav.install') }}
            <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </StaticLink>
        <StaticLink href="https://gravito.dev/en/docs/guide/orm-usage" class="h-12 px-8 rounded-full bg-white/5 border border-white/10 text-white font-medium text-base hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center backdrop-blur-md">
            {{ t('nav.docs') }}
        </StaticLink>
        
        <div class="sm:ml-4 flex items-center gap-2 text-sm text-gray-500 font-mono bg-white/5 px-3 py-1 rounded border border-white/5">
            <span class="text-primary">$</span> bun add @gravito/atlas
            <button class="hover:text-white transition-colors" title="Copy">
               <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
        </div>
      </div>

      <!-- Floating Terminal Preview -->
      <div class="mt-20 w-full max-w-5xl mx-auto perspective-1000 animate-slide-in-up" style="animation-delay: 0.6s">
          <div class="relative bg-atlas-surface border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-primary/10 transform rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out group">
              <!-- Window Controls -->
              <div class="px-4 py-3 bg-white/5 border-b border-white/5 flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div class="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <div class="ml-4 text-xs text-gray-500 font-mono">atlas-demo.ts</div>
              </div>
              <div class="p-0">
                  <LiveConsole />
              </div>
              
              <!-- Glow effect behind -->
              <div class="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 opacity-20 blur-xl -z-10 group-hover:opacity-30 transition-opacity"></div>
          </div>
      </div>
    </main>

    <!-- Benchmark Statistics (Bento Grid Style) -->
    <div class="relative z-20 max-w-7xl mx-auto px-6 mb-32">
        <div class="text-center mb-10">
            <h2 class="text-sm font-bold tracking-widest text-primary uppercase mb-2">Performance</h2>
            <h3 class="text-3xl font-display font-bold text-white">Engineered for Speed</h3>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Stat 1 -->
            <div class="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all hover:bg-white/[0.07] backdrop-blur-sm relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="text-gray-400 font-medium text-sm mb-2">{{ t('benchmark.raw_read') }}</div>
                    <div class="text-5xl font-bold text-white mb-2 tracking-tight">1.1M<span class="text-2xl text-primary">+</span></div>
                    <div class="text-sm text-gray-500">Operations per second</div>
                </div>
            </div>
            
             <!-- Stat 2 -->
            <div class="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all hover:bg-white/[0.07] backdrop-blur-sm relative overflow-hidden">
                 <div class="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 <div class="relative z-10">
                    <div class="text-gray-400 font-medium text-sm mb-2">{{ t('benchmark.hydration') }}</div>
                    <div class="text-5xl font-bold text-white mb-2 tracking-tight">42k<span class="text-2xl text-purple-400">+</span></div>
                    <div class="text-sm text-gray-500">Hydrated entities/sec</div>
                </div>
            </div>

             <!-- Stat 3 -->
            <div class="group p-8 rounded-3xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all hover:bg-white/[0.07] backdrop-blur-sm relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div class="relative z-10">
                    <div class="text-gray-400 font-medium text-sm mb-2">{{ t('benchmark.throughput') }}</div>
                    <div class="text-5xl font-bold text-white mb-2 tracking-tight">70k<span class="text-2xl text-green-400">+</span></div>
                    <div class="text-sm text-gray-500">Batch insert throughput</div>
                </div>
            </div>
        </div>
    </div>

    <Features id="features" class="relative z-20" />
    <Installation id="installation" class="relative z-20" />
  </div>
</template>

<style scoped>
/* 3D Transform utility */
.rotate-x-12 {
    transform: perspective(1000px) rotateX(12deg);
}
.rotate-x-0 {
    transform: perspective(1000px) rotateX(0deg);
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Features from '@/client/components/Features.vue'
import Installation from '@/client/components/Installation.vue'
import LiveConsole from '@/client/components/LiveConsole.vue'
import StaticLink from '@/client/components/StaticLink.vue'

const { t } = useI18n()
</script>
