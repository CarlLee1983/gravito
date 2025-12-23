<template>
  <div class="relative z-10 pb-20">
    <!-- Hero Content -->
    <main class="flex flex-col justify-center items-start px-8 md:px-20 max-w-7xl mx-auto w-full mt-10 md:mt-24 mb-20">
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Features from '@/client/components/Features.vue'
import Installation from '@/client/components/Installation.vue'

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
        }, 1500)
    } catch (e) {
        console.error(e)
        loading.value = false
    }
}

onMounted(() => {
    runDemo()
})
</script>
