<template>
  <section class="py-20 relative z-10 border-t border-white/5 bg-black/50 backdrop-blur-sm">
    <div class="max-w-4xl mx-auto px-8 text-center">
        <h2 class="text-3xl font-bold mb-8 text-white">Initialize Gravity</h2>
        <div class="bg-atlas-abyss border border-white/10 rounded-xl p-6 flex items-center justify-between shadow-2xl max-w-xl mx-auto group hover:border-atlas-cyan/30 transition-colors">
            <div class="flex items-center gap-4 font-mono text-lg text-gray-300">
                <span class="text-atlas-cyan">$</span>
                <span>bun add <span class="text-white font-bold">@gravito/atlas</span></span>
            </div>
            <button class="text-gray-500 hover:text-white transition-colors" title="Copy to clipboard">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
        </div>
        <p class="mt-6 text-gray-500 text-sm">Requires Gravito ecosystem or standalone standard usage.</p>
    </div>
  </section>
</template>
