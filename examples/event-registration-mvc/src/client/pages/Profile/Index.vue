<template>
  <Layout>
    <div class="bg-gray-900 py-16 -mt-8 mb-12">
      <div class="container mx-auto px-6">
        <div class="flex items-center space-x-4">
          <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
            <div class="i-carbon-user-avatar text-3xl" />
          </div>
          <div>
            <h1 class="text-3xl font-bold text-white">{{ t('profile.dashboard_title') }}</h1>
            <p class="text-gray-400">{{ t('profile.dashboard_subtitle') }}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-6 pb-20">
      <div v-if="registrations.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div
          v-for="registration in registrations"
          :key="registration.id"
          class="card border-none shadow-md hover:shadow-lg transition-shadow relative overflow-hidden group"
        >
          <!-- Status Ribbon -->
          <div 
            class="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rotate-45 flex items-end justify-center pb-2 text-[10px] font-bold uppercase tracking-widest text-white"
            :class="getStatusBg(registration.status)"
          >
            {{ registration.status }}
          </div>

          <div class="flex items-start justify-between mb-6">
            <div class="space-y-1">
              <h3 class="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {{ registration.session.event.title }}
              </h3>
              <p class="text-indigo-600 font-semibold text-sm">{{ registration.session.title }}</p>
            </div>
          </div>
          
          <div class="space-y-3 mb-8">
            <div class="flex items-center text-gray-600 text-sm">
              <div class="i-carbon-calendar mr-3 text-indigo-400" />
              {{ formatDateTime(registration.session.start_time) }}
            </div>
            <div class="flex items-center text-gray-600 text-sm">
              <div class="i-carbon-location mr-3 text-indigo-400" />
              {{ registration.session.event.location }}
            </div>
            <div class="flex items-center text-gray-600 text-sm">
              <div class="i-carbon-qr-code mr-3 text-indigo-400" />
              Ref: {{ registration.qr_code.substring(0, 8).toUpperCase() }}...
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <Link
              :href="`/profile/registrations/${registration.id}`"
              class="flex-1 btn btn-primary py-3"
            >
              <div class="i-carbon-ticket mr-2" />
              {{ t('profile.view_ticket') }}
            </Link>
            
            <button
              v-if="registration.status === 'confirmed' || registration.status === 'pending'"
              @click="cancelRegistration(registration.id)"
              class="btn btn-secondary text-red-600 hover:bg-red-50 hover:border-red-100 py-3"
              title="Cancel Registration"
            >
              <div class="i-carbon-trash-can" />
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-20 card bg-white max-w-2xl mx-auto">
        <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-200">
          <div class="i-carbon-event-schedule text-4xl" />
        </div>
        <h3 class="text-2xl font-bold text-gray-900 mb-2">{{ t('profile.no_registrations') }}</h3>
        <p class="text-gray-500 mb-8">{{ t('events.subtitle') }}</p>
        <Link href="/events" class="btn btn-primary btn-lg">
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
  if (confirm('Are you sure you want to cancel this registration?')) {
    router.delete(`/registrations/${id}`);
  }
};
</script>
