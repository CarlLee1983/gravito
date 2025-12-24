<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import StaticLink from './StaticLink.vue'
const { t } = useI18n()
</script>

<template>
  <footer class="py-16 relative z-10 border-t border-white/5 bg-[#050505] text-sm">
    <div class="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
        <!-- Brand Column -->
        <div class="flex flex-col gap-4">
            <div class="flex items-center gap-2">
                <span class="text-xl font-bold font-mono text-white">@gravito/<span class="text-atlas-cyan">atlas</span></span>
                <span class="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-gray-400 border border-white/5">v0.0.1</span>
            </div>
            <p class="text-gray-500 text-xs leading-relaxed max-w-xs">
                {{ t('hero.desc') }}
            </p>
            <div class="text-gray-600 text-[10px] font-mono mt-4">
                {{ t('footer.rights') }}
            </div>
        </div>

        <!-- Resources -->
        <div class="flex flex-col gap-4">
            <h4 class="text-white font-bold uppercase tracking-widest text-[10px]">{{ t('footer.resources') }}</h4>
            <ul class="flex flex-col gap-2 text-gray-500 text-xs font-mono">
                <li><a href="#" class="hover:text-atlas-cyan transition-colors">{{ t('footer.guide') }}</a></li>
                <li><a href="#" class="hover:text-atlas-cyan transition-colors">{{ t('footer.api') }}</a></li>
                <li><a href="#" class="hover:text-atlas-cyan transition-colors">{{ t('footer.examples') }}</a></li>
            </ul>
        </div>

        <!-- Ecosystem -->
        <div class="flex flex-col gap-4">
            <h4 class="text-white font-bold uppercase tracking-widest text-[10px]">{{ t('footer.ecosystem') }}</h4>
            <ul class="flex flex-col gap-2 text-gray-500 text-xs font-mono">
                <li><a href="https://gravito.dev" target="_blank" class="hover:text-atlas-cyan transition-colors">{{ t('footer.core') }}</a></li>
                <li><a href="#" class="hover:text-atlas-cyan transition-colors">{{ t('footer.cli') }}</a></li>
                <li><a href="#" class="hover:text-atlas-cyan transition-colors">{{ t('footer.plugins') }}</a></li>
            </ul>
        </div>

        <!-- Legal -->
        <div class="flex flex-col gap-4">
            <h4 class="text-white font-bold uppercase tracking-widest text-[10px]">{{ t('footer.legal') }}</h4>
            <ul class="flex flex-col gap-2 text-gray-500 text-xs font-mono">
               <li><StaticLink to="/docs/legal#privacy" class="hover:text-atlas-cyan transition-colors">{{ t('footer.privacy') }}</StaticLink></li>
               <li><StaticLink to="/docs/legal#terms" class="hover:text-atlas-cyan transition-colors">{{ t('footer.terms') }}</StaticLink></li>
            </ul>
        </div>
    </div>
  </footer>
</template>
