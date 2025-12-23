<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<template>
  <footer class="py-12 relative z-10 border-t border-white/10 bg-black text-sm">
    <div class="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center opacity-60 hover:opacity-100 transition-opacity gap-4 md:gap-0">
        <div class="flex flex-col md:flex-row items-center gap-4">
            <div class="flex items-center gap-2">
                <span class="text-xl font-bold font-mono text-white">@gravito/<span class="text-atlas-cyan">atlas</span></span>
                <span class="text-xs text-gray-500 ml-2">v0.0.1</span>
            </div>
            <div class="hidden md:block w-px h-4 bg-gray-800"></div>
            <a href="https://gravito.dev" target="_blank" rel="noopener noreferrer" class="text-gray-400 hover:text-atlas-cyan transition-colors flex items-center group">
                <span class="mr-2">{{ t('footer.part_of') }}</span>
                <svg class="w-3 h-3 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
        </div>
        <div class="text-gray-500">
            {{ t('footer.rights') }}
        </div>
    </div>
  </footer>
</template>
