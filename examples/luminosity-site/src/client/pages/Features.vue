<script setup lang="ts">
import { Activity, Layers, Share2, Zap } from 'lucide-vue-next'
import { computed } from 'vue'
import { useI18n } from '../composables/useI18n'

const { t, locale } = useI18n()

const points = computed(() => [
  {
    icon: Zap,
    title: t.value?.features_page?.points?.atomic?.title,
    desc: t.value?.features_page?.points?.atomic?.desc,
    color: 'bg-emerald-500/20 text-emerald-400',
    docsLink: '/docs/architecture#atomic-sequential-writes',
  },
  {
    icon: Share2,
    title: t.value?.features_page?.points?.compaction?.title,
    desc: t.value?.features_page?.points?.compaction?.desc,
    color: 'bg-green-500/20 text-green-400',
    docsLink: '/docs/architecture#dynamic-compaction',
  },
  {
    icon: Activity,
    title: t.value?.features_page?.points?.zerocopy?.title,
    desc: t.value?.features_page?.points?.zerocopy?.desc,
    color: 'bg-teal-500/20 text-teal-400',
    docsLink: '/docs/architecture#zero-copy-serialization',
  },
  {
    icon: Layers,
    title: t.value?.features_page?.points?.tiered?.title,
    desc: t.value?.features_page?.points?.tiered?.desc,
    color: 'bg-emerald-600/20 text-emerald-300',
    docsLink: '/docs/architecture#tiered-storage',
  },
])
</script>

<template>
  <Layout>
    <Head>
      <title>Features | Luminosity</title>
    </Head>

    <!-- Hero Section -->
    <section class="relative py-32 px-6 overflow-hidden">
      <div class="absolute inset-0 bg-black">
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/10 rounded-full blur-[150px] animate-pulse" />
      </div>

      <div class="max-w-4xl mx-auto relative z-10 text-center">
        <div class="mb-8 inline-block">
          <div class="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative group">
            <div class="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <Cpu :size="64" class="text-emerald-500 relative z-10" />
          </div>
        </div>

        <h1 class="text-6xl md:text-8xl font-black italic tracking-tighter text-white mb-6 uppercase">
          {{ t?.features_page?.hero?.title }} <span class="text-emerald-500">{{ t?.features_page?.hero?.highlight }}</span>
        </h1>

        <p class="text-xl text-gray-400 font-medium max-w-2xl mx-auto">
          {{ t?.features_page?.hero?.desc }}
        </p>
      </div>
    </section>

    <!-- Core Deep Dive -->
    <section class="relative py-24 px-6 bg-black z-20">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center mb-32">
          <div>
            <h2 class="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-8 uppercase">
              {{ t?.features_page?.core?.title }} <span class="text-emerald-500">{{ t?.features_page?.core?.highlight }}</span> {{ t?.features_page?.core?.suffix }}
            </h2>
            <p class="text-lg text-gray-400 leading-relaxed font-light">
              {{ t?.features_page?.core?.desc }}
            </p>

            <!-- Code Sample -->
            <div class="mt-12 p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm relative overflow-hidden group">
              <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
              <div class="flex items-center gap-4 mb-6">
                <Terminal :size="24" class="text-emerald-500" />
                <span class="text-xs font-black text-gray-500 uppercase tracking-widest">
                  Luminosity Runtime
                </span>
              </div>
              <div class="font-mono text-sm space-y-2 text-gray-300">
                <div class="flex gap-4">
                  <span class="text-emerald-500 opacity-50">01</span>
                  <span>import { Luminosity } from '@gravito/luminosity'</span>
                </div>
                <div class="flex gap-4">
                  <span class="text-emerald-500 opacity-50">02</span>
                  <span>const engine = new Luminosity({ path: './db' })</span>
                </div>
                <div class="flex gap-4">
                  <span class="text-emerald-500 opacity-50">03</span>
                  <span>// High-speed atomic batch write</span>
                </div>
                <div class="flex gap-4 font-bold text-white">
                  <span class="text-emerald-500 opacity-50">04</span>
                  <span>await engine.writeBatch(records)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Feature Cards -->
          <div class="grid grid-cols-1 gap-6">
            <div
              v-for="(point, index) in points"
              :key="point.title"
              class="p-8 rounded-[24px] bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all hover:bg-white/[0.05] group"
            >
              <div class="flex items-start gap-6">
                <div :class="`p-4 rounded-xl ${point.color} group-hover:scale-110 transition-transform` ">
                  <component :is="point.icon" :size="28" />
                </div>
                <div>
                  <h3 class="text-xl font-bold text-white mb-2">{{ point.title }}</h3>
                  <p class="text-gray-400 text-sm leading-relaxed mb-4">{{ point.desc }}</p>
                  <StaticLink 
                    :href="point.docsLink"
                    class="text-xs font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 flex items-center gap-1 group/btn"
                  >
                    {{ locale === 'zh' ? '了解更多' : 'Learn More' }}
                    <ChevronRight :size="14" class="group-hover/btn:translate-x-1 transition-transform" />
                  </StaticLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Architecture Section -->
    <section class="relative py-24 px-6 bg-white/[0.02] border-y border-white/5 z-20">
      <div class="max-w-6xl mx-auto text-center mb-16">
        <h2 class="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-6 uppercase">
            {{ t?.features_page?.architecture?.title }} <span class="text-emerald-500">{{ t?.features_page?.architecture?.highlight }}</span>
        </h2>
        <p class="text-lg text-gray-400 leading-relaxed font-light max-w-3xl mx-auto">
            {{ t?.features_page?.architecture?.desc }}
        </p>
      </div>
      
      <div class="max-w-5xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
            <!-- Step 1 -->
            <div class="p-6 rounded-2xl bg-black border border-white/10 text-center relative group">
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">INPUT</div>
                <div class="mb-4 text-emerald-500 flex justify-center"><Activity :size="32" /></div>
                <div class="text-white font-bold">{{ t?.features_page?.architecture?.step1 }}</div>
                <div class="absolute right-[-1rem] top-1/2 -translate-y-1/2 text-gray-700 hidden md:block">
                   <ChevronRight :size="24" />
                </div>
            </div>
             <!-- Step 2 -->
             <div class="p-6 rounded-2xl bg-black border border-white/10 text-center relative group">
                <div class="mb-4 text-emerald-500 flex justify-center"><Zap :size="32" /></div>
                <div class="text-white font-bold">{{ t?.features_page?.architecture?.step2 }}</div>
                 <div class="absolute right-[-1rem] top-1/2 -translate-y-1/2 text-gray-700 hidden md:block">
                   <ChevronRight :size="24" />
                </div>
            </div>
             <!-- Step 3 -->
             <div class="p-6 rounded-2xl bg-black border border-white/10 text-center relative group">
                <div class="mb-4 text-emerald-500 flex justify-center"><Layers :size="32" /></div>
                <div class="text-white font-bold">{{ t?.features_page?.architecture?.step3 }}</div>
                 <div class="absolute right-[-1rem] top-1/2 -translate-y-1/2 text-gray-700 hidden md:block">
                   <ChevronRight :size="24" />
                </div>
            </div>
             <!-- Step 4 -->
             <div class="p-6 rounded-2xl bg-black border border-white/10 text-center relative group">
                <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">OUTPUT</div>
                <div class="mb-4 text-emerald-500 flex justify-center"><Share2 :size="32" /></div>
                <div class="text-white font-bold">{{ t?.features_page?.architecture?.step4 }}</div>
            </div>
        </div>
      </div>
    </section>
    
    <!-- Governance Section -->
    <section class="relative py-24 px-6 bg-black z-20">
        <div class="max-w-6xl mx-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                <div class="order-2 md:order-1">
                    <div class="relative group">
                         <div class="absolute inset-0 bg-emerald-500/10 blur-[80px] rounded-full group-hover:opacity-100 transition-opacity opacity-50" />
                        <div class="relative z-10 p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
                            <div class="flex items-center gap-4 mb-6 border-b border-white/5 pb-6">
                                <Shield :size="32" class="text-emerald-500" />
                                <div class="text-xl font-bold text-white">Security Shield Active</div>
                            </div>
                            <div class="space-y-4">
                                <div class="flex justify-between items-center text-sm">
                                    <span class="text-gray-400">Bot Traffic</span>
                                    <span class="text-emerald-400 font-mono">BLOCKED (429)</span>
                                </div>
                                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-emerald-500 w-[12%]" />
                                </div>
                                 <div class="flex justify-between items-center text-sm">
                                    <span class="text-gray-400">Googlebot</span>
                                    <span class="text-emerald-400 font-mono">ALLOWED (200)</span>
                                </div>
                                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div class="h-full bg-emerald-500 w-[85%]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="order-1 md:order-2">
                    <h2 class="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-8 uppercase">
                    {{ t?.features_page?.governance?.title }} <span class="text-emerald-500">{{ t?.features_page?.governance?.highlight }}</span>
                    </h2>
                    <p class="text-lg text-gray-400 leading-relaxed font-light mb-12">
                     {{ t?.features_page?.governance?.desc }}
                    </p>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div class="p-6 rounded-2xl bg-white/[0.03] border-l-2 border-emerald-500">
                             <h4 class="text-white font-bold mb-2">{{ t?.features_page?.governance?.cards?.rate_limit?.title }}</h4>
                             <p class="text-sm text-gray-400">{{ t?.features_page?.governance?.cards?.rate_limit?.desc }}</p>
                        </div>
                        <div class="p-6 rounded-2xl bg-white/[0.03] border-l-2 border-emerald-500">
                             <h4 class="text-white font-bold mb-2">{{ t?.features_page?.governance?.cards?.stale?.title }}</h4>
                             <p class="text-sm text-gray-400">{{ t?.features_page?.governance?.cards?.stale?.desc }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- CLI Section -->
    <section class="relative py-24 px-6 bg-white/[0.02] border-t border-white/5 z-20">
        <div class="max-w-4xl mx-auto text-center">
             <h2 class="text-4xl md:text-5xl font-black italic tracking-tighter text-white mb-6 uppercase">
                {{ t?.features_page?.cli?.title }} <span class="text-emerald-500">{{ t?.features_page?.cli?.highlight }}</span>
            </h2>
            <p class="text-lg text-gray-400 mb-12">
                {{ t?.features_page?.cli?.desc }}
            </p>
            <div class="text-left bg-black rounded-xl border border-white/10 p-6 font-mono text-sm shadow-2xl overflow-hidden">
                <div class="flex gap-2 mb-4 border-b border-white/10 pb-4">
                    <div class="w-3 h-3 rounded-full bg-red-500" />
                    <div class="w-3 h-3 rounded-full bg-yellow-500" />
                    <div class="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div class="text-gray-300 space-y-2">
                    <div><span class="text-emerald-500">user@dev:~/project$</span> bun lux:stats</div>
                    <div class="pl-4 text-gray-500">
                        ┌  Luminosity Status<br>
                        │  <span class="text-white">Total URLs:</span> <span class="text-emerald-400">1,240,592</span><br>
                        │  <span class="text-white">Index Size:</span> <span class="text-emerald-400">45.2 MB</span><br>
                        │  <span class="text-white">Fragments:</span> <span class="text-emerald-400">12</span><br>
                        └  Ready.
                    </div>
                     <div><span class="text-emerald-500">user@dev:~/project$</span> bun lux:warm --force</div>
                     <div class="pl-4 text-gray-500">
                       <span class="text-emerald-400">✔</span> Compaction started...<br>
                       <span class="text-emerald-400">✔</span> Cache warming complete (142ms)
                     </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Bottom CTA -->
    <section class="py-32 px-6 text-center bg-black border-t border-white/5">
      <h2 class="text-3xl font-bold text-white mb-8">{{ t?.features_page?.cta?.title }}</h2>
      <StaticLink
        href="/docs/getting-started"
        class="px-10 py-4 bg-emerald-500 text-black font-black italic rounded-full hover:scale-105 active:scale-95 transition-all inline-block"
      >
        {{ t?.features_page?.cta?.btn }}
      </StaticLink>
    </section>
  </Layout>
</template>
