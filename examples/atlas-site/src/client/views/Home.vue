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
          
          <p class="text-gray-300 max-w-lg text-base leading-relaxed animate-slide-in-up border-l-2 border-atlas-cyan/50 pl-6 mb-10 shadow-black drop-shadow-md">
            {{ t('hero.desc') }}
          </p>

          <!-- CTA Buttons (Restored & Refined) -->
          <div class="flex gap-4 animate-slide-in-up">
            <StaticLink href="#installation" class="px-5 py-2.5 bg-atlas-cyan/10 border border-atlas-cyan/40 text-atlas-cyan text-[10px] font-bold tracking-[0.2em] uppercase hover:bg-atlas-cyan hover:text-black transition-all">
                {{ t('nav.install') }}
            </StaticLink>
            <StaticLink to="/features" class="px-5 py-2.5 bg-white/5 border border-white/10 text-gray-500 text-[10px] font-bold tracking-[0.2em] uppercase hover:border-white hover:text-white transition-all">
                {{ t('nav.features') }}
            </StaticLink>
          </div>
      </div>

      <!-- Right side: Floating Live Console -->
      <div class="flex-1 w-full lg:max-w-xl animate-float-slow">
          <LiveConsole />
      </div>
    </main>

    <!-- Benchmark Statistics Bar -->
    <div class="relative z-20 max-w-7xl mx-auto px-8 mb-20">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-sm">
            <!-- Stat 1: Raw Read -->
            <div class="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/5">
                <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2">{{ t('benchmark.raw_read') }}</div>
                <div class="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                    1.1M+ <span class="text-sm font-normal text-atlas-cyan/70">{{ t('benchmark.ops_sec') }}</span>
                </div>
                <div class="text-[9px] text-gray-600 mt-1 uppercase tracking-wider">{{ t('benchmark.raw_read_sub') }}</div>
            </div>
            
             <!-- Stat 2: Hydration -->
            <div class="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/5">
                <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2">{{ t('benchmark.hydration') }}</div>
                <div class="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                    42k+ <span class="text-sm font-normal text-purple-400/70">{{ t('benchmark.ops_sec') }}</span>
                </div>
                <div class="text-[9px] text-gray-600 mt-1 uppercase tracking-wider">{{ t('benchmark.hydration_sub') }}</div>
            </div>

             <!-- Stat 3: Throughput -->
            <div class="flex flex-col items-center justify-center p-4">
                <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2">{{ t('benchmark.throughput') }}</div>
                <div class="text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
                    70k+ <span class="text-sm font-normal text-green-400/70">{{ t('benchmark.records') }}</span>
                </div>
                <div class="text-[9px] text-gray-600 mt-1 uppercase tracking-wider">{{ t('benchmark.throughput_sub') }}</div>
            </div>
        </div>
        
        <!-- Benchmark Footer Info -->
        <div class="mt-4 flex flex-col md:flex-row items-center justify-center gap-2 text-[10px] text-gray-500 font-mono tracking-wide opacity-60">
            <span>{{ t('benchmark.context') }}</span>
            <StaticLink to="/docs/benchmark" class="flex items-center gap-1 text-atlas-cyan hover:text-white transition-colors border-b border-atlas-cyan/30 hover:border-atlas-cyan">
               {{ t('benchmark.view_source') }}
               <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </StaticLink>
        </div>
    </div>

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
import StaticLink from '@/client/components/StaticLink.vue'

const { t } = useI18n()
</script>
