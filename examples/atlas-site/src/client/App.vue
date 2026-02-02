<template>
  <div class="min-h-screen bg-atlas-void text-atlas-star font-sans selection:bg-primary selection:text-white flex flex-col relative overflow-hidden">
    
    <!-- Grainy Noise Overlay -->
    <div class="fixed inset-0 z-[100] pointer-events-none opacity-[0.03] bg-noise-pattern mix-blend-overlay"></div>

    <!-- Mouse Tracking Spotlight -->
    <div 
      class="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
      :style="{
        background: `radial-gradient(600px circle at ${mouseX}px ${mouseY}px, rgba(59, 130, 246, 0.08), transparent 80%)`
      }"
    ></div>
    
    <!-- Ambient Background Effects -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <!-- Deep Space Gradient -->
      <div class="absolute inset-0 bg-cosmic-gradient opacity-90"></div>

      <!-- Grand Nebula Arc (底部巨大光弧) -->
      <div class="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[150%] h-[60%] bg-nebula-arc blur-[120px] rounded-[100%] opacity-60"></div>

      <!-- Atmospheric Light Rays (垂直光譜) -->
      <div class="absolute inset-0 opacity-40">
        <div class="absolute top-0 left-1/4 w-[1px] h-full bg-light-ray animate-ray-move"></div>
        <div class="absolute top-0 left-1/2 w-[1px] h-full bg-light-ray animate-ray-move" style="animation-delay: -2s"></div>
        <div class="absolute top-0 left-3/4 w-[1px] h-full bg-light-ray animate-ray-move" style="animation-delay: -5s"></div>
      </div>

      <!-- Data Stream Effect (數據流) -->
      <div class="absolute inset-0 z-0 opacity-[0.15]">
        <div v-for="i in 12" :key="i" 
          class="absolute w-[1px] h-40 bg-data-stream animate-data-flow"
          :style="{
            left: (i * 8) + '%',
            top: '-10%',
            animationDelay: (i * 0.7) + 's',
            animationDuration: (Math.random() * 4 + 4) + 's'
          }"
        ></div>
      </div>

      <!-- Subtle Grid -->
      <div class="absolute inset-0 bg-subtle-grid opacity-20"></div>
      
      <!-- Top Gradient Glow -->
      <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] bg-primary/5 blur-[180px] rounded-full mix-blend-screen animate-pulse-glow"></div>
    </div>

    <!-- Floating Navbar -->
    <div class="fixed top-8 left-1/2 -translate-x-1/2 z-[110] w-[92%] max-w-6xl">
      <nav class="w-full border border-white/10 bg-atlas-void/20 backdrop-blur-3xl rounded-2xl shadow-glass transition-all duration-500 hover:border-white/20">
        <div class="px-8 h-16 flex items-center justify-between">
          
          <!-- Logo -->
          <div class="flex items-center gap-4 cursor-pointer group" @click="$router.push('/')">
            <div class="relative w-10 h-10 flex items-center justify-center">
               <div class="absolute inset-0 bg-primary/20 rounded-xl rotate-6 group-hover:rotate-12 transition-transform duration-700"></div>
               <div class="absolute inset-0 bg-primary/20 rounded-xl -rotate-6 group-hover:-rotate-12 transition-transform duration-700"></div>
               <div class="relative z-10 bg-atlas-surface border border-white/20 rounded-xl w-full h-full flex items-center justify-center shadow-neon-blue group-hover:border-primary/60 transition-colors">
                  <svg class="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
               </div>
            </div>
            <span class="text-2xl font-display font-black tracking-tighter text-white group-hover:text-primary-glow transition-colors">
              GRAVITO <span class="text-primary font-bold">ATLAS</span>
            </span>
          </div>

          <!-- Desktop Links -->
          <div class="hidden md:flex items-center gap-2">
             <template v-for="link in navLinks" :key="link.path">
              <StaticLink v-if="link.external" :href="link.path" target="_blank" class="px-6 py-2 text-xs font-mono font-bold tracking-widest uppercase text-atlas-metallic hover:text-white transition-all rounded-full hover:bg-white/5">{{ t(link.name) }}</StaticLink>
              <StaticLink v-else :to="link.path" class="px-6 py-2 text-xs font-mono font-bold tracking-widest uppercase text-atlas-metallic hover:text-white transition-all rounded-full hover:bg-white/5" active-class="text-white bg-white/10 shadow-inner-glow">{{ t(link.name) }}</StaticLink>
            </template>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-6">
            <button @click="toggleLang" class="text-[10px] font-mono font-black text-gray-500 hover:text-white transition-colors uppercase tracking-[0.2em] px-3 py-1.5 border border-white/5 hover:border-white/20 rounded-lg bg-white/5">
               {{ locale === 'en' ? 'TW' : 'EN' }}
            </button>
            
            <StaticLink to="/docs/cli" class="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-primary-glow hover:shadow-neon-blue transition-all duration-500 active:scale-95">
              Get Started
            </StaticLink>
          </div>
        </div>
      </nav>
    </div>

    <!-- Content Spacing -->
    <div class="pt-32"></div>

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
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

// biome-ignore lint/correctness/noUnusedVariables: Used in template
const { t, locale } = useI18n()

const mouseX = ref(0)
const mouseY = ref(0)

function handleMouseMove(e: MouseEvent) {
  mouseX.value = e.clientX
  mouseY.value = e.clientY
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
})

// biome-ignore lint/correctness/noUnusedVariables: Used in template
const navLinks = [
  { name: 'nav.home', path: '/' },
  { name: 'nav.features', path: '/features' },
  { name: 'nav.docs', path: 'https://gravito.dev/en/docs/guide/orm-usage', external: true },
]

// biome-ignore lint/correctness/noUnusedVariables: Used in template
function toggleLang() {
  locale.value = locale.value === 'en' ? 'zh-TW' : 'en'
}
</script>