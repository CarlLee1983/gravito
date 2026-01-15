<template>
  <AdminLayout>
    <div class="mb-12 text-left transition-colors duration-500">
      <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{{ t('admin.registrations.title') }}</h1>
      <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">{{ t('admin.registrations.subtitle') }}</p>
    </div>
    
    <div class="table-container border-none shadow-2xl dark:shadow-black/40">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="th-premium">{{ t('admin.dashboard.identity') }}</th>
              <th class="th-premium">{{ t('admin.dashboard.target_terminal') }}</th>
              <th class="th-premium text-center">{{ t('admin.dashboard.status') }}</th>
              <th class="th-premium">{{ t('admin.dashboard.timestamp') }}</th>
              <th class="th-premium text-right">{{ t('admin.common.details') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/5">
            <tr v-for="reg in registrations" :key="reg.id" class="group">
              <td class="td-premium">
                <div class="flex items-center space-x-4">
                  <div class="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-brand-900/30 flex items-center justify-center text-indigo-600 dark:text-brand-400 font-black text-xs shadow-inner">
                    {{ reg.user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900 dark:text-white leading-none group-hover:text-brand-600 transition-colors">{{ reg.user.name }}</p>
                    <p class="text-[10px] font-bold text-gray-400 dark:text-slate-600 mt-1.5 leading-none">{{ reg.user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="td-premium">
                <p class="text-sm font-black text-gray-900 dark:text-white leading-none">{{ reg.session.event.title }}</p>
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400/60 mt-1.5 uppercase tracking-tighter font-black">{{ reg.session.title }}</p>
              </td>
              <td class="td-premium text-center">
                <span 
                  class="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm border-1 border-white/10"
                  :class="getStatusClasses(reg.status)"
                >
                  {{ t(`profile.registration.status.${reg.status}`) }}
                </span>
              </td>
              <td class="td-premium">
                <p class="text-xs font-bold text-gray-400 dark:text-slate-600">{{ formatDate(reg.registered_at) }}</p>
              </td>
              <td class="td-premium text-right">
                <Link 
                  :href="`/admin/registrations/${reg.id}`" 
                  class="inline-flex items-center space-x-2 text-[10px] font-black text-indigo-600 dark:text-brand-400 hover:text-indigo-500 uppercase tracking-[0.2em] group/link"
                >
                  <span>{{ t('admin.registrations.view_details') }}</span>
                  <div class="i-carbon-chevron-right text-lg group-hover/link:translate-x-1 transition-transform" />
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="registrations.length === 0" class="text-center py-32 bg-gray-50/50 dark:bg-black/20 transition-colors">
        <div class="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-user-identification text-4xl" />
        </div>
        <p class="text-gray-500 dark:text-slate-500 font-black uppercase tracking-widest text-xs">{{ t('admin.common.no_records') }}</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  registrations: any[];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-green-500 text-white',
    pending: 'bg-amber-500 text-white',
    cancelled: 'bg-red-500 text-white',
    waitlist: 'bg-indigo-500 text-white',
    checked_in: 'bg-cyan-500 text-white',
  };
  return classes[status] || 'bg-gray-500 text-white';
};
</script>