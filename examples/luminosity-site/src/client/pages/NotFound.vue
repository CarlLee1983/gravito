<script setup lang="ts">
import { Head } from '@inertiajs/vue3';
import { StaticLink, useFreeze } from '@gravito/freeze-vue';
import Layout from '../components/Layout.vue';
import Logo from '../components/Logo.vue';
import { Home, ChevronLeft, Search } from 'lucide-vue-next';

const { locale } = useFreeze();

const t = {
  en: {
    title: '404 - Page Not Found',
    heading: 'Lost in Space',
    subheading: 'The page you\'re looking for has drifted beyond our orbit.',
    description: 'It might have been moved, deleted, or perhaps it never existed in this dimension.',
    homeButton: 'Return Home',
    docsButton: 'Browse Docs',
  },
  zh: {
    title: '404 - 頁面未找到',
    heading: '迷失於虛空',
    subheading: '您所尋找的頁面已漂流至軌道之外。',
    description: '它可能已被移動、刪除，或者根本不存在於這個維度。',
    homeButton: '返回首頁',
    docsButton: '瀏覽文件',
  }
};

const currentT = locale.value === 'zh' ? t.zh : t.en;

const goBack = () => {
  if (typeof window !== 'undefined') {
    window.history.back();
  }
};
</script>

<template>
  <Layout>
    <Head>
      <title>{{ currentT.title }} - Luminosity</title>
      <meta name="robots" content="noindex, nofollow" />
    </Head>

    <section class="min-h-screen flex items-center justify-center relative overflow-hidden">
      <!-- Background Effects -->
      <div class="absolute inset-0 z-0">
        <!-- Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-br from-void via-panel to-void"></div>
        
        <!-- Animated Grid -->
        <div class="absolute inset-0 opacity-5">
          <div class="absolute inset-0" style="background-image: linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px); background-size: 50px 50px;"></div>
        </div>
        
        <!-- Floating Orbs -->
        <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-singularity/5 rounded-full blur-3xl animate-pulse" style="animation-delay: 1s;"></div>
      </div>

      <!-- Content -->
      <div class="relative z-10 text-center px-6 max-w-2xl mx-auto">
        <!-- 404 Badge -->
        <div class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-mono tracking-widest uppercase mb-8 backdrop-blur-sm">
          <span class="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          ERROR 404
        </div>

        <!-- Logo -->
        <div class="flex justify-center mb-8 opacity-20">
          <Logo size="lg" />
        </div>

        <!-- Heading -->
        <h1 class="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-tight">
          <span class="text-white">{{ currentT.heading }}</span>
        </h1>

        <!-- Subheading -->
        <p class="text-xl md:text-2xl text-emerald-400 font-medium mb-4">
          {{ currentT.subheading }}
        </p>

        <!-- Description -->
        <p class="text-gray-500 text-lg mb-12 max-w-md mx-auto">
          {{ currentT.description }}
        </p>

        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <StaticLink 
            href="/"
            class="w-full sm:w-auto px-8 py-4 bg-emerald-500 text-void font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center gap-3"
          >
            <Home :size="20" />
            {{ currentT.homeButton }}
          </StaticLink>
          
          <StaticLink 
            href="/docs/introduction"
            class="w-full sm:w-auto px-8 py-4 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/5 transition-all backdrop-blur-sm flex items-center justify-center gap-3"
          >
            <Search :size="20" />
            {{ currentT.docsButton }}
          </StaticLink>
        </div>

        <!-- Back Link -->
        <div class="mt-12">
          <button 
            @click="goBack"
            class="text-gray-500 hover:text-emerald-400 transition-colors text-sm flex items-center gap-2 mx-auto"
          >
            <ChevronLeft :size="16" />
            {{ locale === 'zh' ? '返回上一頁' : 'Go back' }}
          </button>
        </div>
      </div>

      <!-- Decorative Elements -->
      <div class="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
        <span class="text-[10px] font-mono uppercase tracking-[0.3em] text-gray-600">LUMINOSITY</span>
        <div class="w-[1px] h-8 bg-gradient-to-b from-emerald-500/50 to-transparent"></div>
      </div>
    </section>
  </Layout>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
