<template>
  <Layout>
    <div class="bg-gray-900 dark:bg-black py-24 -mt-8 mb-12 relative overflow-hidden transition-colors duration-500">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>
      <div class="container-wide relative z-10 text-left">
        <div class="inline-flex px-3 py-1 rounded-full bg-brand-500/10 border-1 border-brand-500/20 text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
          {{ t('info.docs.tag') }}
        </div>
        <h1 class="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">{{ t('info.docs.title') }}</h1>
        <p class="text-brand-300 text-lg max-w-2xl font-medium opacity-80 leading-relaxed">{{ t('info.docs.subtitle') }}</p>
      </div>
    </div>

    <div class="container-wide pb-32">
      <div class="flex flex-col lg:flex-row gap-16 text-left">
        <!-- Documentation Sidebar -->
        <aside class="lg:w-64 flex-shrink-0">
          <nav class="sticky top-32 space-y-10">
            <div v-for="group in menu" :key="group.title">
              <h4 class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-6 px-4 border-l-2 border-transparent">{{ group.title }}</h4>
              <ul class="space-y-1">
                <li v-for="item in group.items" :key="item.label">
                  <a href="#" class="block px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-300" :class="item.active ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' : 'text-gray-500 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'">
                    {{ item.label }}
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </aside>

        <!-- Main Content -->
        <div class="flex-1 max-w-3xl">
          <div class="prose dark:prose-invert prose-indigo max-w-none">
            <section class="mb-20">
              <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-8 leading-none">{{ t('info.docs.menu.intro') }}</h2>
              <p class="text-gray-600 dark:text-slate-400 text-lg leading-relaxed mb-10 font-medium">
                {{ t('info.docs.content.intro_text') }}
              </p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-8 not-prose">
                <div class="bg-card border-1 border-gray-100 dark:border-white/5 p-8 rounded-3xl group cursor-pointer hover:border-brand-500/30 transition-all shadow-sm hover:shadow-xl">
                  <div class="w-12 h-12 bg-brand-50 dark:bg-brand-950 rounded-2xl flex items-center justify-center text-brand-600 mb-6 shadow-inner transition-transform group-hover:scale-110">
                    <div class="i-carbon-rocket text-2xl" />
                  </div>
                  <h4 class="text-lg font-black text-gray-900 dark:text-white mb-2">{{ t('info.docs.content.quick_guide') }}</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-500 font-bold uppercase tracking-widest group-hover:text-brand-600 transition-colors">{{ t('info.docs.content.setup_5min') }} &rarr;</p>
                </div>
                <div class="bg-card border-1 border-gray-100 dark:border-white/5 p-8 rounded-3xl group cursor-pointer hover:border-cyan-500/30 transition-all shadow-sm hover:shadow-xl">
                  <div class="w-12 h-12 bg-cyan-50 dark:bg-cyan-950 rounded-2xl flex items-center justify-center text-cyan-600 mb-6 shadow-inner transition-transform group-hover:scale-110">
                    <div class="i-carbon-api text-2xl" />
                  </div>
                  <h4 class="text-lg font-black text-gray-900 dark:text-white mb-2">{{ t('info.docs.content.api_ref') }}</h4>
                  <p class="text-xs text-gray-500 dark:text-slate-500 font-bold uppercase tracking-widest group-hover:text-cyan-600 transition-colors">{{ t('info.docs.content.explore') }} &rarr;</p>
                </div>
              </div>
            </section>

            <section class="mb-20 border-t border-gray-100 dark:border-white/5 pt-20">
              <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-8 leading-none">{{ t('info.docs.content.core_concepts') }}</h2>
              <p class="text-gray-600 dark:text-slate-400 leading-relaxed mb-12 font-medium text-lg">
                {{ t('info.docs.content.concepts_intro') }}
              </p>
              
              <div class="space-y-12 not-prose">
                <div v-for="concept in concepts" :key="concept.title" class="flex gap-8 group">
                  <div class="w-14 h-14 rounded-2xl bg-gray-900 dark:bg-white/5 flex items-center justify-center text-white dark:text-brand-400 flex-shrink-0 shadow-xl group-hover:scale-110 transition-transform">
                    <div :class="concept.icon" class="text-2xl" />
                  </div>
                  <div>
                    <h4 class="text-xl font-black text-gray-900 dark:text-white mb-2 leading-none">{{ concept.title }}</h4>
                    <p class="text-sm text-gray-500 dark:text-slate-500 leading-relaxed font-medium">{{ concept.desc }}</p>
                  </div>
                </div>
              </div>
            </section>

            <div class="mt-24 p-10 bg-soft rounded-[3rem] border-1 border-gray-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 shadow-inner">
              <div class="text-center md:text-left">
                <p class="text-xl font-black text-gray-900 dark:text-white tracking-tight">{{ t('info.docs.content.need_help') }}</p>
                <p class="text-sm text-gray-500 dark:text-slate-500 font-medium">{{ t('info.docs.content.support_team') }}</p>
              </div>
              <Link href="/help" class="btn-primary !px-10 shadow-indigo-500/20">{{ t('info.docs.content.contact') }}</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3'
import { computed } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const menu = computed(() => [
  {
    title: t('info.docs.menu.start'),
    items: [
      { label: t('info.docs.menu.intro'), active: true },
      { label: t('info.docs.menu.install'), active: false },
      { label: t('info.docs.menu.quick'), active: false },
    ],
  },
  {
    title: t('info.docs.menu.manage'),
    items: [
      { label: t('info.docs.menu.events'), active: false },
      { label: t('info.docs.menu.sessions'), active: false },
      { label: t('info.docs.menu.forms'), active: false },
    ],
  },
  {
    title: t('info.docs.menu.integrate'),
    items: [
      { label: t('info.docs.menu.webhooks'), active: false },
      { label: t('info.docs.menu.api'), active: false },
      { label: t('info.docs.menu.auth'), active: false },
    ],
  },
])

const concepts = computed(() => [
  {
    title: t('info.docs.content.engine'),
    desc: t('info.docs.content.engine_desc'),
    icon: 'i-carbon-machine-learning',
  },
  {
    title: t('info.docs.content.schema'),
    desc: t('info.docs.content.schema_desc'),
    icon: 'i-carbon-datastore',
  },
  {
    title: t('info.docs.content.pipeline'),
    desc: t('info.docs.content.pipeline_desc'),
    icon: 'i-carbon-flow',
  },
])
</script>