<template>
  <div class="relative w-full rounded-lg overflow-hidden bg-[#1e1e2e] shadow-2xl border border-white/5 font-mono text-sm leading-relaxed group">
    
    <!-- Code Header (macOS style) -->
    <div class="flex items-center justify-between px-4 py-3 bg-[#1e1e2e] border-b border-white/5">
      <div class="flex gap-2">
        <div class="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
        <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
        <div class="w-3 h-3 rounded-full bg-[#27c93f]"></div>
      </div>
      <div class="text-xs text-gray-500 font-medium">demo.ts</div>
      <div class="w-12"></div> <!-- Spacer for centering -->
    </div>

    <!-- Code Body -->
    <div class="p-6 min-h-[320px] relative">
      <!-- Line Numbers (Faked) -->
      <div class="absolute left-4 top-6 bottom-6 w-6 text-right text-gray-700 select-none text-xs flex flex-col gap-[2px]">
        <div v-for="n in 12" :key="n">{{ n }}</div>
      </div>

      <div class="pl-8">
        <!-- Static Imports -->
        <div class="text-gray-400 mb-4">
          <span class="text-[#c678dd]">import</span> { Atlas } <span class="text-[#c678dd]">from</span> <span class="text-[#98c379]">'@gravito/atlas'</span>
        </div>

        <!-- Typing Animation Area -->
        <div class="mb-4">
          <span class="text-[#c678dd]">const</span> <span class="text-[#e5c07b]">users</span> = <span class="text-[#c678dd]">await</span> <span class="text-[#e06c75]">Atlas</span>.<span class="text-[#61afef]">query</span>(<span class="text-[#98c379]">'User'</span>)
        </div>

        <div class="flex flex-col gap-1">
          <transition-group name="list">
            <div v-for="(line, idx) in activeLines" :key="idx" class="flex">
              <span class="text-gray-600 mr-2">  .</span>
              <span :class="line.color">{{ line.text }}</span>
            </div>
          </transition-group>
        </div>

        <div class="mt-1 h-5">
           <span v-if="isTyping" class="inline-block w-2 h-4 bg-[#61afef] animate-pulse"></span>
        </div>

        <!-- Result Preview (JSON) -->
        <transition name="fade">
          <div v-if="showResult" class="mt-8 p-4 bg-[#181825] rounded-lg border-l-2 border-[#61afef] text-xs">
            <div class="text-gray-500 mb-2 flex justify-between">
              <span>// Query Result (0.4ms)</span>
              <span class="text-[#98c379]">✔ OK</span>
            </div>
            <pre class="text-[#a9b1d6]"><span class="text-[#c678dd]">const</span> <span class="text-[#e5c07b]">result</span> = [
  {
    <span class="text-[#e06c75]">id</span>: <span class="text-[#d19a66]">1</span>,
    <span class="text-[#e06c75]">name</span>: <span class="text-[#98c379]">'Carl Lee'</span>,
    <span class="text-[#e06c75]">role</span>: <span class="text-[#98c379]">'admin'</span>,
    <span class="text-[#e06c75]">posts</span>: <span class="text-[#d19a66]">42</span>
  },
  <span class="text-gray-600">...</span>
]</pre>
          </div>
        </transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

type Line = { text: string; color: string }

const lines: Line[] = [
  { text: "where('isActive', true)", color: 'text-[#61afef]' },
  { text: "with('posts', (q) => q.limit(5))", color: 'text-[#61afef]' },
  { text: "orderBy('created_at', 'desc')", color: 'text-[#61afef]' },
  { text: 'limit(10)', color: 'text-[#61afef]' },
  { text: 'get()', color: 'text-[#e5c07b]' }, // Changed to execute
]

const activeLines = ref<Line[]>([])
const isTyping = ref(true)
const showResult = ref(false)

onMounted(() => {
  // Start slightly later to allow enter animation
  setTimeout(() => startAnimation(), 500)
})

async function startAnimation() {
  for (const line of lines) {
    activeLines.value.push({ ...line, text: '' })
    const lastIndex = activeLines.value.length - 1

    // Faster typing for modern feel
    const chars = line.text.split('')
    for (const char of chars) {
      if (activeLines.value[lastIndex]) {
        activeLines.value[lastIndex].text += char
      }
      // Variable speed typing
      await new Promise((r) => setTimeout(r, Math.random() * 30 + 10))
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  isTyping.value = false
  setTimeout(() => {
    showResult.value = true
  }, 300)
}
</script>

<style scoped>
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from {
  opacity: 0;
  transform: translateX(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
</style>