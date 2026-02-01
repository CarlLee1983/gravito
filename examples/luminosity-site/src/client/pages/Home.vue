<script setup lang="ts">
import { Activity, ChevronRight, FileText, HardDrive, Search, Shield, Terminal, Zap } from 'lucide-vue-next'
import { onMounted, ref } from 'vue'
import heroGraphic from '../assets/hero-graphic.png'
import { useI18n } from '../composables/useI18n'

defineProps<{
  message?: string
}>()

const { t, locale } = useI18n()

// Typing Animation
const typedText = ref('')
const fullCommand = 'bun run benchmark'
const showCursor = ref(true)

onMounted(() => {
  let i = 0
  const typeInterval = setInterval(() => {
    if (i < fullCommand.length) {
      typedText.value += fullCommand.charAt(i)
      i++
    } else {
      clearInterval(typeInterval)
      // Blink cursor
      setInterval(() => {
        showCursor.value = !showCursor.value
      }, 500)
    }
  }, 100)
})
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
        <!-- Main Hero Graphic (RESTORED & ENHANCED) -->
        <div class="absolute inset-0 opacity-60 pointer-events-none select-none mix-blend-screen overflow-hidden">
          <img 
            :src="heroGraphic" 
            alt="Luminosity Core" 
            class="w-full h-full object-cover animate-pulse-slow scale-110 blur-[2px] sm:blur-none"
            loading="eager"
            style="mask-image: radial-gradient(circle at center, black 30%, transparent 80%);"
          />
        </div>
        
        <!-- Subtle Gradient for text readability -->
        <div class="absolute inset-0 bg-gradient-to-b from-void/40 via-transparent to-void"></div>
        
        <!-- Hex Grid Background -->
        <div class="absolute inset-0 opacity-20 mix-blend-overlay bg-hex-grid animate-fade-in" aria-hidden="true"></div>
      </div>
      
      <!-- Content -->
      <div class="relative z-10 text-center px-6 max-w-6xl mx-auto mt-20">
        <!-- Badge -->
        <div 
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-singularity/20 bg-singularity/5 text-singularity text-xs font-mono tracking-widest uppercase mb-8 backdrop-blur-md animate-fade-in shadow-[0_0_15px_rgba(16,185,129,0.1)]"
        >
          <span class="w-2 h-2 rounded-full bg-singularity animate-ping"></span>
          {{ t?.hero?.tag }}
        </div>
        
        <!-- Main Title -->
        <h1 class="text-6xl md:text-[7rem] lg:text-[9rem] font-black tracking-tighter mb-8 leading-[0.85] text-white select-none font-heading uppercase">
          {{ t?.hero?.title }} <br />
          <span class="text-transparent bg-clip-text bg-gradient-to-r from-singularity via-white to-event animate-gradient-x bg-300%">{{ t?.hero?.subtitle }}</span>
        </h1>
        
        <p class="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto mb-16 font-light leading-relaxed font-body">
          {{ t?.hero?.desc }}
        </p>
        
        <div class="flex flex-col sm:flex-row gap-6 justify-center items-center">
          <StaticLink 
            href="/docs/getting-started"
            class="group w-full sm:w-auto px-10 py-5 bg-accent text-white font-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2 hover:brightness-110"
          >
            {{ t?.hero?.ctaPro }} 
            <ChevronRight :size="20" class="group-hover:translate-x-1 transition-transform" />
          </StaticLink>
          <StaticLink 
            href="/docs/introduction"
            class="w-full sm:w-auto px-10 py-5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all backdrop-blur-md hover:border-singularity/30"
          >
            {{ t?.hero?.ctaDocs }}
          </StaticLink>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
        <span class="text-[10px] font-mono uppercase tracking-[0.3em] text-singularity">{{ t?.scroll }}</span>
        <div class="w-[1px] h-12 bg-gradient-to-b from-singularity to-transparent"></div>
      </div>
    </section>

    <!-- Features Bento -->
    <section id="features" class="py-32 relative">
      <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6">
          
          <!-- Large Feature Card -->
          <div class="md:col-span-4 lg:col-span-4 h-full">
            <SpotlightCard class="h-full p-10 flex flex-col justify-center">
                <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700 text-singularity pointer-events-none">
                   <Zap :size="240" />
                </div>
                <div class="relative z-10">
                  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-singularity/10 border border-singularity/20 text-singularity text-[10px] font-bold uppercase tracking-widest mb-6">
                    Core Engine
                  </div>
                  <h3 class="text-4xl lg:text-5xl font-black mb-6 text-white font-heading uppercase leading-tight italic">
                    {{ t?.features?.lsm?.title }}
                  </h3>
                  <p class="text-zinc-400 text-lg max-w-xl mb-6 leading-relaxed font-body">
                    {{ t?.features?.lsm?.desc }}
                  </p>
                </div>
            </SpotlightCard>
          </div>
          
          <!-- Highlight Card -->
          <div class="md:col-span-2 lg:col-span-2 rounded-3xl bg-gradient-to-br from-event to-void border border-white/10 relative overflow-hidden group p-8 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <div class="absolute inset-0 bg-[url('/assets/grid.svg')] opacity-20"></div>
            <div class="relative z-10 h-full flex flex-col justify-between">
              <div>
                <Shield class="text-white mb-6" :size="48" />
                <h3 class="text-2xl lg:text-3xl font-bold text-white mb-4 font-heading uppercase italic">{{ t?.features?.enterprise?.title }}</h3>
                <p class="text-white/80 font-body">
                  {{ t?.features?.enterprise?.desc }}
                </p>
              </div>
              <div class="pt-8 flex justify-end">
                <Logo size="lg" class="opacity-30 grayscale brightness-200 group-hover:scale-110 transition-transform duration-500" />
              </div>
            </div>
          </div>
          
          <!-- Small Cards -->
          <SpotlightCard class="md:col-span-2 lg:col-span-2 p-8 border-white/5">
            <div class="w-12 h-12 rounded-xl bg-singularity/10 flex items-center justify-center text-singularity mb-6">
              <Search :size="24" />
            </div>
            <h3 class="text-xl font-bold mb-3 text-white font-heading uppercase italic">{{ t?.features?.index?.title }}</h3>
            <p class="text-zinc-500 text-sm font-body leading-relaxed">
              {{ t?.features?.index?.desc }}
            </p>
          </SpotlightCard>

          <SpotlightCard class="md:col-span-2 lg:col-span-2 p-8 border-white/5">
            <div class="w-12 h-12 rounded-xl bg-event/10 flex items-center justify-center text-event mb-6">
              <Terminal :size="24" />
            </div>
            <h3 class="text-xl font-bold mb-3 text-white font-heading uppercase italic">{{ t?.features?.proxy?.title }}</h3>
            <p class="text-zinc-500 text-sm font-body leading-relaxed">
               {{ t?.features?.proxy?.desc }}
            </p>
          </SpotlightCard>

          <SpotlightCard class="md:col-span-4 lg:col-span-2 p-8 border-white/5">
            <div class="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-6">
              <FileText :size="24" />
            </div>
            <h3 class="text-xl font-bold mb-3 text-white font-heading uppercase italic">{{ t?.features?.meta?.title }}</h3>
            <p class="text-zinc-500 text-sm font-body leading-relaxed">
              {{ t?.features?.meta?.desc }}
            </p>
          </SpotlightCard>
        </div>
      </div>
    </section>

    <!-- Benchmark Section (Terminal) -->
    <section class="py-32 bg-panel border-y border-white/5 relative overflow-hidden">
      <!-- Glow behind terminal -->
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-singularity/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div class="max-w-7xl mx-auto px-6 relative z-10">
        
        <!-- Section Header -->
        <div class="text-center mb-24">
          <h2 class="text-5xl md:text-7xl font-black tracking-tighter mb-4 italic text-white font-heading uppercase">
            {{ t?.benchmark?.title }} <span class="text-singularity">{{ t?.benchmark?.subtitle }}</span>
          </h2>
          <p class="text-zinc-400 text-xl font-mono tracking-[0.3em] uppercase">{{ t?.benchmark?.metric }}</p>
        </div>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-24">
          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-singularity/50 transition-all duration-300">
            <div class="flex items-center gap-3 mb-4 text-singularity">
              <FileText :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.urls }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2 font-heading tracking-tighter">1M+</div>
            <div class="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Single Stream Scan</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-accent/50 transition-all duration-300">
            <div class="flex items-center gap-3 mb-4 text-accent">
              <Zap :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.throughput }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2 font-heading tracking-tighter">70k<span class="text-xl text-zinc-500 italic ml-1 font-light">/sec</span></div>
            <div class="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">LSM-Optimized</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-emerald-400/50 transition-all duration-300">
            <div class="flex items-center gap-3 mb-4 text-emerald-400">
              <HardDrive :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.memory }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2 font-heading tracking-tighter">84<span class="text-xl text-zinc-500 italic ml-1 font-light">MB</span></div>
            <div class="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Constant Heap Usage</div>
          </div>

          <div class="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm group hover:border-event/50 transition-all duration-300">
            <div class="flex items-center gap-3 mb-4 text-event">
              <Activity :size="20" />
              <span class="text-xs font-mono uppercase tracking-wider">{{ t?.benchmark?.build }}</span>
            </div>
            <div class="text-5xl font-black text-white mb-2 font-heading tracking-tighter">14.2<span class="text-xl text-zinc-500 italic ml-1 font-light">s</span></div>
            <div class="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">100% Success Rate</div>
          </div>
        </div>

        <!-- Terminal Demo -->
        <div class="max-w-4xl mx-auto group perspective-1000">
          <div class="rounded-2xl overflow-hidden border border-white/10 bg-void shadow-[0_0_50px_rgba(0,0,0,0.5)] group-hover:border-singularity/30 transition-all duration-700 group-hover:rotate-x-2 group-hover:shadow-[0_20px_50px_rgba(0,240,255,0.1)] transform-style-3d">
            <!-- Terminal Header -->
            <div class="bg-[#1A1A1A] px-6 py-4 flex items-center gap-3 border-b border-white/5">
              <div class="flex gap-2">
                <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
                <div class="w-3 h-3 rounded-full bg-amber-500/50"></div>
                <div class="w-3 h-3 rounded-full bg-green-500/50"></div>
              </div>
              <div class="ml-4 text-xs font-mono text-zinc-500 flex items-center gap-2">
                <Terminal :size="12" />
                luminosity-benchmark — bun run benchmark
              </div>
            </div>
            
            <!-- Terminal Body -->
            <div class="p-8 font-mono text-sm leading-relaxed overflow-x-auto min-h-[300px] bg-void/50 backdrop-blur-xl">
              <div class="flex items-center gap-2 text-zinc-300 mb-4">
                <span class="text-event">➜</span> 
                <span class="text-singularity font-bold">~</span> 
                <span>$ {{ typedText }}<span v-if="showCursor" class="inline-block w-2 h-4 bg-singularity ml-1 animate-pulse"></span></span>
              </div>

              <div v-if="typedText.length >= fullCommand.length" class="animate-fade-in space-y-2">
                <div class="text-singularity font-bold tracking-tight">🌌 [LUMINOSITY] Initializing Atomic Engine...</div>
                <div class="text-zinc-800">--------------------------------------------------</div>
                <div class="flex justify-between items-center text-zinc-400">
                  <div class="flex items-center gap-2 font-light"><div class="w-1 h-1 bg-zinc-600 rounded-full"></div> Loading Resolvers</div>
                  <div class="text-emerald-500 font-bold text-xs">[OK]</div>
                </div>
                <div class="flex justify-between items-center text-zinc-400">
                  <div class="flex items-center gap-2 font-light"><div class="w-1 h-1 bg-zinc-600 rounded-full"></div> Booting Prism Views</div>
                  <div class="text-emerald-500 font-bold text-xs">[OK]</div>
                </div>
                <div class="flex justify-between items-center text-zinc-400">
                  <div class="flex items-center gap-2 font-light"><div class="w-1 h-1 bg-zinc-600 rounded-full"></div> Hydrating Cache</div>
                  <div class="text-emerald-500 font-bold text-xs">[OK]</div>
                </div>
                
                <br />
                <div class="flex justify-between items-center">
                  <div class="text-zinc-300">🚀 Sequential Ops Log</div><div class="text-singularity font-bold">[COMPLETE]</div>
                </div>
                <div class="flex justify-between items-center">
                  <div class="text-zinc-300">🔥 Snapshot Merge</div><div class="text-singularity font-bold">[COMPLETE]</div>
                </div>
                <div class="flex justify-between items-center mb-4">
                  <div class="text-zinc-300">📦 XML Paginator</div><div class="text-singularity font-bold">[20 FILES]</div>
                </div>
                
                <div class="mt-8 border border-singularity/20 p-6 rounded-xl bg-singularity/5 relative overflow-hidden">
                  <div class="absolute top-0 right-0 p-4 opacity-20">
                    <Activity class="text-singularity" :size="48" />
                  </div>
                  <div class="text-singularity font-black mb-4 tracking-[0.2em] text-center text-[10px] uppercase">FINAL REPORT</div>
                  <div class="grid grid-cols-2 gap-x-8 gap-y-2 text-zinc-400 text-[10px] uppercase tracking-widest font-bold">
                    <div>Telescope Range</div><div class="text-right text-white font-mono font-bold">1,000,000 URLs</div>
                    <div>Build Velocity</div><div class="text-right text-white font-mono font-bold">14.2s TOTAL</div>
                    <div>Energy Signature</div><div class="text-right text-singularity font-mono font-bold">84MB RAM</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Full Report Link -->
        <div class="mt-12 text-center animate-fade-in" style="animation-delay: 0.5s">
          <StaticLink 
            href="/docs/benchmark"
            class="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-singularity/30 bg-singularity/10 text-singularity hover:bg-singularity/20 hover:scale-105 transition-all font-mono text-sm group"
          >
            <FileText :size="16" />
            <span class="group-hover:underline underline-offset-4">
              {{ t.benchmark.benchmark_cta }}
            </span>
            <ChevronRight :size="16" class="group-hover:translate-x-1 transition-transform" />
          </StaticLink>
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
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.05); }
}

.animate-pulse-slow {
  animation: pulse-slow 8s infinite ease-in-out;
}

@keyframes gradient-x {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-gradient-x {
  animation: gradient-x 15s ease infinite;
}

.bg-300\% {
  background-size: 300% 300%;
}

.perspective-1000 {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.rotate-x-2 {
  transform: rotateX(2deg);
}
</style>