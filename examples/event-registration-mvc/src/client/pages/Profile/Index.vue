<template>
  <Layout>
    <div class="bg-gray-900 dark:bg-black py-20 -mt-8 mb-12 relative overflow-hidden transition-colors duration-500 border-b dark:border-white/5">
      <div class="absolute inset-0 opacity-20">
        <div class="absolute inset-0 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] [background-size:32px_32px]" />
      </div>
      <div class="container-wide relative z-10 text-left">
        <div class="flex items-center space-x-6">
          <div class="w-20 h-20 bg-brand-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-brand-500/20">
            <div class="i-carbon-user-avatar text-4xl" />
          </div>
          <div>
            <h1 class="text-4xl font-black text-white tracking-tighter">{{ t('profile.dashboard_title') }}</h1>
            <p class="text-brand-300 font-medium opacity-80 mt-1">{{ t('profile.dashboard_subtitle') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container-wide pb-32">
      <div v-if="registrations.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          v-for="registration in registrations"
          :key="registration.id"
          class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group"
        >
          <!-- Status Ribbon -->
          <div 
            class="absolute top-0 right-0 w-36 h-36 -mr-18 -mt-18 rotate-45 flex items-end justify-center pb-3 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl"
            :class="getStatusBg(registration.status)"
          >
            {{ registration.status }}
          </div>

          <div class="flex items-start justify-between mb-8 text-left">
            <div class="space-y-2">
              <h3 class="text-2xl font-black text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors leading-tight">
                {{ registration.session.event.title }}
              </h3>
              <div class="inline-flex px-3 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 text-xs font-black uppercase tracking-widest">
                {{ registration.session.title }}
              </div>
            </div>
          </div>
          
          <div class="space-y-4 mb-10 text-left">
            <div class="flex items-center text-gray-500 dark:text-slate-400 text-sm font-bold">
              <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mr-4 text-brand-500">
                <div class="i-carbon-calendar" />
              </div>
              {{ formatDateTime(registration.session.start_time) }}
            </div>
            <div class="flex items-center text-gray-500 dark:text-slate-400 text-sm font-bold">
              <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mr-4 text-brand-500">
                <div class="i-carbon-location" />
              </div>
              {{ registration.session.event.location }}
            </div>
            <div class="flex items-center text-gray-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-widest">
              <div class="w-8 h-8 flex items-center justify-center mr-4">
                <div class="i-carbon-qr-code text-lg" />
              </div>
              {{ t('profile.ref') }} {{ registration.qr_code.substring(0, 12).toUpperCase() }}...
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <Link
              :href="`/profile/registrations/${registration.id}`"
              class="flex-1 btn-primary py-4"
            >
              <div class="i-carbon-ticket mr-2 text-xl" />
              {{ t('profile.view_ticket') }}
            </Link>
            
            <button
              v-if="registration.status === 'confirmed' || registration.status === 'pending'"
              @click="cancelRegistration(registration.id)"
              class="w-14 h-14 rounded-2xl bg-gray-50 dark:bg-white/5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all flex items-center justify-center border-1 border-transparent hover:border-red-100 dark:hover:border-red-900/30"
              :title="t('common.cancel_registration')"
            >
              <div class="i-carbon-trash-can text-xl" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-32 bg-card rounded-[3rem] border-1 border-dashed border-gray-200 dark:border-white/10 max-w-2xl mx-auto shadow-inner">
        <div class="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-event-schedule text-5xl" />
        </div>
        <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">{{ t('profile.no_registrations') }}</h3>
        <p class="text-gray-500 dark:text-slate-500 font-medium mb-10 px-8">{{ t('profile.no_registrations_desc') }}</p>
        <Link href="/events" class="btn-primary px-12 py-4">
          {{ t('common.browse_events') }}
        </Link>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  registrations: any[];
}>();

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getStatusBg = (status: string) => {
  const bg: Record<string, string> = {
    confirmed: 'bg-green-500',
    pending: 'bg-amber-500',
    cancelled: 'bg-red-500',
    waitlist: 'bg-indigo-500',
    checked_in: 'bg-cyan-500',
  };
  return bg[status] || 'bg-gray-500';
};

const cancelRegistration = (id: number) => {
  if (confirm(t('profile.confirm_cancel'))) {
    router.delete(`/registrations/${id}`);
  }
};
</script>