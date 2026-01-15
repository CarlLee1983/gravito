<template>
  <Layout>
    <!-- Master Hero Section -->
    <section class="relative min-h-[90vh] flex items-center overflow-hidden bg-base transition-colors duration-500">
      <!-- Sophisticated Background Pattern -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:40px_40px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 dark:opacity-50" />
        <div class="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[800px] h-[800px] bg-brand-100/40 dark:bg-brand-900/20 rounded-full blur-[120px] opacity-60" />
        <div class="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[600px] h-[600px] bg-cyan-100/40 dark:bg-cyan-900/20 rounded-full blur-[100px] opacity-60" />
      </div>

      <div class="container-wide relative z-10 py-20">
        <div class="flex flex-col lg:flex-row items-center gap-16">
          <!-- Text Content -->
          <div class="lg:w-1/2 space-y-10 text-center lg:text-left">
            <div class="inline-flex items-center space-x-2 px-4 py-2 rounded-2xl bg-brand-50 dark:bg-brand-900/20 border-1 border-brand-100 dark:border-brand-500/20 text-brand-700 dark:text-brand-400 animate-bounce-in">
              <div class="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              <span class="text-xs font-black uppercase tracking-[0.2em]">{{ t('home.hero_tag') }}</span>
            </div>
            
            <h1 class="text-6xl lg:text-8xl font-black tracking-tighter text-gray-900 dark:text-white leading-[0.9] animate-slide-up">
              {{ t('home.hero_title_1') }} <br />
              <span class="text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-brand-600 to-cyan-500 dark:from-brand-400 dark:to-cyan-400">
                {{ t('home.hero_title_2') }}
              </span>
            </h1>
            
            <p class="text-xl text-gray-500 dark:text-slate-400 font-medium leading-relaxed max-w-xl mx-auto lg:mx-0 animate-fade-in animate-delay-300">
              {{ t('home.hero_desc') }}
            </p>
            
            <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-6 pt-4 animate-fade-in animate-delay-500">
              <Link href="/events" class="btn-primary px-10 py-5 text-lg group">
                {{ t('common.browse_events') }}
                <div class="i-carbon-arrow-right ml-3 group-hover:translate-x-2 transition-transform duration-500" />
              </Link>
              <Link href="/register" class="btn-secondary px-10 py-5 text-lg hover:bg-white dark:hover:bg-gray-800 hover:border-brand-500 hover:text-brand-600 transition-all">
                {{ t('common.register') }}
              </Link>
            </div>
            
            <!-- Statistics -->
            <div class="pt-12 grid grid-cols-3 gap-8 border-t border-gray-100 dark:border-white/5 animate-fade-in animate-delay-700">
              <div>
                <p class="text-3xl font-black text-gray-900 dark:text-white">500+</p>
                <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{{ t('home.stats_events') }}</p>
              </div>
              <div>
                <p class="text-3xl font-black text-gray-900 dark:text-white">10k+</p>
                <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{{ t('home.stats_users') }}</p>
              </div>
              <div>
                <p class="text-3xl font-black text-gray-900 dark:text-white">99.9%</p>
                <p class="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">{{ t('home.stats_uptime') }}</p>
              </div>
            </div>
          </div>

          <!-- Visual Side (3D Perspective) -->
          <div class="lg:w-1/2 relative perspective-1000">
            <div class="relative z-10 rounded-[2.5rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(79,70,229,0.3)] dark:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] rotate-y--12 rotate-x-6 hover:rotate-0 transition-all duration-1000 ease-out cursor-pointer group">
              <img 
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1200&q=90" 
                alt="Conference" 
                class="w-full object-cover aspect-[4/3] scale-110 group-hover:scale-100 transition-transform duration-1000"
              />
              <div class="absolute inset-0 bg-gradient-to-tr from-brand-600/40 to-transparent mix-blend-overlay" />
              
              <!-- Glass Badge -->
              <div class="absolute bottom-8 left-8 right-8 glass p-6 rounded-3xl flex items-center justify-between border-1 border-white/20 dark:border-white/10">
                <div class="text-left">
                  <p class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] mb-1">{{ t('home.happening_now') }}</p>
                  <p class="text-lg font-black text-gray-900 dark:text-white leading-tight">Tech Founders Summit 2026</p>
                </div>
                <div class="w-12 h-12 bg-white dark:bg-brand-600 rounded-2xl flex items-center justify-center text-brand-600 dark:text-white shadow-xl">
                  <div class="i-carbon-play-filled text-2xl" />
                </div>
              </div>
            </div>
            
            <!-- Floating Decorative Elements -->
            <div class="absolute -top-10 -right-10 w-32 h-32 bg-cyan-400/30 rounded-full blur-[60px] animate-pulse" />
            <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-400/30 rounded-full blur-[80px] animate-pulse" />
          </div>
        </div>
      </div>
    </section>

    <!-- Master Features Section -->
    <section class="py-32 bg-soft relative overflow-hidden transition-colors duration-500">
      <div class="container-wide relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
          <div class="max-w-2xl space-y-4 text-left">
            <h2 class="text-sm font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.3em]">{{ t('home.ecosystem_tag') }}</h2>
            <h3 class="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
              {{ t('home.ecosystem_title') }}
            </h3>
          </div>
          <Link href="/register" class="btn-secondary group dark:bg-gray-900 dark:border-white/5">
            {{ t('home.get_started_now') }}
            <div class="i-carbon-arrow-right ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-10 text-left">
          <!-- Feature 1 -->
          <div class="group">
            <div class="card-interactive p-10 h-full flex flex-col bg-card">
              <div class="w-16 h-16 bg-brand-50 dark:bg-brand-900/30 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-brand-600 group-hover:text-white transition-all duration-500 shadow-inner">
                <div class="i-carbon-task text-3xl" />
              </div>
              <h4 class="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{{ t('home.features.smart_forms_title') }}</h4>
              <p class="text-gray-500 dark:text-slate-400 font-medium leading-relaxed flex-1">
                {{ t('home.features.smart_forms_desc') }}
              </p>
              <div class="mt-8 flex items-center text-brand-600 dark:text-brand-400 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                {{ t('home.learn_more') }} <div class="i-carbon-chevron-right ml-1" />
              </div>
            </div>
          </div>

          <!-- Feature 2 -->
          <div class="group">
            <div class="card-interactive p-10 h-full flex flex-col bg-card">
              <div class="w-16 h-16 bg-cyan-50 dark:bg-cyan-900/30 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-cyan-500 group-hover:text-white transition-all duration-500 shadow-inner">
                <div class="i-carbon-qr-code text-3xl" />
              </div>
              <h4 class="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{{ t('home.features.qr_checkin_title') }}</h4>
              <p class="text-gray-500 dark:text-slate-400 font-medium leading-relaxed flex-1">
                {{ t('home.features.qr_checkin_desc') }}
              </p>
              <div class="mt-8 flex items-center text-cyan-600 dark:text-cyan-400 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                {{ t('home.learn_more') }} <div class="i-carbon-chevron-right ml-1" />
              </div>
            </div>
          </div>

          <!-- Feature 3 -->
          <div class="group">
            <div class="card-interactive p-10 h-full flex flex-col bg-card">
              <div class="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
                <div class="i-carbon-send text-3xl" />
              </div>
              <h4 class="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">{{ t('home.features.signal_title') }}</h4>
              <p class="text-gray-500 dark:text-slate-400 font-medium leading-relaxed flex-1">
                {{ t('home.features.signal_desc') }}
              </p>
              <div class="mt-8 flex items-center text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 transition-transform">
                {{ t('home.learn_more') }} <div class="i-carbon-chevron-right ml-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Trusted By -->
    <section class="py-24 bg-base transition-colors duration-500">
      <div class="container-wide">
        <p class="text-center text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-[0.4em] mb-12">{{ t('home.trusted_by') }}</p>
        <div class="flex flex-wrap justify-center items-center gap-12 lg:gap-24 opacity-30 dark:opacity-20 grayscale hover:opacity-100 dark:hover:opacity-60 transition-opacity duration-700">
          <div class="i-carbon-logo-github text-5xl dark:text-white" />
          <div class="i-carbon-logo-google text-5xl dark:text-white" />
          <div class="i-carbon-logo-slack text-5xl dark:text-white" />
          <div class="i-carbon-logo-discord text-5xl dark:text-white" />
          <div class="i-carbon-logo-linkedin text-5xl dark:text-white" />
        </div>
      </div>
    </section>
  </Layout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Layout from '../components/Layout.vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
</script>

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
.rotate-y--12 {
  transform: rotateY(-12deg);
}
.rotate-x-6 {
  transform: rotateX(6deg);
}
</style>