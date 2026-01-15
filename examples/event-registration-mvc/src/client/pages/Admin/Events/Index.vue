<template>
  <AdminLayout>
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 text-left transition-colors duration-500">
      <div>
        <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{{ t('admin.events.title') }}</h1>
        <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">{{ t('admin.events.subtitle') }}</p>
      </div>
      <Link href="/admin/events/create" class="btn-primary shadow-indigo-500/20 px-8 py-4 text-sm">
        <div class="i-carbon-add mr-2 text-lg" />
        {{ t('admin.events.create_new') }}
      </Link>
    </div>
    
    <div class="table-container border-none shadow-2xl dark:shadow-black/40">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="th-premium">{{ t('admin.events.fields.title') }}</th>
              <th class="th-premium">{{ t('admin.events.fields.location') }}</th>
              <th class="th-premium text-center">{{ t('admin.events.fields.status') }}</th>
              <th class="th-premium">{{ t('admin.events.fields.registration_start') }} / {{ t('admin.events.fields.registration_end') }}</th>
              <th class="th-premium text-right">{{ t('admin.common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/5">
            <tr v-for="event in events" :key="event.id" class="group">
              <td class="td-premium">
                <div class="flex items-center space-x-5">
                  <div class="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0 border-1 border-gray-100 dark:border-white/10 shadow-inner group-hover:scale-105 transition-transform duration-500">
                    <img v-if="event.image_url" :src="event.image_url" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                      <div class="i-carbon-image text-2xl" />
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900 dark:text-white leading-none group-hover:text-brand-600 transition-colors">{{ event.title }}</p>
                    <p class="text-[10px] font-bold text-gray-400 dark:text-slate-600 mt-2 uppercase tracking-tighter">NODE_ID: {{ event.id }}</p>
                  </div>
                </div>
              </td>
              <td class="td-premium text-left">
                <div class="flex items-center text-xs font-bold text-gray-500 dark:text-slate-400">
                  <div class="i-carbon-location mr-2 text-brand-500" />
                  {{ event.location }}
                </div>
              </td>
              <td class="td-premium text-center">
                <span 
                  class="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm border-1 border-white/10"
                  :class="getStatusClasses(event.status)"
                >
                  {{ t(`admin.events.status.${event.status}`) }}
                </span>
              </td>
              <td class="td-premium">
                <div class="text-[10px] font-black text-gray-400 dark:text-slate-600 space-y-1.5 uppercase">
                  <p><span class="opacity-40 mr-2">OPEN:</span> <span class="text-gray-600 dark:text-brand-300/60">{{ formatDate(event.registration_start) }}</span></p>
                  <p><span class="opacity-40 mr-2">CLOSE:</span> <span class="text-gray-600 dark:text-brand-300/60">{{ formatDate(event.registration_end) }}</span></p>
                </div>
              </td>
              <td class="td-premium text-right">
                <div class="flex justify-end items-center space-x-2">
                  <Link 
                    :href="`/admin/events/${event.id}/edit`" 
                    class="w-11 h-11 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 transition-all border-1 border-transparent hover:border-brand-100 dark:hover:border-white/5 shadow-sm"
                    :title="t('admin.common.edit')"
                  >
                    <div class="i-carbon-edit text-xl" />
                  </Link>
                  <button 
                    @click="deleteEvent(event.id)" 
                    class="w-11 h-11 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all border-1 border-transparent hover:border-red-100 dark:hover:border-white/5 shadow-sm"
                    :title="t('admin.common.delete')"
                  >
                    <div class="i-carbon-trash-can text-xl" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="events.length === 0" class="text-center py-32 bg-gray-50/50 dark:bg-black/20">
        <div class="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-calendar text-4xl" />
        </div>
        <p class="text-gray-500 dark:text-slate-500 font-black uppercase tracking-widest text-xs">{{ t('admin.common.no_records') }}</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  events: any[];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    draft: 'bg-amber-500 text-white',
    published: 'bg-indigo-600 text-white',
    cancelled: 'bg-red-600 text-white',
  };
  return classes[status] || 'bg-gray-500 text-white';
};

const deleteEvent = (id: number) => {
  if (confirm(t('admin.common.confirm_delete'))) {
    router.delete(`/admin/events/${id}`);
  }
};
</script>