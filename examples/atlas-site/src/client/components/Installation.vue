<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const activeTab = ref<'bun' | 'npm' | 'yarn' | 'pnpm'>('bun')

const copied = ref(false)

const copyCommand = () => {
  const commands = {
    bun: 'bun add @gravito/atlas',
    npm: 'npm install @gravito/atlas',
    yarn: 'yarn add @gravito/atlas',
    pnpm: 'pnpm add @gravito/atlas'
  }
  navigator.clipboard.writeText(commands[activeTab.value])
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}
</script>

<template>
  <section class="py-24 relative z-10 border-t border-white/5 bg-black/40 backdrop-blur-md">
    <div class="max-w-4xl mx-auto px-8 relative">
      <!-- Decorative Background Pulse -->
      <div class="absolute -top-px left-1/2 -translate-x-1/2 w-32 h-px bg-atlas-cyan shadow-[0_0_15px_cyan]"></div>

      <div class="text-center mb-10">
        <h2 class="text-3xl font-bold mb-4 text-white tracking-tight">{{ t('installation.title') }}</h2>
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-atlas-cyan/5 text-atlas-cyan/60 border border-atlas-cyan/20 mb-4 font-mono text-[10px] tracking-widest uppercase">
             <div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan animate-pulse"></div>
             {{ t('installation.bun_optimized') }}
        </div>
        <p class="text-gray-500 max-w-2xl mx-auto text-sm font-light leading-relaxed">{{ t('installation.bun_desc') }}</p>
      </div>

      <div class="max-w-xl mx-auto">
        <!-- Tabs (Expanded for 4 managers) -->
        <div class="flex border-b border-white/5 mb-0 overflow-x-auto no-scrollbar">
          <button 
            v-for="tab in (['bun', 'npm', 'yarn', 'pnpm'] as const)"
            :key="tab"
            @click="activeTab = tab"
            :class="['px-5 py-3 text-[10px] font-bold tracking-[0.2em] uppercase transition-all relative whitespace-nowrap', activeTab === tab ? 'text-white' : 'text-gray-600 hover:text-gray-400']">
            {{ t(`installation.tabs.${tab}`) }}
            <div v-if="activeTab === tab" class="absolute bottom-0 left-0 w-full h-px bg-atlas-cyan shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
          </button>
        </div>

        <div class="bg-black/60 border border-white/5 rounded-b-xl rounded-tr-xl p-8 flex items-center justify-between shadow-2xl group hover:border-atlas-cyan/20 transition-all duration-500 relative overflow-hidden">
             <!-- Data Signal Pulse Animation -->
             <div v-if="copied" class="absolute inset-0 overflow-hidden pointer-events-none">
                 <div class="absolute inset-0 bg-atlas-cyan/5 animate-pulse-fast"></div>
                 <div class="absolute top-0 left-0 h-full w-[200%] bg-gradient-to-r from-transparent via-atlas-cyan/10 to-transparent -translate-x-full animate-scan"></div>
             </div>

             <!-- Refined Status Indicator -->
             <div class="absolute bottom-2 right-12 transition-all duration-500 pointer-events-none" 
                  :class="copied ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'">
                 <div class="flex items-center gap-2">
                     <div class="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                     <span class="text-[9px] font-mono text-green-500/80 tracking-widest uppercase">{{ t('installation.transferred') }}</span>
                 </div>
             </div>

            <div class="flex items-center gap-4 font-mono text-sm md:text-base text-gray-400 relative z-10 transition-all"
                 :class="{ 'opacity-40 blur-[1px]': copied }">
                <span class="text-atlas-cyan/40 select-none">$</span>
                <span v-if="activeTab === 'bun'">bun add <span class="text-white hover:text-atlas-cyan transition-colors">@gravito/atlas</span></span>
                <span v-else-if="activeTab === 'npm'">npm install <span class="text-white hover:text-atlas-cyan transition-colors">@gravito/atlas</span></span>
                <span v-else-if="activeTab === 'yarn'">yarn add <span class="text-white hover:text-atlas-cyan transition-colors">@gravito/atlas</span></span>
                <span v-else-if="activeTab === 'pnpm'">pnpm add <span class="text-white hover:text-atlas-cyan transition-colors">@gravito/atlas</span></span>
            </div>
            <button @click="copyCommand" class="text-gray-600 hover:text-atlas-cyan transition-all relative z-10" title="Copy to clipboard">
                <svg v-if="!copied" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                <svg v-else class="w-5 h-5 text-green-400 animate-scale-in" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            </button>
        </div>
        <p class="mt-6 text-center text-gray-600 text-[10px] font-mono tracking-wider uppercase opacity-50">{{ t('installation.requires') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.animate-scale-in {
    animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes scaleIn {
    from { transform: scale(0.5); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
}
.animate-pulse-fast {
    animation: pulseFast 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulseFast {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.3; }
}
.animate-scan {
    animation: scan 1.5s linear forwards;
}
@keyframes scan {
    from { transform: translateX(-100%); }
    to { transform: translateX(100%); }
}
</style>
