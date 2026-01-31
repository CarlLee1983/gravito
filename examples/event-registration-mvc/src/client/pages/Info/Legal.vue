<template>
  <Layout>
    <div class="container-wide py-24 pb-32 transition-colors duration-500">
      <div class="flex flex-col lg:flex-row gap-20 text-left">
        <!-- Content Index Sidebar -->
        <aside class="lg:w-64 flex-shrink-0">
          <div class="sticky top-32">
            <div class="inline-flex px-3 py-1 rounded-full bg-brand-500/10 dark:bg-brand-900/20 border-1 border-brand-500/20 text-brand-600 dark:text-brand-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
              {{ t('info.legal.tag') }}
            </div>
            <nav class="space-y-2">
              <Link href="/terms" class="block px-5 py-4 rounded-2xl text-sm font-black transition-all duration-300 border-1" :class="type === 'terms' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20 border-transparent' : 'text-gray-500 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-gray-100 dark:hover:border-white/5'">
                {{ t('info.legal.terms_title') }}
              </Link>
              <Link href="/privacy" class="block px-5 py-4 rounded-2xl text-sm font-black transition-all duration-300 border-1" :class="type === 'privacy' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20 border-transparent' : 'text-gray-500 dark:text-slate-500 hover:bg-white dark:hover:bg-white/5 border-transparent hover:border-gray-100 dark:hover:border-white/5'">
                {{ t('info.legal.privacy_title') }}
              </Link>
            </nav>
            
            <div class="mt-16 p-8 bg-card rounded-[2.5rem] border-1 border-gray-100 dark:border-white/5 shadow-sm">
              <p class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest mb-3">{{ t('info.legal.last_review') }}</p>
              <p class="text-base font-black text-gray-900 dark:text-white leading-none tracking-tight">March 15, 2026</p>
            </div>
          </div>
        </aside>

        <!-- Legal Content -->
        <div class="flex-1 max-w-3xl">
          <header class="mb-20">
            <h1 class="text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tighter mb-6 leading-none">
              {{ type === 'terms' ? t('info.legal.terms_title') : t('info.legal.privacy_title') }}
            </h1>
            <p class="text-gray-500 dark:text-slate-400 font-medium text-xl leading-relaxed">{{ t('info.legal.subtitle') }}</p>
          </header>

          <article class="prose prose-indigo dark:prose-invert max-w-none text-gray-600 dark:text-slate-400 text-lg leading-relaxed space-y-16 font-medium">
            <!-- Dynamic Content based on type -->
            <template v-if="type === 'terms'">
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.terms.sec1_title') }}</h2>
                <p>{{ t('info.legal.terms.sec1_text') }}</p>
              </section>
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.terms.sec2_title') }}</h2>
                <p>{{ t('info.legal.terms.sec2_text') }}</p>
              </section>
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.terms.sec3_title') }}</h2>
                <p>{{ t('info.legal.terms.sec3_text') }}</p>
              </section>
            </template>

            <template v-else>
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.privacy.sec1_title') }}</h2>
                <p>{{ t('info.legal.privacy.sec1_text') }}</p>
              </section>
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.privacy.sec2_title') }}</h2>
                <p>{{ t('info.legal.privacy.sec2_text') }}</p>
              </section>
              <section>
                <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-6">{{ t('info.legal.privacy.sec3_title') }}</h2>
                <p>{{ t('info.legal.privacy.sec3_text') }}</p>
              </section>
            </template>

            <div class="pt-20 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row justify-between items-center gap-10 not-prose">
              <p class="text-xs font-bold text-gray-400 dark:text-slate-600 italic tracking-wide">{{ t('info.legal.need_clarification') }}</p>
              <div class="flex gap-4">
                <button class="btn-secondary !py-3 text-[10px] font-black uppercase tracking-widest !px-8">{{ t('info.legal.export_pdf') }}</button>
                <Link href="/help" class="btn-primary !py-3 text-[10px] font-black uppercase tracking-widest !px-8">{{ t('info.legal.get_assistance') }}</Link>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

defineProps<{
  type: 'terms' | 'privacy'
}>()
</script>