<template>
  <Layout>
    <div class="bg-brand-600 dark:bg-brand-900/50 py-24 -mt-8 mb-12 relative overflow-hidden transition-colors duration-500 border-b dark:border-white/5">
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.1),transparent_50%)]" />
      </div>
      <div class="container-wide relative z-10 text-center">
        <div class="inline-flex px-3 py-1 rounded-full bg-white/10 border-1 border-white/20 text-white text-[10px] font-black uppercase tracking-[0.2em] mb-8">
          {{ t('info.help.tag') }}
        </div>
        <h1 class="text-4xl md:text-6xl font-black text-white tracking-tighter mb-10">{{ t('info.help.title') }}</h1>
        <div class="max-w-2xl mx-auto relative group">
          <div class="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-brand-300 group-focus-within:text-brand-600">
            <div class="i-carbon-search text-2xl" />
          </div>
          <input 
            type="text" 
            class="w-full bg-white/10 dark:bg-black/20 backdrop-blur-xl border-1 border-white/20 dark:border-white/5 rounded-[2.5rem] px-16 py-6 text-white placeholder:text-white/50 focus:bg-white dark:focus:bg-[#0f172a] focus:text-gray-900 dark:focus:text-white focus:outline-none focus:ring-8 focus:ring-brand-500/10 transition-all text-lg shadow-2xl"
            :placeholder="t('info.help.search_placeholder')"
          />
        </div>
      </div>
    </div>

    <div class="container-wide pb-32">
      <!-- Quick Categories -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-10 mb-32">
        <div v-for="cat in categories" :key="cat.title" class="card-interactive p-12 bg-card border-none flex flex-col items-center text-center group">
          <div class="w-20 h-20 rounded-3xl bg-brand-50 dark:bg-white/5 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-8 shadow-inner group-hover:scale-110 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500">
            <div :class="cat.icon" class="text-4xl" />
          </div>
          <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{{ cat.title }}</h3>
          <p class="text-gray-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{{ cat.desc }}</p>
          <a href="#" class="mt-8 text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] hover:text-brand-700 transition-colors">{{ t('info.help.categories.view_docs') }} &rarr;</a>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="max-w-3xl mx-auto space-y-16">
        <h2 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter text-center mb-16 leading-none">{{ t('info.help.faq.title') }}</h2>
        
        <div class="space-y-4">
          <div v-for="(faq, i) in faqs" :key="i" class="bg-card rounded-[2rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-brand-500/30 transition-all cursor-pointer group flex items-center justify-between">
            <h4 class="font-black text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors tracking-tight">{{ faq.q }}</h4>
            <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 group-hover:bg-brand-500 group-hover:text-white transition-all">
              <div class="i-carbon-add text-xl" />
            </div>
          </div>
        </div>

        <!-- Contact CTA -->
        <div class="mt-32 p-16 bg-soft rounded-[4rem] border-1 border-gray-100 dark:border-white/5 text-center shadow-inner relative overflow-hidden">
          <!-- Background Glow -->
          <div class="absolute -bottom-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl" />
          
          <div class="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white mx-auto mb-8 shadow-2xl shadow-brand-500/40 relative z-10">
            <div class="i-carbon-chat text-4xl" />
          </div>
          <h3 class="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter relative z-10">{{ t('info.help.contact.title') }}</h3>
          <p class="text-gray-500 dark:text-slate-400 font-medium mb-10 max-w-sm mx-auto relative z-10">{{ t('info.help.contact.desc') }}</p>
          <button class="btn-primary px-12 py-5 shadow-2xl relative z-10">{{ t('info.help.contact.btn') }}</button>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const categories = computed(() => [
  {
    title: t('info.help.categories.attendee'),
    desc: t('info.help.categories.attendee_desc'),
    icon: 'i-carbon-ticket',
  },
  {
    title: t('info.help.categories.host'),
    desc: t('info.help.categories.host_desc'),
    icon: 'i-carbon-events',
  },
  {
    title: t('info.help.categories.finance'),
    desc: t('info.help.categories.finance_desc'),
    icon: 'i-carbon-receipt',
  },
])

const faqs = computed(() => [
  { q: t('info.help.faq.q1') },
  { q: t('info.help.faq.q2') },
  { q: t('info.help.faq.q3') },
  { q: t('info.help.faq.q4') },
  { q: t('info.help.faq.q5') },
])
</script>