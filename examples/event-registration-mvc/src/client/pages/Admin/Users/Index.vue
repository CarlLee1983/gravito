<template>
  <AdminLayout>
    <div class="mb-12 text-left transition-colors duration-500">
      <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{{ t('admin.users.title') }}</h1>
      <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">{{ t('admin.users.subtitle') }}</p>
    </div>
    
    <div class="table-container border-none shadow-2xl dark:shadow-black/40">
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="th-premium">{{ t('admin.users.name') }}</th>
              <th class="th-premium">{{ t('admin.users.role') }}</th>
              <th class="th-premium text-right">{{ t('admin.users.joined') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/5">
            <tr v-for="user in users" :key="user.id" class="group transition-colors">
              <td class="td-premium">
                <div class="flex items-center space-x-4">
                  <div 
                    class="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-xs shadow-inner transition-transform group-hover:scale-110"
                    :class="user.role === 'admin' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-indigo-100 dark:bg-brand-900/30 text-indigo-600 dark:text-brand-400'"
                  >
                    {{ user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900 dark:text-white leading-none group-hover:text-brand-600 transition-colors">{{ user.name }}</p>
                    <p class="text-[10px] font-bold text-gray-400 dark:text-slate-600 mt-1.5 leading-none">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="td-premium">
                <span 
                  class="px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest shadow-sm border-1"
                  :class="user.role === 'admin' ? 'bg-red-500 text-white border-white/10' : 'bg-indigo-100 dark:bg-brand-900/20 text-indigo-700 dark:text-brand-400 border-indigo-200/50 dark:border-white/5'"
                >
                  {{ user.role }}
                </span>
              </td>
              <td class="td-premium text-right text-xs font-bold text-gray-400 dark:text-slate-600">
                {{ formatDate(user.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="users.length === 0" class="text-center py-32 bg-gray-50/50 dark:bg-black/20">
        <div class="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-group text-4xl" />
        </div>
        <p class="text-gray-500 dark:text-slate-500 font-black uppercase tracking-widest text-xs">{{ t('admin.common.no_records') }}</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '../../../components/AdminLayout.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  users: any[];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};
</script>