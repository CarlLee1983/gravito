<template>
  <!-- Background with grid and gradient -->
  <div class="min-h-screen bg-atlas-void bg-grid-pattern relative overflow-hidden flex flex-col">
    <!-- Background Image Layer -->
    <div class="absolute inset-0 z-0 select-none pointer-events-none">
        <img src="/hero-bg.jpg" class="w-full h-full object-cover opacity-30 mix-blend-lighten filter contrast-125 saturate-150" alt="Cosmic Background" />
        <div class="absolute inset-0 bg-gradient-to-t from-atlas-void via-atlas-void/50 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-atlas-void via-transparent to-transparent"></div>
    </div>
    
    <!-- Cosmic Gradient Orb (The Black Hole Accretion Disk vibe) -->
    <div class="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-cosmic-gradient opacity-60 blur-[100px] pointer-events-none mix-blend-screen"></div>

    <!-- Navigation -->
    <nav class="relative z-50 flex justify-between items-center px-8 py-6 border-b border-white/5 backdrop-blur-sm">
      <div class="flex items-center gap-3">
        <!-- Logo Icon (Abstract Spiral) -->
        <svg class="w-8 h-8 text-atlas-cyan animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-xl font-bold tracking-wider font-mono">@gravito/<span class="text-atlas-cyan">atlas</span></span>
      </div>
      <div class="hidden md:flex gap-8 text-sm font-medium text-gray-400">
        <a href="#" class="hover:text-atlas-cyan transition-colors">Home</a>
        <a href="#" class="hover:text-atlas-cyan transition-colors">Features</a>
        <a href="#" class="hover:text-atlas-cyan transition-colors">Company</a>
        <a href="#" class="hover:text-atlas-cyan transition-colors">Support</a>
        <a href="#" class="hover:text-atlas-cyan transition-colors">Gravits</a>
      </div>
      <div class="flex items-center gap-6">
        <button class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all transform hover:scale-105 active:scale-95">
          Download
        </button>
      </div>
    </nav>

    <!-- Hero Content -->
    <main class="flex-grow relative z-10 flex flex-col justify-center items-start px-8 md:px-20 max-w-7xl mx-auto w-full mt-10 md:mt-0">
      <h2 class="text-atlas-cyan font-bold tracking-[0.2em] mb-4 text-sm md:text-base animate-slide-in-up uppercase">ATLAS:</h2>
      <h1 class="text-5xl md:text-7xl font-extrabold leading-tight text-white mb-8 max-w-4xl font-sans drop-shadow-2xl">
        STRUCTURING THE CHAOS<br /> 
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 to-gray-500">AT THE EDGE OF GRAVITY.</span>
      </h1>
      <p class="text-gray-400 max-w-xl text-lg mb-12 leading-relaxed font-light border-l-2 border-atlas-cyan pl-6">
        The universal database interface for the Gravito ecosystem.  
        Query, migrate, and structure your data with cosmic precision.
      </p>

      <!-- Verification Demo Preview -->
      <div class="w-full max-w-2xl bg-[#0a0a0a]/80 backdrop-blur-xl border border-atlas-cyan/20 rounded-lg p-6 font-mono text-sm shadow-2xl relative group hover:border-atlas-cyan/50 transition-all duration-500 transform overflow-hidden" ref="demoCard">
        <!-- Glow effect -->
        <div class="absolute -inset-[100%] bg-gradient-to-r from-transparent via-atlas-cyan/10 to-transparent rotate-45 group-hover:via-atlas-cyan/20 transition-all duration-1000 translate-x-[-100%] group-hover:translate-x-[100%]"></div>
        
        <div class="absolute -top-3 -right-3 bg-atlas-cyan text-black px-3 py-1 text-xs font-bold rounded shadow-[0_0_10px_rgba(0,240,255,0.5)]">LIVE DEMO</div>
        
        <div class="flex gap-2 mb-4 border-b border-gray-800 pb-2">
           <div class="w-3 h-3 rounded-full bg-red-500"></div>
           <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
           <div class="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        
        <div class="space-y-2 relative z-10">
            <div class="text-gray-500 italic">// Initialize Atlas Connection & Query</div>
            <div>
              <span class="text-purple-400">const</span> <span class="text-blue-300">planet</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>.<span class="text-blue-300">table</span>(<span class="text-green-300">'exoplanets'</span>)
            </div>
            <div class="pl-4">.<span class="text-blue-300">where</span>(<span class="text-green-300">'gravity_g'</span>, <span class="text-pink-400">'>='</span>, <span class="text-orange-300">1.8</span>)</div>
            <div class="pl-4">.<span class="text-blue-300">orderBy</span>(<span class="text-green-300">'distance_ly'</span>, <span class="text-green-300">'asc'</span>)</div>
            <div class="pl-4">.<span class="text-blue-300">first</span>()</div>
            
            <div class="pt-4 text-gray-400 border-t border-gray-800 mt-4 text-xs flex justify-between">
                <span>Console Output:</span>
                <button @click="runDemo" class="text-atlas-cyan hover:text-white cursor-pointer px-2 py-0.5 rounded bg-atlas-cyan/10 hover:bg-atlas-cyan/20">▶ Re-run</button>
            </div>
            <div v-if="loading" class="text-atlas-cyan/50 italic animate-pulse mt-2 h-10 flex items-center">
                <span class="inline-block w-2 h-2 bg-atlas-cyan rounded-full animate-ping mr-2"></span>
                Running query on cosmic stream...
            </div>
            <div v-else class="text-atlas-cyan font-bold break-all mt-2 font-mono text-xs">
                <div class="text-[10px] text-gray-600 mb-2 border-b border-gray-900 pb-1 font-mono opacity-50">{{ demoResult?.sql }}</div>
                <pre class="bg-black/30 p-2 rounded">{{ JSON.stringify(demoResult?.data, null, 2) }}</pre>
            </div>
        </div>
      </div>
    </main>

    <Features />
    <Installation />
    <Footer />

    <!-- 3D Structural Effect (Simulated) -->
    <!-- Floating Orbit Elements -->
    <div class="absolute right-[-5%] top-[15%] w-[800px] h-[800px] perspective-1000 hidden lg:block opacity-60 pointer-events-none">
        
        <!-- Orbital Rings -->
        <div class="absolute inset-0 border border-atlas-cyan/20 rounded-full w-[600px] h-[600px] top-[100px] left-[100px] animate-spin-slow"></div>
        <div class="absolute inset-0 border border-purple-500/20 rounded-full w-[800px] h-[800px] animate-spin-reverse-slower"></div>

        <!-- Floating Database Cubes -->
        <div class="absolute top-[30%] left-[40%] w-24 h-24 border border-atlas-cyan bg-atlas-cyan/5 backdrop-blur-sm shadow-[0_0_30px_rgba(0,240,255,0.2)] transform rotate-12 flex items-center justify-center text-sm font-bold animate-float-1">Postgres</div>
        
        <div class="absolute top-[60%] left-[20%] w-20 h-20 border border-blue-500 bg-blue-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.2)] transform -rotate-12 flex items-center justify-center text-sm font-bold animate-float-2">MySQL</div>

        <div class="absolute top-[50%] left-[70%] w-16 h-16 border border-purple-500 bg-purple-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.2)] transform rotate-45 flex items-center justify-center text-xs font-bold animate-float-3">SQLite</div>
        
        <!-- Connection Lines -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <line x1="40%" y1="30%" x2="20%" y2="60%" stroke="#00f0ff" stroke-dasharray="4 4" />
          <line x1="40%" y1="30%" x2="70%" y2="50%" stroke="#00f0ff" stroke-dasharray="4 4" />
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
</style>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Features from './components/Features.vue'
import Installation from './components/Installation.vue'
import Footer from './components/Footer.vue'

const demoResult = ref<any>(null)
const loading = ref(true)

async function runDemo() {
    loading.value = true
    try {
        const res = await fetch('/api/demo')
        const data = await res.json()
        setTimeout(() => {
            demoResult.value = data
            loading.value = false
        }, 1500) // Delay for cinematic effect
    } catch (e) {
        console.error(e)
        loading.value = false
    }
}

onMounted(() => {
    runDemo()
})
</script>
