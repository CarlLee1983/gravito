<template>
  <div class="relative z-10 pb-20 bg-atlas-void overflow-hidden min-h-screen">
    
    <!-- Visual Graph: Data Sorting Grid -->
    <div class="absolute inset-0 z-0 pointer-events-none opacity-40">
        <DataSortingGrid :with-background="false" />
        <div class="absolute inset-0 bg-gradient-to-b from-atlas-void/20 via-atlas-void/50 to-atlas-void"></div>
    </div>

    <!-- Hero Content -->
    <main class="relative z-20 flex flex-col lg:flex-row items-center justify-between px-8 md:px-20 max-w-7xl mx-auto w-full min-h-[85vh] pt-40 lg:pt-0 gap-20">
      <!-- Left side: Minimalist HUD & Intros -->
      <div class="flex-1 flex flex-col items-start text-left">
          <div class="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-primary-glow text-[10px] font-mono font-black tracking-[0.3em] uppercase mb-10 animate-slide-in-up shadow-inner-glow">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            V1.3.0 ORBITAL DEPLOYED
          </div>

          <h1 class="text-7xl md:text-9xl font-display font-black text-white mb-10 leading-[0.85] tracking-[-0.04em] max-w-4xl">
             {{ t('hero.title_line1') }}
             <span class="block text-transparent bg-clip-text bg-gradient-to-br from-white via-primary-glow to-primary mt-4 pb-4">
               DATA ENGINE
             </span>
          </h1>
          
          <p class="text-atlas-metallic max-w-2xl text-xl md:text-2xl leading-relaxed animate-slide-in-up mb-14 font-medium tracking-tight">
            {{ t('hero.desc') }}
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-wrap gap-6 animate-slide-in-up">
            <StaticLink href="#installation" class="group px-10 py-5 bg-primary text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary-glow transition-all shadow-neon-blue hover:shadow-[0_0_40px_rgba(59,130,246,0.6)] flex items-center gap-4 active:scale-95">
                {{ t('nav.install') }}
                <svg class="w-5 h-5 group-hover:translate-x-2 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
            </StaticLink>
            <StaticLink to="/features" class="px-10 py-5 bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all backdrop-blur-xl shadow-inner-glow active:scale-95">
                {{ t('nav.features') }}
            </StaticLink>
          </div>
      </div>

      <!-- Right side: Floating Live Console -->
      <div class="flex-1 w-full lg:max-w-3xl animate-float-slow">
          <div class="relative group">
            <div class="absolute -inset-4 bg-gradient-to-r from-primary/30 to-atlas-cyan/30 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div class="relative bg-atlas-surface/30 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-2 shadow-glass overflow-hidden">
              <div class="absolute inset-0 bg-noise-pattern opacity-[0.05] pointer-events-none"></div>
              <LiveConsole />
            </div>
          </div>
      </div>
    </main>

    <!-- Engine Specs HUD (NEW) -->
    <div class="relative z-20 max-w-7xl mx-auto px-8 mb-20 animate-slide-in-up" style="animation-delay: 0.4s">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="(spec, key) in ['proxy', 'dirty', 'native']" :key="key" class="bg-white/[0.03] border border-white/5 backdrop-blur-md rounded-2xl p-6 hover:border-white/20 transition-all group">
                <div class="text-[10px] font-mono font-black text-primary uppercase tracking-[0.2em] mb-2">{{ t(`hero.specs.${spec}`) }}</div>
                <div class="text-sm font-bold text-atlas-metallic group-hover:text-white transition-colors">{{ t(`hero.specs.${spec}_sub`) }}</div>
            </div>
            <!-- Status Badge -->
            <div class="bg-primary/5 border border-primary/20 backdrop-blur-md rounded-2xl p-6 flex items-center justify-between group">
                <div>
                  <div class="text-[10px] font-mono font-black text-primary uppercase tracking-[0.2em] mb-1">CORE_ENGINE</div>
                  <div class="text-sm font-bold text-white">V1.3.0 STABLE</div>
                </div>
                <div class="w-2 h-2 rounded-full bg-primary animate-pulse shadow-neon-blue"></div>
            </div>
        </div>
    </div>

    <!-- Benchmark Statistics Bar -->
    <div class="relative z-20 max-w-7xl mx-auto px-8 mb-40">
        <div class="bg-atlas-surface/20 border border-white/10 backdrop-blur-3xl rounded-[3rem] p-2 shadow-glass shadow-inner-glow">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <!-- Stat 1 -->
                <div class="flex flex-col items-center justify-center p-14 bg-white/[0.03] rounded-t-[2.8rem] md:rounded-t-none md:rounded-l-[2.8rem] group hover:bg-white/[0.08] transition-all duration-700">
                    <div class="text-atlas-metallic font-mono text-[10px] font-black uppercase tracking-[0.4em] mb-6 group-hover:text-primary-glow transition-colors">{{ t('benchmark.raw_read') }}</div>
                    <div class="text-6xl md:text-7xl font-display font-black text-white tabular-nums tracking-tighter mb-4">
                        1.1M<span class="text-primary text-4xl">/s</span>
                    </div>
                    <div class="text-[10px] text-primary-glow font-black uppercase tracking-widest bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl shadow-inner-glow">{{ t('benchmark.raw_read_sub') }}</div>
                </div>
                
                <!-- Stat 2 -->
                <div class="flex flex-col items-center justify-center p-14 bg-white/[0.03] group hover:bg-white/[0.08] transition-all duration-700">
                    <div class="text-atlas-metallic font-mono text-[10px] font-black uppercase tracking-[0.4em] mb-6 group-hover:text-atlas-cyan transition-colors">{{ t('benchmark.hydration') }}</div>
                    <div class="text-6xl md:text-7xl font-display font-black text-white tabular-nums tracking-tighter mb-4">
                        42k<span class="text-atlas-cyan text-4xl">/ms</span>
                    </div>
                    <div class="text-[10px] text-atlas-cyan font-black uppercase tracking-widest bg-atlas-cyan/10 border border-atlas-cyan/20 px-4 py-2 rounded-xl shadow-inner-glow">{{ t('benchmark.hydration_sub') }}</div>
                </div>

                <!-- Stat 3 -->
                <div class="flex flex-col items-center justify-center p-14 bg-white/[0.03] rounded-b-[2.8rem] md:rounded-b-none md:rounded-r-[2.8rem] group hover:bg-white/[0.08] transition-all duration-700">
                    <div class="text-atlas-metallic font-mono text-[10px] font-black uppercase tracking-[0.4em] mb-6 group-hover:text-white transition-colors">{{ t('benchmark.throughput') }}</div>
                    <div class="text-6xl md:text-7xl font-display font-black text-white tabular-nums tracking-tighter mb-4">
                        70k<span class="text-white text-4xl">/s</span>
                    </div>
                    <div class="text-[10px] text-white/40 font-black uppercase tracking-widest bg-white/10 border border-white/20 px-4 py-2 rounded-xl shadow-inner-glow">{{ t('benchmark.throughput_sub') }}</div>
                </div>
            </div>
        </div>
        
        <!-- Benchmark Footer Info -->
        <div class="mt-8 flex flex-col md:flex-row items-center justify-center gap-3 text-xs text-atlas-metallic font-medium opacity-60">
            <span>{{ t('benchmark.context') }}</span>
            <StaticLink to="/docs/benchmark" class="flex items-center gap-2 text-primary hover:text-white transition-all group">
               <span class="border-b border-primary/30 group-hover:border-white transition-colors">{{ t('benchmark.view_source') }}</span>
               <svg class="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                 <path d="M9 5l7 7-7 7" />
               </svg>
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