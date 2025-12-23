<template>
  <div class="glass-console relative w-full lg:max-w-xl mx-auto lg:mx-0 overflow-hidden rounded-xl border border-white/10 shadow-2xl backdrop-blur-3xl bg-black/40 group">
    <!-- Console Header -->
    <div class="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/5 group-hover:bg-white/10 transition-colors">
      <div class="flex gap-1.5 items-center">
          <div class="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/40 border border-yellow-500/20"></div>
          <div class="w-2.5 h-2.5 rounded-full bg-atlas-cyan/40 border border-atlas-cyan/20 animate-pulse"></div>
          <span class="ml-2 text-[8px] font-mono text-atlas-cyan/40 tracking-widest animate-pulse">TERMINAL_ACTIVE</span>
      </div>
      <div class="text-[10px] font-mono text-gray-500 tracking-[0.2em] uppercase">{{ t('hero.demo_label') }}</div>
      <div class="flex gap-2">
         <div class="w-1 h-3 bg-white/5"></div>
         <div class="w-1 h-3 bg-white/10"></div>
      </div>
    </div>

    <!-- Console Body -->
    <div class="p-8 font-mono text-xs md:text-sm leading-[1.8] min-h-[300px] relative">
      <!-- Background HUD Elements -->
      <div class="absolute top-4 right-4 text-[40px] font-bold text-white/[0.02] select-none pointer-events-none">ATLAS_v1.5</div>
      
      <!-- Code Input -->
      <div class="mb-6 opacity-80">
        <span class="text-atlas-cyan/60 mr-2">$</span>
        <span class="text-blue-400">const</span> <span class="text-white">user</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">User</span>.<span class="text-blue-300">query</span>()
      </div>

      <div class="flex items-start">
        <span class="text-atlas-cyan mr-3 font-bold">»</span>
        <div class="flex flex-col">
          <transition-group name="list" tag="div">
            <div v-for="(line, idx) in activeLines" :key="idx" :class="line.color" class="drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
              {{ line.text }}
            </div>
          </transition-group>
          <!-- Cursor cursor -->
          <span v-if="isTyping" class="inline-block w-2.5 h-4 bg-atlas-cyan/80 animate-pulse ml-1 transform translate-y-0.5 shadow-[0_0_10px_cyan]"></span>
        </div>
      </div>

      <!-- Result Visualization -->
      <div v-if="showResult" class="mt-8 pt-6 border-t border-white/5 animate-fade-in">
        <div class="flex justify-between items-center mb-4">
            <div class="text-[10px] text-gray-600 uppercase tracking-[0.3em]">{{ t('hero.console_output') }}</div>
            <div class="text-[9px] text-green-500/50 font-mono tracking-tighter">EXEC_TIME: 0.42ms</div>
        </div>
        <div class="grid grid-cols-1 gap-2">
            <div v-for="(item, idx) in resultItems" :key="idx" 
                 class="bg-white/[0.02] border border-white/5 p-3 rounded hover:bg-white/[0.05] transition-all transform hover:scale-[1.01] flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-atlas-cyan/10 flex items-center justify-center text-atlas-cyan">
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div class="flex flex-col">
                        <span class="text-white text-[11px] font-bold">{{ item.username }}</span>
                        <span class="text-gray-500 text-[9px]">{{ item.email }}</span>
                    </div>
                </div>
                <div class="text-atlas-cyan font-mono text-[10px]">{{ item.posts_count }} POSTS</div>
            </div>
        </div>
      </div>
    </div>

    <!-- Scanline & Glitch Effect -->
    <div class="absolute inset-0 pointer-events-none bg-scanlines opacity-[0.05]"></div>
    <div class="absolute inset-0 pointer-events-none bg-gradient-to-br from-atlas-cyan/5 to-transparent"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type Line = { text: string, color: string }

const lines: Line[] = [
  { text: ".where('isActive', true)", color: "text-blue-300/90" },
  { text: ".with('posts')", color: "text-blue-300/90" },
  { text: ".orderBy('id', 'desc')", color: "text-blue-300/90" },
  { text: ".first()", color: "text-white font-bold" }
]

const activeLines = ref<Line[]>([])
const isTyping = ref(true)
const showResult = ref(false)

const resultItems = ref([
  { username: "Carl Lee", email: "carl@gravito.dev", posts_count: 42 },
  { username: "Atlas AI", email: "atlas@orbit.core", posts_count: 1337 }
])

onMounted(() => {
  startAnimation()
})

async function startAnimation() {
  await new Promise(r => setTimeout(r, 800))
  for (const line of lines) {
    activeLines.value.push({ ...line, text: '' })
    const lastIndex = activeLines.value.length - 1
    
    for (let i = 0; i < line.text.length; i++) {
      if (activeLines.value[lastIndex]) {
        activeLines.value[lastIndex].text += line.text[i]
      }
      await new Promise(r => setTimeout(r, 30))
    }
    await new Promise(r => setTimeout(r, 100))
  }
  isTyping.value = false
  setTimeout(() => {
    showResult.value = true
  }, 400)
}
</script>

<style scoped>
.glass-console {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5), inset 0 0 1px rgba(255, 255, 255, 0.1);
}

.bg-scanlines {
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06));
  background-size: 100% 2px, 3px 100%;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
