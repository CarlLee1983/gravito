<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3'
import { ChevronRight, Clock, Clock3, Edit2, Github, MapPin } from 'lucide-vue-next'
import Layout from '../components/Layout.vue'

interface SidebarItem {
  title: string
  href: string
  children?: SidebarItem[]
}

interface TocItem {
  id: string
  text: string
  level: number
}

defineProps<{
  title: string
  content: string
  sidebar: SidebarItem[]
  currentPath: string
  toc: TocItem[]
}>()
</script>

<template>
  <Layout>
    <Head>
      <title>{{ title }} | Luminosity Docs</title>
    </Head>

    <div class="mx-auto w-full max-w-screen-2xl px-6 py-10 lg:flex lg:gap-14 relative z-10">
      <!-- Sidebar -->
      <aside class="hidden lg:block lg:w-72 lg:shrink-0">
        <div class="sticky top-32 space-y-12">
          <!-- Console Style Header -->
          <div class="relative group">
            <div class="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
            <div class="relative bg-black border border-white/5 rounded-2xl p-4 flex items-center gap-3">
              <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-xs font-bold uppercase tracking-widest text-gray-400 italic">
                Navigation Console_
              </span>
            </div>
          </div>

          <div v-for="section in sidebar" :key="section.title" class="relative">
            <h3 class="font-bold text-white mb-6 uppercase tracking-[0.2em] text-[11px] opacity-50 flex items-center gap-3">
              <span class="w-2 h-2 rounded-full border border-white/20 flex items-center justify-center">
                <div class="w-0.5 h-0.5 bg-current rounded-full" />
              </span>
              {{ section.title }}
            </h3>
            <ul class="space-y-1 ml-1">
              <li v-for="item in section.items" :key="item.href">
                <Link
                  :href="item.href"
                  :class="[
                    'block text-sm py-3 px-6 transition-all duration-300 relative group font-medium rounded-xl border border-transparent',
                    currentPath === item.path
                      ? 'text-emerald-400 font-bold border-white/5 bg-white/[0.03]'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                  ]"
                >
                  <div class="flex items-center gap-3">
                    <div v-if="currentPath === item.path" class="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    <span :class="currentPath === item.path ? 'translate-x-0' : 'group-hover:translate-x-1 transition-transform'">
                      {{ item.title }}
                    </span>
                  </div>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="min-w-0 flex-1">
        <div class="bg-white/5 border border-white/5 rounded-[40px] p-8 md:p-14 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
          <header class="mb-14">
            <nav class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-10">
              <a href="/" class="hover:text-white transition-colors">LUMINOSITY</a>
              <ChevronRight :size="10" class="opacity-20" />
              <span class="text-emerald-500/60">DOCS</span>
              <ChevronRight :size="10" class="opacity-20" />
              <span class="text-white/40">{{ title }}</span>
            </nav>

            <h1 class="text-5xl md:text-7xl font-black italic tracking-tighter text-white leading-[0.9] mb-6 uppercase">
              {{ title }}
            </h1>
            <div class="flex items-center gap-3">
              <div class="w-12 h-1 bg-emerald-500" />
              <div class="w-2 h-1 bg-emerald-500/30" />
              <div class="w-1 h-1 bg-emerald-500/10" />
            </div>
          </header>

          <!-- Markdown Content -->
          <div
            class="prose prose-invert prose-lg max-w-none
                   prose-headings:italic prose-headings:tracking-tighter prose-headings:font-black
                   prose-h1:text-white
                   prose-h2:text-white prose-h2:border-b prose-h2:border-white/5 prose-h2:pb-4 prose-h2:mt-16
                   prose-h3:text-white/90
                   prose-a:font-bold prose-a:text-emerald-500 hover:prose-a:text-emerald-400 transition-colors
                   prose-pre:bg-black/50 prose-pre:border prose-pre:border-white/10 prose-pre:rounded-2xl
                   prose-strong:text-white prose-strong:font-black
                   prose-hr:border-white/5"
            v-html="content"
          />

          <!-- Footer Info -->
          <div class="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div class="flex items-center gap-4 text-gray-500 text-sm">
              <Clock3 :size="16" />
              <span>Updated routinely by Gravito Intelligence</span>
            </div>
            <a href="#" class="flex items-center gap-2 text-sm text-gray-400 hover:text-emerald-400 transition-colors">
              <Github :size="16" />
              <span>Edit this page on GitHub</span>
            </a>
          </div>
        </div>
      </main>

      <!-- TOC -->
      <aside v-if="toc.length > 0" class="hidden xl:block xl:w-64 xl:shrink-0">
        <div class="sticky top-32">
          <div class="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-md">
            <div class="mb-4 text-xs font-bold uppercase tracking-[0.1em] text-white/60">
              On this page
            </div>
            <nav>
              <ul class="space-y-4">
                <li v-for="item in toc" :key="item.id" :class="[item.level === 3 ? 'pl-4' : '', 'relative']">
                  <a
                    :href="'#' + item.id"
                    class="block text-[13px] leading-relaxed text-gray-400 hover:text-emerald-400 transition-all"
                  >
                    {{ item.text }}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </aside>
    </div>
  </Layout>
</template>
