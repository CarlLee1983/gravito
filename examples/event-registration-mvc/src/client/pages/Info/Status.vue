<template>
  <Layout>
    <div class="container-wide py-20 pb-32">
      <div class="max-w-4xl mx-auto">
        <!-- Status Header -->
        <div class="bg-card rounded-[2.5rem] shadow-2xl dark:shadow-black/50 p-10 mb-12 relative overflow-hidden border-1 border-gray-100 dark:border-white/5 transition-colors duration-500">
          <div class="absolute top-0 left-0 w-full h-1.5 bg-green-500" />
          
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10 text-left">
            <div class="flex items-center space-x-8">
              <div class="relative w-20 h-20 flex items-center justify-center">
                <div class="absolute inset-0 bg-green-500 rounded-[2rem] animate-ping opacity-20" />
                <div class="relative w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-green-500/40">
                  <div class="i-carbon-checkmark-filled text-3xl" />
                </div>
              </div>
              <div>
                <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-2 leading-none">{{ t('info.status.title') }}</h1>
                <p class="text-gray-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">{{ t('info.status.verified_at') }} {{ currentTime }}</p>
              </div>
            </div>
            <div class="flex flex-col md:items-end">
              <span class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-1">{{ t('info.status.uptime') }}</span>
              <span class="text-4xl font-black text-gray-900 dark:text-white leading-none">99.99%</span>
            </div>
          </div>
        </div>

        <!-- Components Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div v-for="comp in systems" :key="comp.name" class="bg-card rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all group">
            <div class="flex justify-between items-center mb-8">
              <div class="flex items-center space-x-4 text-left">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform">
                  <div :class="comp.icon" class="text-2xl" />
                </div>
                <span class="font-black text-gray-900 dark:text-white tracking-tight">{{ comp.name }}</span>
              </div>
              <div class="flex items-center">
                <span class="text-[10px] font-black text-green-600 uppercase tracking-widest mr-3">{{ t('info.status.stable') }}</span>
                <div class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
              </div>
            </div>
            <!-- Uptime Bar Mock -->
            <div class="flex gap-1.5 h-10 items-end">
              <div v-for="i in 36" :key="i" class="flex-1 rounded-full transition-all duration-500 hover:scale-y-125" :class="i === 30 ? 'h-6 bg-amber-400 opacity-60' : 'h-full bg-green-500/80 dark:bg-green-500/40'" :title="i === 30 ? 'Minor disruption detected' : '99.9% uptime'" />
            </div>
            <div class="mt-4 flex justify-between text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest">
              <span>30 Days Ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        <!-- Recent Incidents -->
        <div class="text-left">
          <h3 class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-[0.3em] mb-10 pl-2">{{ t('info.status.incident_history') }}</h3>
          
          <div class="relative pl-10 space-y-16 before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-gray-200 dark:before:bg-white/5">
            <div v-for="day in pastDays" :key="day" class="relative">
              <div class="absolute -left-10 top-1.5 w-5 h-5 rounded-full bg-base border-4 border-gray-200 dark:border-white/10" />
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-lg font-black text-gray-900 dark:text-white tracking-tight">{{ day }}</h4>
                <div class="h-px flex-1 mx-8 bg-gray-100 dark:bg-white/5" />
                <span class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest">{{ t('info.status.no_issues') }}</span>
              </div>
              <p class="text-sm font-medium text-gray-400 dark:text-slate-500">{{ t('info.status.all_systems_normal') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

const currentTime = ref(new Date().toLocaleTimeString());

const systems = computed(() => [
  { name: t('info.status.systems.core'), icon: 'i-carbon-api' },
  { name: t('info.status.systems.atlas'), icon: 'i-carbon-datastore' },
  { name: t('info.status.systems.signal'), icon: 'i-carbon-send' },
  { name: t('info.status.systems.auth'), icon: 'i-carbon-user-identification' },
  { name: t('info.status.systems.cdn'), icon: 'i-carbon-cloud-satellite' },
  { name: t('info.status.systems.portal'), icon: 'i-carbon-application' },
]);

const pastDays = [
  'March 15, 2026',
  'March 14, 2026',
  'March 13, 2026',
];

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString();
  }, 1000);
});
</script>