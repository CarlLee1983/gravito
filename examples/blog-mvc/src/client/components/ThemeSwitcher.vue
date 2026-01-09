<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '../composables/useTheme'

const { isDark, toggleTheme } = useTheme()
</script>

<template>
  <button 
    @click="toggleTheme" 
    class="p-2.5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/50 transition-all group relative overflow-hidden"
    aria-label="Toggle theme"
  >
    <div class="relative z-10">
      <Sun v-if="isDark" :size="20" class="text-yellow-400 animate-in zoom-in duration-300" />
      <Moon v-else :size="20" class="text-cyan-600 animate-in zoom-in duration-300" />
    </div>
    <div class="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
  </button>
</template>
