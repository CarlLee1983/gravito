<template>
  <div class="relative z-10 flex-grow overflow-hidden docs-theme-wrapper" :class="themeClass">
    <!-- Fixed Reading Progress Bar -->
    <div class="fixed top-0 left-0 w-full h-[2px] z-[100] pointer-events-none overflow-hidden">
        <div 
            class="h-full bg-atlas-cyan shadow-[0_0_15px_#00f0ff] transition-all duration-200 ease-out origin-left" 
            :style="{ width: scrollProgress + '%' }"
        ></div>
    </div>

    <!-- Immersive Background Elements -->
    <div class="absolute inset-0 pointer-events-none">
        <div class="absolute top-[10%] left-[5%] w-[40rem] h-[40rem] bg-atlas-cyan/5 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-[20%] right-[5%] w-[30rem] h-[30rem] bg-purple-500/5 rounded-full blur-[120px] animate-pulse" style="animation-delay: 2s"></div>
    </div>

    <!-- Breadcrumb / Header Area -->
    <div class="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-30 transition-all duration-300">
        <div class="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
            <StaticLink to="/features" class="inline-flex items-center gap-2 text-atlas-cyan hover:text-white transition-all group text-sm font-mono tracking-tighter">
                <svg class="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span class="opacity-70 group-hover:opacity-100 uppercase letter-spacing-widest text-[10px]">Back to Station</span>
            </StaticLink>
            <div class="flex items-center gap-3">
                <div class="h-1.5 w-1.5 bg-atlas-cyan rounded-full animate-ping"></div>
                <div class="text-[10px] font-mono text-gray-500 tracking-[0.3em] uppercase hidden sm:block">
                    Node: {{ $route.params.id }}
                </div>
            </div>
        </div>
    </div>

    <div class="max-w-5xl mx-auto px-6 py-12 lg:py-20 relative">
        <!-- The Main Document Vessel -->
        <transition name="vessel" appear>
            <article 
                v-if="!loading"
                class="relative bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group"
            >
                <!-- Aesthetic accent border -->
                <div class="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-atlas-cyan/30 to-transparent"></div>
                
                <div class="px-8 py-12 lg:px-20 lg:py-20">
                    <div class="prose-atlas">
                        <div v-html="compiledMarkdown" class="markdown-body"></div>
                    </div>
                </div>

                <!-- Footer Terminal Decor -->
                <div class="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div class="flex gap-1.5">
                        <div class="w-2 h-2 rounded-full bg-red-500/20"></div>
                        <div class="w-2 h-2 rounded-full bg-yellow-500/20"></div>
                        <div class="w-2 h-2 rounded-full bg-green-500/20"></div>
                    </div>
                    <div class="text-[9px] font-mono text-gray-600 uppercase tracking-widest">End of Protocol - Secure Link Active</div>
                </div>
            </article>
        </transition>

        <!-- Loading State -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-48 gap-8">
            <div class="relative">
                <div class="w-20 h-20 border-2 border-atlas-cyan/5 rounded-full"></div>
                <div class="absolute inset-0 w-20 h-20 border-t-2 border-atlas-cyan rounded-full animate-spin"></div>
                <div class="absolute inset-4 w-12 h-12 border-b-2 border-purple-500 rounded-full animate-spin-slow"></div>
            </div>
            <div class="text-center space-y-2">
                <p class="font-mono text-[10px] tracking-[0.5em] text-atlas-cyan uppercase">Synchronizing Orbit Data</p>
                <p class="text-[8px] font-mono text-gray-600 animate-pulse uppercase">Fetching sector_{{ $route.params.id }}.bin</p>
            </div>
        </div>

        <!-- Footer link back -->
        <div class="mt-16 text-center">
             <StaticLink to="/features" class="inline-flex items-center gap-2 text-[10px] font-mono text-gray-500 hover:text-atlas-cyan transition-all uppercase tracking-[0.3em] group">
                 <span class="w-4 h-px bg-gray-500/30 group-hover:w-8 group-hover:bg-atlas-cyan transition-all"></span>
                 Terminate Access
                 <span class="w-4 h-px bg-gray-500/30 group-hover:w-8 group-hover:bg-atlas-cyan transition-all"></span>
             </StaticLink>
        </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const { locale } = useI18n()
const route = useRoute()
const content = ref('')
const loading = ref(true)
const scrollProgress = ref(0)

const _compiledMarkdown = computed(() => {
  return marked.parse(content.value)
})

const _themeClass = computed(() => {
  const id = ((route.params.id as string) || '').toLowerCase()
  if (id.includes('mongo')) {
    return 'theme-mongodb'
  }
  if (id.includes('redis')) {
    return 'theme-redis'
  }
  return ''
})

// Scroll progress handler
const handleScroll = () => {
  const winScroll = document.documentElement.scrollTop
  const height = document.documentElement.scrollHeight - document.documentElement.clientHeight
  scrollProgress.value = (winScroll / height) * 100
}

// Use glob to find all markdown files
const docs = import.meta.glob('../docs/**/*.md', { query: '?raw', import: 'default' })

async function fetchContent() {
  const docId = route.params.id as string
  loading.value = true

  // Try to find the file for current locale, fallback to 'en'
  const paths = [`../docs/${locale.value}/${docId}.md`, `../docs/en/${docId}.md`]

  let rawContent = ''
  let found = false

  for (const path of paths) {
    if (docs[path]) {
      try {
        rawContent = (await docs[path]()) as string
        found = true
        break
      } catch (e) {
        console.error(`Failed to load doc at ${path}`, e)
      }
    }
  }

  if (found) {
    content.value = rawContent
  } else {
    content.value = `# 404 - Document Not Found\n\nThe requested cosmic guide does not exist in this sector.`
  }

  loading.value = false
}

// Re-fetch when locale changes
watch(locale, () => {
  fetchContent()
})

onMounted(() => {
  fetchContent()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style>
/* Dynamic Theming Wrapper */
.docs-theme-wrapper {
    /* Default Atlas Theme (Cyan) */
    --accent-color: #00f0ff;
    --accent-dim: rgba(0, 240, 255, 0.1);
    --accent-glow: rgba(0, 240, 255, 0.5);
}

.docs-theme-wrapper.theme-mongodb {
    /* MongoDB Green */
    --accent-color: #00ED64; 
    --accent-dim: rgba(0, 237, 100, 0.1);
    --accent-glow: rgba(0, 237, 100, 0.5);
}

.docs-theme-wrapper.theme-redis {
    /* Redis Red */
    --accent-color: #FF4438;
    --accent-dim: rgba(255, 68, 56, 0.1);
    --accent-glow: rgba(255, 68, 56, 0.5);
}

/* Custom Prose-like styling for Atlas theme */
.prose-atlas h1 {
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.1;
  font-weight: 800;
  color: white;
  margin-bottom: 2.5rem;
  letter-spacing: -0.04em;
  background: linear-gradient(to bottom right, #fff, #9ca3af);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  padding-bottom: 0.5rem;
}

.prose-atlas h2 {
  font-size: 1.875rem;
  line-height: 2.25rem;
  font-weight: 700;
  color: #fff;
  margin-top: 4rem;
  margin-bottom: 1.5rem;
  letter-spacing: -0.025em;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.prose-atlas h2::before {
    content: '';
    display: block;
    width: 0.75rem;
    height: 0.75rem;
    background: var(--accent-color);
    box-shadow: 0 0 10px var(--accent-color);
    border-radius: 2px;
}

.prose-atlas p {
  font-size: 1.125rem;
  line-height: 1.8;
  color: rgba(209, 213, 219, 0.8);
  margin-bottom: 1.75rem;
}

.prose-atlas blockquote {
  border-left-width: 2px;
  border-color: var(--accent-color);
  background: linear-gradient(to right, var(--accent-dim), transparent);
  padding: 1.5rem 2rem;
  border-radius: 0.5rem;
  font-style: italic;
  color: var(--accent-color);
  margin: 2.5rem 0;
  font-size: 1.1rem;
  box-shadow: inset 2px 0 10px var(--accent-dim);
}

.prose-atlas pre {
  background-color: rgba(10, 10, 10, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.25rem;
  padding: 2.5rem 2rem 2rem;
  margin: 2.5rem 0;
  overflow-x: auto;
  position: relative;
  box-shadow: inset 0 2px 20px rgba(0,0,0,0.6);
}

/* Code block terminal mockup */
.prose-atlas pre::before {
    content: '';
    position: absolute;
    top: 1rem;
    left: 1.25rem;
    width: 0.5rem;
    height: 0.5rem;
    background: #ef4444; /* red */
    border-radius: 50%;
    box-shadow: 0.75rem 0 0 #f59e0b, 1.5rem 0 0 #10b981; /* yellow, green */
    opacity: 0.6;
}

.prose-atlas code {
  color: var(--accent-color);
  background-color: var(--accent-dim);
  padding: 0.2rem 0.4rem;
  border-radius: 0.4rem;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.9em;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.prose-atlas pre code {
  padding: 0;
  background-color: transparent;
  color: #e5e7eb;
  border: none;
}

.prose-atlas ul {
  list-style-type: none;
  margin-bottom: 2rem;
  padding-left: 0.5rem;
}

.prose-atlas li {
    position: relative;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
}

.prose-atlas li::before {
    content: '→';
    position: absolute;
    left: 0;
    color: var(--accent-color);
    opacity: 0.5;
}

.prose-atlas li strong {
  color: #fff;
  font-weight: 600;
}

/* Syntax Highlighting */
.prose-atlas .token.comment,
.prose-atlas .token.prolog,
.prose-atlas .token.doctype,
.prose-atlas .token.cdata { color: #6b7280; }
.prose-atlas .token.punctuation { color: #9ca3af; }
.prose-atlas .token.property,
.prose-atlas .token.tag,
.prose-atlas .token.boolean,
.prose-atlas .token.number,
.prose-atlas .token.constant,
.prose-atlas .token.symbol { color: #fdba74; }
.prose-atlas .token.selector,
.prose-atlas .token.attr-name,
.prose-atlas .token.string,
.prose-atlas .token.char,
.prose-atlas .token.builtin { color: #86efac; }
.prose-atlas .token.operator,
.prose-atlas .token.entity,
.prose-atlas .token.url,
.prose-atlas .token.variable { color: #93c5fd; }
.prose-atlas .token.atrule,
.prose-atlas .token.attr-value,
.prose-atlas .token.keyword { color: #c084fc; }
.prose-atlas .token.function,
.prose-atlas .token.class-name { color: #facc15; }
.prose-atlas .token.regex,
.prose-atlas .token.important { color: #f472b6; }

/* Animations */
.animate-spin-slow {
    animation: spin 8s linear infinite reverse;
}

.vessel-enter-active {
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.vessel-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
}

@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
    .prose-atlas h1 { font-size: 2.25rem; }
    .prose-atlas pre { padding: 1.25rem; }
}
</style>
