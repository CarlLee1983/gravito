<script setup lang="ts">
import { ref } from 'vue'

// 3D Tilt Logic
const cards = ref<HTMLElement[]>([])

// biome-ignore lint/correctness/noUnusedVariables: Used in template
function handleTilt(e: MouseEvent, index: number) {
  const card = cards.value[index]
  if (!card) {
    return
  }

  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const centerX = rect.width / 2
  const centerY = rect.height / 2

  const rotateX = (y - centerY) / 20
  const rotateY = (centerX - x) / 20

  card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`
}

// biome-ignore lint/correctness/noUnusedVariables: Used in template
function resetTilt(index: number) {
  const card = cards.value[index]
  if (!card) {
    return
  }
  card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`
}
</script>

<template>
  <section class="py-40 relative z-10 overflow-hidden">
    <div class="max-w-7xl mx-auto px-8 relative">
        <div class="flex flex-col items-center mb-32 text-center">
          <div class="text-primary font-mono text-[10px] font-black tracking-[0.5em] uppercase mb-6 animate-slide-in-up bg-primary/10 px-4 py-2 rounded-lg border border-primary/20 shadow-inner-glow">
            Core Architecture
          </div>
          <h2 class="text-6xl md:text-8xl font-display font-black text-white leading-[0.9] tracking-tighter">
            Designed for the <span class="text-transparent bg-clip-text bg-gradient-to-br from-white via-primary-glow to-primary pb-4">Next Frontier</span>
          </h2>
        </div>

        <!-- Bento Grid -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[350px]">
            
            <!-- Feature 1: Query Builder (Large - 8 cols) -->
            <div 
              ref="el => cards[0] = el as HTMLElement"
              @mousemove="e => handleTilt(e, 0)"
              @mouseleave="resetTilt(0)"
              class="md:col-span-8 group relative bg-atlas-surface/20 border border-white/10 p-12 rounded-[3rem] overflow-hidden transition-all duration-500 shadow-glass shadow-inner-glow hover:border-primary/40"
            >
                <div class="absolute inset-0 bg-noise-pattern opacity-[0.03] pointer-events-none"></div>
                <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-1000"></div>
                
                <div class="relative z-10 h-full flex flex-col md:flex-row gap-16">
                    <div class="flex-1 flex flex-col justify-center">
                      <div class="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-10 text-primary group-hover:shadow-neon-blue group-hover:bg-primary/20 transition-all duration-700 shadow-inner-glow">
                          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <h3 class="text-4xl font-display font-black mb-6 text-white tracking-tight">Fluent Orbit</h3>
                      <p class="text-atlas-metallic text-xl leading-relaxed max-w-sm font-medium tracking-tight">
                          Navigate your data with an expressive, chainable API designed for readability and speed.
                      </p>
                    </div>

                    <div class="flex-1 flex items-center justify-center">
                      <div class="w-full bg-atlas-void/60 backdrop-blur-2xl p-8 rounded-3xl font-mono text-sm text-gray-300 border border-white/10 shadow-2xl transform group-hover:scale-105 transition-transform duration-700 shadow-inner-glow relative overflow-hidden">
                          <div class="absolute inset-0 bg-noise-pattern opacity-[0.05]"></div>
                          <div class="flex items-center gap-2 mb-6 opacity-40">
                            <div class="w-3 h-3 rounded-full bg-red-500/50"></div>
                            <div class="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                            <div class="w-3 h-3 rounded-full bg-green-500/50"></div>
                          </div>
                          <div class="text-primary-glow font-black">await <span class="text-white">DB</span></div>
                          <div class="pl-5 mt-1">.<span class="text-atlas-cyan">table</span>(<span class="text-orange-300">'stars'</span>)</div>
                          <div class="pl-5 mt-1">.<span class="text-atlas-cyan">where</span>(<span class="text-orange-300">'mass'</span>, <span class="text-white font-bold">'>'</span>, <span class="text-primary-glow">5.0</span>)</div>
                          <div class="pl-5 mt-1">.<span class="text-atlas-cyan">get</span>()</div>
                      </div>
                    </div>
                </div>
            </div>

            <!-- Feature 2: Typesafe (Tall - 4 cols) -->
            <div 
              ref="el => cards[1] = el as HTMLElement"
              @mousemove="e => handleTilt(e, 1)"
              @mouseleave="resetTilt(1)"
              class="md:col-span-4 group relative bg-atlas-surface/20 border border-white/10 p-12 rounded-[3rem] overflow-hidden transition-all duration-500 shadow-glass shadow-inner-glow hover:border-atlas-cyan/40"
            >
                <div class="absolute inset-0 bg-gradient-to-br from-atlas-cyan/5 to-transparent"></div>
                <div class="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div class="w-16 h-16 bg-atlas-cyan/10 border border-atlas-cyan/20 rounded-2xl flex items-center justify-center mb-10 text-atlas-cyan group-hover:bg-atlas-cyan/20 transition-all duration-700 shadow-inner-glow">
                          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <h3 class="text-3xl font-display font-black mb-4 text-white tracking-tight">Typesafe</h3>
                      <p class="text-atlas-metallic text-lg leading-relaxed font-medium tracking-tight">
                          End-to-end type safety from schema definition to query results. Zero `any`.
                      </p>
                    </div>
                    
                    <div class="mt-10 p-6 bg-atlas-cyan/5 rounded-2xl border border-atlas-cyan/10 shadow-inner-glow backdrop-blur-md">
                      <div class="text-[10px] font-mono font-black text-atlas-cyan mb-3 uppercase tracking-widest">TypeScript Interface</div>
                      <div class="text-sm font-mono text-gray-400">interface <span class="text-white">Star</span> { id: <span class="text-primary-glow">number</span>; }</div>
                    </div>
                </div>
            </div>

            <!-- Feature 3: Migration (Medium - 6 cols) -->
            <div 
              ref="el => cards[2] = el as HTMLElement"
              @mousemove="e => handleTilt(e, 2)"
              @mouseleave="resetTilt(2)"
              class="md:col-span-6 group relative bg-atlas-surface/20 border border-white/10 p-12 rounded-[3rem] overflow-hidden transition-all duration-500 shadow-glass shadow-inner-glow hover:border-white/20"
            >
                <div class="relative z-10">
                    <div class="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mb-10 text-white group-hover:bg-white/10 transition-all duration-700 shadow-inner-glow">
                        <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 class="text-3xl font-display font-black mb-6 text-white tracking-tight">Schema Architect</h3>
                    <p class="text-atlas-metallic text-lg leading-relaxed mb-8 font-medium tracking-tight">
                        Design your universe structure with version-controlled migrations that keep your team in sync.
                    </p>
                    <div class="bg-atlas-void/40 backdrop-blur-md p-6 rounded-2xl border border-white/10 font-mono text-sm shadow-inner-glow">
                        <div class="text-primary-glow font-black">Schema.<span class="text-atlas-cyan">create</span>(<span class="text-orange-300">'users'</span>)</div>
                    </div>
                </div>
            </div>

            <!-- Feature 4: Performance (Medium - 6 cols) -->
            <div 
              ref="el => cards[3] = el as HTMLElement"
              @mousemove="e => handleTilt(e, 3)"
              @mouseleave="resetTilt(3)"
              class="md:col-span-6 group relative bg-atlas-surface/20 border border-white/10 p-12 rounded-[3rem] overflow-hidden transition-all duration-500 shadow-glass shadow-inner-glow hover:border-primary/40"
            >
                <div class="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-primary/5 blur-[100px] rounded-full group-hover:bg-primary/10 transition-colors duration-1000"></div>
                <div class="relative z-10 h-full flex flex-col justify-between">
                    <div>
                      <div class="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-10 text-primary group-hover:bg-primary/20 transition-all duration-700 shadow-inner-glow">
                          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                      </div>
                      <h3 class="text-3xl font-display font-black mb-6 text-white tracking-tight">Sub-Millisecond Engine</h3>
                      <p class="text-atlas-metallic text-lg leading-relaxed font-medium tracking-tight">
                          Built for speed. Atlas utilizes advanced caching to deliver data at cosmic velocities.
                      </p>
                    </div>
                    <div class="flex items-end gap-1.5 h-16 mt-10">
                      <div v-for="i in 15" :key="i" class="flex-1 bg-primary/20 rounded-t-md group-hover:bg-primary/50 transition-all duration-700 shadow-inner-glow" :style="{ height: Math.random() * 80 + 20 + '%' }"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </section>
</template>
