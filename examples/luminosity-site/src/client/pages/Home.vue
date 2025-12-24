<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { Activity, Zap, HardDrive, FileText, ChevronRight, Share2, Shield, Search } from 'lucide-vue-next';
import Layout from '../components/Layout.vue';
import Logo from '../components/Logo.vue';
import { useI18n } from '../composables/useI18n';

defineProps<{
  message?: string
}>();

const { t, locale } = useI18n()
</script>

<template>
  <Layout>
    <Head>
      <title>{{ t?.hero?.title }} - Luminosity SEO</title>
      <meta name="description" :content="t?.hero?.subtitle + ' - ' + t?.hero?.desc" />
      
      <!-- Open Graph / Facebook -->
      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://lux.gravito.dev/" />
      <meta property="og:title" :content="t?.hero?.title + ' - Luminosity SEO'" />
      <meta property="og:description" :content="t?.hero?.subtitle" />
      <meta property="og:image" content="https://lux.gravito.dev/og-image.png" />

      <!-- Twitter -->
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content="https://lux.gravito.dev/" />
      <meta property="twitter:title" :content="t?.hero?.title + ' - Luminosity SEO'" />
      <meta property="twitter:description" :content="t?.hero?.subtitle" />
      <meta property="twitter:image" content="https://lux.gravito.dev/og-image.png" />
    </Head>
    
    <!-- Hero Section -->
    <section class="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <!-- Background Effects -->
      <div class="absolute inset-0 z-0">
        <!-- Main Hero Graphic (Full Screen) -->
        <div class="absolute inset-0 opacity-50 pointer-events-none select-none">
          <img src="../assets/hero-graphic.png" alt="Luminosity Core" class="w-full h-full object-cover animate-pulse-slow" />
        </div>
        
        <!-- Overlays for Readability & Mood -->
        <div class="absolute inset-0 bg-void/60 mix-blend-multiply"></div>
        <div class="absolute inset-0 bg-gradient-to-b from-void/80 via-transparent to-void"></div>
        <div class="absolute inset-0 bg-[url('/grid.svg')] opacity-10 mix-blend-overlay"></div>
      </div>
      
      <!-- Content -->
      <div class="relative z-10 text-center px-6 max-w-5xl mx-auto mt-20">
        <div 
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-6 backdrop-blur-sm animate-fade-in"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          {{ t?.hero?.tag }}
        </div>
        
        <h1 class="text-6xl md:text-9xl font-black tracking-tighter mb-8 leading-[0.9] text-white">
          {{ t?.hero?.title }} <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-600">{{ t?.hero?.subtitle }}</span>
        </h1>
        
        <p class="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-16 font-light leading-relaxed">
          {{ t?.hero?.desc }}
        </p>
        
        <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <Link 
            :href="locale === 'zh' ? '/zh/features' : '/features'"
            class="w-full sm:w-auto px-10 py-5 bg-white text-black font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
          >
            {{ t?.hero?.ctaPro }} <ChevronRight :size="20" />
          </Link>
          <Link 
            :href="locale === 'zh' ? '/zh/docs' : '/docs'"
            class="w-full sm:w-auto px-10 py-5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all backdrop-blur-sm"
          >
            {{ t?.hero?.ctaDocs }}
          </Link>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span class="text-[10px] font-mono uppercase tracking-[0.3em]">{{ t?.scroll }}</span>
        <div class="w-[1px] h-12 bg-gradient-to-b from-emerald-500 to-transparent"></div>
      </div>
    </section>

    <!-- Features Bento -->
    <section id="features" class="py-32 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="md:col-span-2 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden group">
            <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
               <Share2 :size="120" />
            </div>
            <div class="relative z-10">
              <div class="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 font-bold">01</div>
              <h3 class="text-3xl font-bold mb-4">{{ t?.features?.lsm?.title }}</h3>
              <p class="text-gray-400 text-lg max-w-lg">
                {{ t?.features?.lsm?.desc }}
              </p>
            </div>
          </div>
          
          <div class="p-8 rounded-3xl bg-gradient-to-br from-emerald-600 to-green-700 border border-white/10 relative overflow-hidden group">
            <div class="relative z-10 h-full flex flex-col justify-between">
              <div>
                <Shield class="text-white/80 mb-6" :size="40" />
                <h3 class="text-2xl font-bold text-white mb-4">{{ t?.features?.enterprise?.title }}</h3>
                <p class="text-emerald-100/70">
                  {{ t?.features?.enterprise?.desc }}
                </p>
              </div>
              <div class="pt-8 flex justify-end">
                <Logo size="lg" class="opacity-20 translate-x-12 translate-y-12 rotate-[-15deg] grayscale brightness-200" />
              </div>
            </div>
          </div>
          
          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Search class="text-emerald-500 mb-6" :size="32" />
            <h3 class="text-xl font-bold mb-2">{{ t?.features?.index?.title }}</h3>
            <p class="text-gray-500 text-sm">
              {{ t?.features?.index?.desc }}
            </p>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
            <Shield class="text-emerald-500 mb-6" :size="32" />
            <h3 class="text-xl font-bold mb-2">{{ t?.features?.proxy?.title }}</h3>
            <p class="text-gray-500 text-sm">
               {{ t?.features?.proxy?.desc }}
            </p>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md">
            <FileText class="text-emerald-500 mb-6" :size="32" />
            <h3 class="text-xl font-bold mb-2">{{ t?.features?.meta?.title }}</h3>
            <p class="text-gray-500 text-sm">
              {{ t?.features?.meta?.desc }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Benchmark Section -->
    <section class="py-32 bg-panel border-y border-white/5 relative overflow-hidden">
      <div class="max-w-7xl mx-auto px-6">
        
        <!-- Section Header -->
        <div class="text-center mb-24">
          <h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-4 italic">
            {{ t?.benchmark?.title }} <span class="text-emerald-500">{{ t?.benchmark?.subtitle }}</span>
          </h2>
          <p class="text-gray-400 text-xl font-mono tracking-widest uppercase">{{ t?.benchmark?.metric }}</p>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-500/50 transition-colors">
            <div class="flex items-center gap-3 mb-4 text-emerald-400">
              <FileText :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.urls }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2">1,000,000</div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Single Stream Scan</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-500/50 transition-colors">
            <div class="flex items-center gap-3 mb-4 text-blue-400">
              <Zap :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.throughput }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2">70k<span class="text-xl text-gray-500 italic ml-1">/sec</span></div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">LSM-Optimized</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-500/50 transition-colors">
            <div class="flex items-center gap-3 mb-4 text-amber-400">
              <HardDrive :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.memory }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2">84<span class="text-xl text-gray-500 italic ml-1">MB</span></div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">Constant Heap Usage</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-500/50 transition-colors">
            <div class="flex items-center gap-3 mb-4 text-purple-400">
              <Activity :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.build }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2">14.2<span class="text-xl text-gray-500 italic ml-1">s</span></div>
            <div class="text-xs text-gray-500 uppercase tracking-widest">100% Success Rate</div>
          </div>
        </div>

        <!-- Terminal Demo -->
        <div class="max-w-4xl mx-auto group">
          <div class="rounded-2xl overflow-hidden border border-white/10 bg-void shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:border-emerald-500/30 transition-all duration-700">
            <!-- Terminal Header -->
            <div class="bg-[#1A1A1A] px-6 py-4 flex items-center gap-3 border-b border-white/5">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div class="w-3 h-3 rounded-full bg-amber-500/50"></div>
                <div class="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
              <div class="ml-4 text-xs font-mono text-gray-500">luminosity-benchmark — bun run benchmark</div>
            </div>
            
            <!-- Terminal Body -->
            <div class="p-8 font-mono text-sm leading-relaxed overflow-x-auto">
              <div class="text-gray-500 mb-2">$ bun run benchmark</div>
              <div class="text-emerald-400">🌌 [LUMINOSITY] Initializing Atomic Engine...</div>
              <div class="text-gray-600 mb-4">--------------------------------------------------</div>
              <div class="flex justify-between items-center mb-1">
                <div class="text-gray-300">🚀 Sequential Ops Log</div><div class="text-green-500">[COMPLETE]</div>
              </div>
              <div class="flex justify-between items-center mb-1">
                <div class="text-gray-300">🔥 Snapshot Merge</div><div class="text-green-500">[COMPLETE]</div>
              </div>
              <div class="flex justify-between items-center mb-4">
                <div class="text-gray-300">📦 XML Paginator</div><div class="text-green-500">[20 FILES]</div>
              </div>
              
              <div class="mt-8 border border-emerald-500/20 p-6 rounded-xl bg-emerald-500/5">
                <div class="text-emerald-400 font-black mb-4 tracking-widest text-center">FINAL REPORT</div>
                <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-gray-400">
                  <div>Telescope Range</div><div class="text-right text-white font-bold">1,000,000 URLs</div>
                  <div>Build Velocity</div><div class="text-right text-white font-bold">14.2s TOTAL</div>
                  <div>Energy Signature</div><div class="text-right text-emerald-500 font-bold">84MB RAM</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Report Link -->
        <div class="mt-12 text-center animate-fade-in" style="animation-delay: 0.5s">
          <Link 
            :href="locale === 'zh' ? '/zh/docs/benchmark' : '/docs/benchmark'"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all font-mono text-sm group"
          >
            <FileText :size="16" />
            <span class="group-hover:underline underline-offset-4">
              {{ locale === 'zh' ? '查看完整基準測試報告' : 'View Full Benchmark Report' }}
            </span>
            <ChevronRight :size="16" class="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>
    </section>
  </Layout>
</template>

<style>
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fade-in 1s ease-out forwards;
}

@keyframes pulse-slow {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.02); }
}

.animate-pulse-slow {
  animation: pulse-slow 8s infinite ease-in-out;
}
</style>
