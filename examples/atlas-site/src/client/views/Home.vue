<template>
  <div class="relative z-10 pb-20">
    <!-- Hero Content -->
    <!-- Hero Content -->
    <!-- Hero Content -->
    <main class="relative z-20 flex flex-col lg:flex-row items-center justify-between px-8 md:px-20 max-w-7xl mx-auto w-full min-h-[90vh] pt-32 md:pt-10 gap-12">
      <!-- Left side: Minimalist HUD & Intros -->
      <div class="flex-1 flex flex-col items-start text-left">
          <div class="flex flex-col gap-2 font-mono text-[10px] tracking-[0.3em] text-atlas-cyan/60 animate-pulse uppercase mb-8">
            <span class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan shadow-[0_0_8px_cyan]"></div> System Orbit: Active</span>
            <span>Data Flux: Stable</span>
            <span>Gravitational Metric: 9.81 G_CORE</span>
          </div>

          <h1 class="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight max-w-md">
             {{ t('hero.title_line1') }}
          </h1>
          
          <p class="text-gray-500 max-w-sm text-sm leading-relaxed font-light animate-slide-in-up border-l border-atlas-cyan/20 pl-4 mb-10">
            {{ t('hero.desc') }}
          </p>

          <!-- CTA Buttons (Restored & Refined) -->
          <div class="flex gap-4 animate-slide-in-up">
            <a href="#installation" class="px-5 py-2.5 bg-atlas-cyan/10 border border-atlas-cyan/40 text-atlas-cyan text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-atlas-cyan hover:text-black transition-all">
                {{ t('nav.install') }}
            </a>
            <router-link to="/features" class="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-500 text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white hover:text-white transition-all">
                {{ t('nav.features') }}
            </router-link>
          </div>
      </div>

      <!-- Right side: Floating Live Console -->
      <div class="flex-1 w-full lg:max-w-xl animate-float-slow">
          <LiveConsole />
      </div>
    </main>

    <!-- Enhanced Features Section (Moved up visually to connect) -->
    <Features id="features" class="relative z-20" />
    <Installation id="installation" class="relative z-20" />
  </div>
</template>


<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Features from '@/client/components/Features.vue'
import Installation from '@/client/components/Installation.vue'
import LiveConsole from '@/client/components/LiveConsole.vue'

const { t } = useI18n()
</script>
