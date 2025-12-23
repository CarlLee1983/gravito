<template>
  <!-- Background with grid and gradient -->
  <div class="min-h-screen bg-atlas-void bg-grid-pattern relative overflow-hidden flex flex-col">
    <!-- Background Image Layer -->
    <div class="absolute inset-0 z-0 select-none pointer-events-none">
        <img src="/hero-bg.png" class="w-full h-full object-cover opacity-60 mix-blend-lighten filter contrast-125 saturate-150" alt="Cosmic Background" />
        <div class="absolute inset-0 bg-gradient-to-t from-atlas-void via-atlas-void/50 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-atlas-void via-transparent to-transparent"></div>
    </div>
    
    <!-- Global Data Flux Layer (Transportation & Movement) -->
    <div class="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
        <div class="data-stream data-stream-1"></div>
        <div class="data-stream data-stream-2"></div>
        <div class="data-stream data-stream-3"></div>
        <!-- Moving "Data Packets" -->
        <div class="data-packet" v-for="n in 12" :key="n" :style="generatePacketStyle(n)"></div>

        <!-- Vertical Data Bus (Side Rail) -->
        <div class="fixed left-4 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-atlas-cyan/20 to-transparent hidden lg:block">
            <div class="absolute inset-0 bg-atlas-cyan/5"></div>
            <!-- Flowing packets on the bus -->
            <div class="bus-packet" v-for="i in 5" :key="i" :style="{ '--delay': (i * 2) + 's' }"></div>
        </div>
    </div>
    
    <!-- Cosmic Gradient Orb (The Black Hole Accretion Disk vibe) -->
    <div class="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-cosmic-gradient opacity-60 blur-[100px] pointer-events-none mix-blend-screen"></div>

    <!-- Navigation -->
    <nav class="relative z-50 flex justify-between items-center px-8 py-6 border-b border-white/5 backdrop-blur-sm">
      <div class="flex items-center gap-3 cursor-pointer" @click="$router.push('/')">
        <!-- Logo Icon (Abstract Spiral) -->
        <svg class="w-8 h-8 text-atlas-cyan animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-xl font-bold tracking-wider font-mono">@gravito/<span class="text-atlas-cyan">atlas</span></span>
      </div>
      <div class="hidden md:flex gap-8 text-sm font-medium text-gray-400">
        <template v-for="link in navLinks" :key="link.path">
            <a v-if="link.external" :href="link.path" target="_blank" class="hover:text-atlas-cyan transition-colors">{{ t(link.name) }}</a>
            <router-link v-else :to="link.path" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">{{ t(link.name) }}</router-link>
        </template>
        <a href="https://gravito.dev/docs" target="_blank" class="hover:text-atlas-cyan transition-colors">{{ t('nav.docs') }}</a>
      </div>
      <div class="flex items-center gap-6">
          <button @click="toggleLang" class="text-gray-400 hover:text-white font-mono text-xs border border-white/20 px-3 py-1 rounded transition-colors uppercase">
             {{ locale === 'en' ? '繁中' : 'EN' }}
          </button>
          <a href="https://github.com/gravito-framework/gravito/tree/main/packages/atlas" target="_blank" class="text-gray-400 hover:text-white transition-colors">
              <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clip-rule="evenodd" /></svg>
          </a>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex-grow flex flex-col">
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </div>

    <Footer />

    <!-- 3D Structural Effect (Simulated) -->
    <!-- Floating Orbit Elements -->
    <div class="absolute right-[-10%] top-[10%] w-[800px] h-[800px] perspective-1000 hidden lg:block opacity-70 pointer-events-none fixed transform scale-40 origin-center">
        
        <!-- Orbital Rings -->
        <div class="absolute inset-0 border border-atlas-cyan/20 rounded-full w-[600px] h-[600px] top-[100px] left-[100px] animate-spin-slow"></div>
        <div class="absolute inset-0 border border-purple-500/20 rounded-full w-[800px] h-[800px] animate-spin-reverse-slower"></div>

        <!-- Floating Database Nodes with Subtle Symbols -->
        <!-- PostgreSQL - Deep Blue / Elephant Signal -->
        <div class="absolute top-[30%] left-[40%] w-24 h-24 border border-atlas-cyan bg-atlas-cyan/5 backdrop-blur-md shadow-[0_0_40px_rgba(0,240,255,0.15)] transform rotate-12 animate-float-1 flex items-center justify-center group">
            <svg class="w-12 h-12 text-atlas-cyan/40 group-hover:text-atlas-cyan transition-colors duration-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M12 12V22" />
            </svg>
            <div class="absolute -bottom-4 text-[8px] font-mono tracking-widest text-atlas-cyan/30">PG_SERVICE</div>
        </div>
        
        <!-- MySQL - Blue / Dolphin Signal -->
        <div class="absolute top-[65%] left-[15%] w-20 h-20 border border-blue-500 bg-blue-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.1)] transform -rotate-12 animate-float-2 flex items-center justify-center group">
            <svg class="w-10 h-10 text-blue-500/40 group-hover:text-blue-400 transition-colors duration-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M4 14C4 14 5 11 12 11C19 11 20 14 20 14" />
              <path d="M12 11V3" />
            </svg>
            <div class="absolute -bottom-4 text-[8px] font-mono tracking-widest text-blue-500/30">MYSQL_FLUX</div>
        </div>

        <!-- SQLite - Purple / Feather Signal -->
        <div class="absolute top-[55%] left-[75%] w-16 h-16 border border-purple-500 bg-purple-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.1)] transform rotate-45 animate-float-3 flex items-center justify-center group">
            <svg class="w-8 h-8 text-purple-500/40 group-hover:text-purple-400 transition-colors duration-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8V16M8 12H16" />
            </svg>
            <div class="absolute -bottom-4 text-[8px] font-mono tracking-widest text-purple-500/30">SQLITE_CORE</div>
        </div>
        
        <!-- MariaDB - Green / Wave Signal -->
        <div class="absolute top-[15%] left-[70%] w-14 h-14 border border-green-500 bg-green-500/5 backdrop-blur-sm shadow-[0_0_20px_rgba(34,197,94,0.1)] transform rotate-6 animate-float-2 flex items-center justify-center group">
             <svg class="w-6 h-6 text-green-500/40 group-hover:text-green-400 transition-colors duration-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
              <path d="M22 12H18L15 21L9 3L6 12H2" />
            </svg>
            <div class="absolute -bottom-4 text-[8px] font-mono tracking-widest text-green-500/30">MARIA_DATA</div>
        </div>

        <!-- Laser Data Rays / High Intensity Connections -->
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" class="absolute inset-0 w-full h-full pointer-events-none opacity-80 animate-breathe">
          <defs>
            <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur"/>
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
            
            <linearGradient id="laser-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#00f0ff" stop-opacity="0" />
              <stop offset="50%" stop-color="#00f0ff" stop-opacity="1" />
              <stop offset="100%" stop-color="#00f0ff" stop-opacity="0" />
            </linearGradient>
          </defs>
          
          <!-- PG to MySQL Laser Ray -->
          <g class="laser-group">
            <path d="M40 30 Q 30 45 15 65" stroke="#00f0ff" stroke-width="0.1" fill="none" opacity="0.3" />
            <path d="M40 30 Q 30 45 15 65" stroke="url(#laser-cyan)" stroke-width="0.6" fill="none" class="animate-laser-pulse" filter="url(#laser-glow)" />
          </g>
          
          <!-- PG to SQLite Laser Ray -->
          <g class="laser-group">
            <path d="M40 30 Q 55 40 75 55" stroke="#00f0ff" stroke-width="0.1" fill="none" opacity="0.3" />
            <path d="M40 30 Q 55 40 75 55" stroke="#00f0ff" stroke-width="0.4" stroke-dasharray="2 10" fill="none" class="animate-laser-pulse-fast" filter="url(#laser-glow)" />
          </g>
          
          <!-- Complex Systemic Grid Lines -->
          <path d="M0 50 L 100 50" stroke="white" stroke-width="0.05" opacity="0.05" />
          <path d="M50 0 L 50 100" stroke="white" stroke-width="0.05" opacity="0.05" />
        </svg>
    </div>
  </div>
</template>

<style>
.perspective-1000 {
    perspective: 1000px;
}
@keyframes spin-slow {
    from { transform: rotate(0deg) rotateX(60deg); }
    to { transform: rotate(360deg) rotateX(60deg); }
}
@keyframes spin-reverse-slower {
    from { transform: rotate(360deg) rotateX(60deg); }
    to { transform: rotate(0deg) rotateX(60deg); }
}
.animate-spin-slow {
    animation: spin-slow 20s linear infinite;
}
.animate-spin-reverse-slower {
    animation: spin-reverse-slower 30s linear infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}
@keyframes float-rev {
  0%, 100% { transform: translateY(0) rotate(-12deg); }
  50% { transform: translateY(20px) rotate(-15deg); }
}

.animate-float-1 { animation: float 6s ease-in-out infinite; }
.animate-float-2 { animation: float-rev 7s ease-in-out infinite; }
.animate-float-3 { animation: float 5s ease-in-out infinite; }

@keyframes laser-pulse {
  0% { stroke-dashoffset: 200; stroke-opacity: 0; }
  10%, 90% { stroke-opacity: 1; }
  100% { stroke-dashoffset: 0; stroke-opacity: 0; }
}

@keyframes breathe-glow {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(0, 240, 255, 0.3)); opacity: 0.6; }
  50% { filter: drop-shadow(0 0 20px rgba(0, 240, 255, 0.8)); opacity: 1; }
}

.animate-laser-pulse {
  stroke-dasharray: 40 160;
  animation: laser-pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animate-laser-pulse-fast {
  stroke-dasharray: 10 40;
  animation: laser-pulse 1s linear infinite;
}

.animate-breathe {
  animation: breathe-glow 4s ease-in-out infinite;
}

.laser-group {
  mix-blend-mode: plus-lighter;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Global Data Stream & Packet Animations */
.data-stream {
  position: absolute;
  width: 1px;
  height: 200%;
  background: linear-gradient(to bottom, transparent, rgba(0, 240, 255, 0.2), transparent);
  top: -50%;
  left: calc(var(--x) * 1%);
  animation: stream-flow var(--dur) linear infinite;
  opacity: 0.1;
}

.data-stream-1 { --x: 20; --dur: 15s; }
.data-stream-2 { --x: 50; --dur: 25s; }
.data-stream-3 { --x: 80; --dur: 20s; }

@keyframes stream-flow {
  from { transform: translateY(-50%); }
  to { transform: translateY(50%); }
}

.data-packet {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #00f0ff;
  border-radius: 50%;
  box-shadow: 0 0 8px #00f0ff, 0 0 15px rgba(0, 240, 255, 0.5);
  animation: packet-move var(--dur) linear infinite;
  opacity: 0;
}

@keyframes packet-move {
  0% { transform: translate(var(--sx), var(--sy)); opacity: 0; }
  10% { opacity: 0.8; }
  90% { opacity: 0.8; }
  100% { transform: translate(var(--ex), var(--ey)); opacity: 0; }
}

.bus-packet {
  position: absolute;
  left: -1px;
  width: 3px;
  height: 20px;
  background: linear-gradient(to bottom, transparent, #00f0ff, transparent);
  box-shadow: 0 0 10px #00f0ff;
  animation: bus-flow 8s linear infinite;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes bus-flow {
  0% { top: -20px; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
</style>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Footer from './components/Footer.vue'

const { t, locale } = useI18n()

const navLinks: { name: string, path: string, external?: boolean }[] = [
  { name: 'nav.home', path: '/' },
  { name: 'nav.features', path: '/features' },
]

function toggleLang() {
  locale.value = locale.value === 'en' ? 'zh-TW' : 'en'
}

// Helper for generating dynamic data packets
function generatePacketStyle(n: number) {
  const isVertical = n % 2 === 0
  const startPos = Math.random() * 100
  const duration = 5 + Math.random() * 10
  const delay = Math.random() * 10

  return {
    '--sx': isVertical ? `${startPos}vw` : `-10vw`,
    '--sy': isVertical ? `-10vh` : `${startPos}vh`,
    '--ex': isVertical ? `${startPos}vw` : `110vw`,
    '--ey': isVertical ? `110vh` : `${startPos}vh`,
    '--dur': `${duration}s`,
    'animation-delay': `${delay}s`
  }
}
</script>
