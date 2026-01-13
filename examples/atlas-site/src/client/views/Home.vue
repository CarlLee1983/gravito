<template>
  <div class="relative z-10 pb-20 bg-atlas-void overflow-hidden min-h-screen">
    
    <!-- Visual Graph: Data Sorting Grid (Restored & Enhanced) -->
    <div class="absolute inset-0 z-0 pointer-events-none opacity-90">
        <DataSortingGrid :with-background="true" />
        <div class="absolute inset-0 bg-gradient-to-b from-atlas-void/20 via-transparent to-atlas-void"></div>
    </div>

    <!-- Hero Content -->
    <main class="relative z-20 flex flex-col lg:flex-row items-center justify-between px-8 md:px-20 max-w-7xl mx-auto w-full min-h-[90vh] pt-32 md:pt-10 gap-12">
      <!-- Left side: Minimalist HUD & Intros -->
      <div class="flex-1 flex flex-col items-start text-left">
          <div class="flex flex-col gap-2 font-mono text-[10px] tracking-[0.3em] text-atlas-cyan/80 animate-pulse uppercase mb-8 border-l-2 border-atlas-cyan/30 pl-4">
            <span class="flex items-center gap-2"><div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan shadow-[0_0_8px_cyan]"></div> System Orbit: Active</span>
            <span>Data Flux: Stable</span>
            <span>Gravitational Metric: 9.81 G_CORE</span>
          </div>

          <h1 class="text-5xl md:text-7xl font-black text-white mb-6 leading-[0.9] tracking-tighter max-w-2xl drop-shadow-[0_0_15px_rgba(0,240,255,0.3)]">
             {{ t('hero.title_line1') }}
             <span class="block text-transparent bg-clip-text bg-gradient-to-r from-atlas-cyan via-white to-atlas-structure mt-2">
               DATA ENGINE
             </span>
          </h1>
          
          <p class="text-gray-400 max-w-lg text-lg leading-relaxed animate-slide-in-up mb-10 font-light">
            {{ t('hero.desc') }}
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-wrap gap-4 animate-slide-in-up">
            <StaticLink href="#installation" class="group px-8 py-4 bg-atlas-cyan text-atlas-void text-xs font-black tracking-[0.2em] uppercase hover:bg-white transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] rounded-sm flex items-center gap-2">
                {{ t('nav.install') }}
                <span class="group-hover:translate-x-1 transition-transform">-></span>
            </StaticLink>
            <StaticLink to="/features" class="px-8 py-4 bg-atlas-abyss border border-white/10 text-gray-400 text-xs font-bold tracking-[0.2em] uppercase hover:border-atlas-cyan hover:text-atlas-cyan transition-all rounded-sm backdrop-blur-md">
                {{ t('nav.features') }}
            </StaticLink>
          </div>
      </div>

      <!-- Right side: Floating Live Console -->
      <div class="flex-1 w-full lg:max-w-xl animate-float-slow perspective-1000">
          <div class="transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700">
            <LiveConsole />
          </div>
      </div>
    </main>

    <!-- Benchmark Statistics Bar (Spotlight Enhanced) -->
    <div class="relative z-20 max-w-7xl mx-auto px-8 mb-32">
        <SpotlightCard>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
                <!-- Stat 1 -->
                <div class="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/5 group">
                    <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2 group-hover:text-atlas-cyan transition-colors">{{ t('benchmark.raw_read') }}</div>
                    <div class="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight mb-1">
                        1.1M+
                    </div>
                    <div class="text-[9px] text-atlas-cyan mt-1 uppercase tracking-wider bg-atlas-cyan/10 px-2 py-1 rounded">{{ t('benchmark.raw_read_sub') }}</div>
                </div>
                
                <!-- Stat 2 -->
                <div class="flex flex-col items-center justify-center p-4 border-b md:border-b-0 md:border-r border-white/5 group">
                    <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2 group-hover:text-purple-400 transition-colors">{{ t('benchmark.hydration') }}</div>
                    <div class="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight mb-1">
                        42k+
                    </div>
                    <div class="text-[9px] text-purple-400 mt-1 uppercase tracking-wider bg-purple-500/10 px-2 py-1 rounded">{{ t('benchmark.hydration_sub') }}</div>
                </div>

                <!-- Stat 3 -->
                <div class="flex flex-col items-center justify-center p-4 group">
                    <div class="text-gray-500 font-mono text-[10px] uppercase tracking-widest mb-2 group-hover:text-green-400 transition-colors">{{ t('benchmark.throughput') }}</div>
                    <div class="text-4xl md:text-5xl font-black text-white tabular-nums tracking-tight mb-1">
                        70k+
                    </div>
                    <div class="text-[9px] text-green-400 mt-1 uppercase tracking-wider bg-green-500/10 px-2 py-1 rounded">{{ t('benchmark.throughput_sub') }}</div>
                </div>
            </div>
        </SpotlightCard>
        
        <!-- Benchmark Footer Info -->
        <div class="mt-6 flex flex-col md:flex-row items-center justify-center gap-2 text-[10px] text-gray-500 font-mono tracking-wide opacity-60">
            <span>{{ t('benchmark.context') }}</span>
            <StaticLink to="/docs/benchmark" class="flex items-center gap-1 text-atlas-cyan hover:text-white transition-colors border-b border-atlas-cyan/30 hover:border-atlas-cyan">
               {{ t('benchmark.view_source') }}
               <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </StaticLink>
        </div>
    </div>

    <!-- Enhanced Features Section -->
    <Features id="features" class="relative z-20" />
    <Installation id="installation" class="relative z-20" />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Features from '@/client/components/Features.vue'
import Installation from '@/client/components/Installation.vue'
import LiveConsole from '@/client/components/LiveConsole.vue'
import DataSortingGrid from '@/client/components/DataSortingGrid.vue'
import StaticLink from '@/client/components/StaticLink.vue'
import SpotlightCard from '@/client/components/SpotlightCard.vue'

const { t } = useI18n()
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.rotate-y-\[-5deg\] {
  transform: rotateY(-5deg);
}
.rotate-x-\[5deg\] {
  transform: rotateX(5deg);
}
</style>