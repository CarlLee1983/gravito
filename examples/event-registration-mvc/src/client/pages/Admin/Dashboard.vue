<template>
  <AdminLayout>
    <div class="mb-12 text-left">
      <h1 class="text-3xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{{ t('admin.dashboard.title') }}</h1>
      <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">{{ t('admin.dashboard.subtitle') }}</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
      <!-- Stats Cards -->
      <div v-for="stat in statCards" :key="stat.label" class="bg-card rounded-[2rem] p-8 border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
          <div :class="stat.icon" class="text-[6rem]" />
        </div>
        <h3 class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-6 flex items-center">
          <div :class="stat.icon" class="mr-2 text-brand-500" /> {{ stat.label }}
        </h3>
        <p class="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">{{ stat.value }}</p>
        <div class="mt-6 flex items-center text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-widest bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded">
          <div class="i-carbon-arrow-up mr-1" /> {{ stat.trend }}
        </div>
      </div>
    </div>
    
    <div class="table-container text-left border-none shadow-2xl dark:shadow-black/40">
      <div class="p-8 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
        <div>
          <h2 class="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">{{ t('admin.dashboard.recent_activity') }}</h2>
          <p class="text-[10px] font-black text-gray-400 dark:text-slate-600 mt-2 uppercase tracking-widest">{{ t('admin.dashboard.activity_desc') }}</p>
        </div>
        <Link href="/admin/registrations" class="text-[10px] font-black text-brand-600 dark:text-brand-400 hover:text-brand-700 uppercase tracking-[0.2em] flex items-center group/link">
          {{ t('admin.dashboard.full_registry') }} <div class="i-carbon-arrow-right ml-2 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
      
      <div class="overflow-x-auto">
        <table class="table-base">
          <thead>
            <tr>
              <th class="th-premium">{{ t('admin.dashboard.identity') }}</th>
              <th class="th-premium">{{ t('admin.dashboard.target_terminal') }}</th>
              <th class="th-premium text-center">{{ t('admin.dashboard.status') }}</th>
              <th class="th-premium text-right">{{ t('admin.dashboard.timestamp') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-white/5">
            <tr v-for="reg in stats.recent_registrations" :key="reg.id" class="group">
              <td class="td-premium">
                <div class="flex items-center space-x-4">
                  <div class="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-brand-900/30 flex items-center justify-center text-indigo-600 dark:text-brand-400 font-black text-xs shadow-inner">
                    {{ reg.user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-black text-gray-900 dark:text-white leading-none group-hover:text-brand-600 transition-colors">{{ reg.user.name }}</p>
                    <p class="text-[10px] font-bold text-gray-400 dark:text-slate-600 mt-1.5">{{ reg.user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="td-premium">
                <p class="text-sm font-black text-gray-900 dark:text-white leading-none">{{ reg.session.event.title }}</p>
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400/60 mt-1.5 uppercase tracking-tighter font-black">{{ reg.session.title }}</p>
              </td>
              <td class="td-premium text-center">
                <span 
                  class="px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter shadow-sm border-1 border-white/10"
                  :class="getStatusClasses(reg.status)"
                >
                  {{ reg.status }}
                </span>
              </td>
              <td class="td-premium text-right">
                <p class="text-xs font-bold text-gray-400 dark:text-slate-600">{{ formatDate(reg.created_at) }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@inertiajs/vue3'
import AdminLayout from '../../components/AdminLayout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

const props = defineProps<{
  stats: {
    total_events: number
    total_registrations: number
    total_users: number
    recent_registrations: any[]
  }
}>()

const statCards = computed(() => [
  {
    label: t('admin.dashboard.active_events'),
    value: props.stats.total_events,
    trend: t('admin.dashboard.trend_up'),
    icon: 'i-carbon-calendar',
  },
  {
    label: t('admin.dashboard.global_attendees'),
    value: props.stats.total_registrations,
    trend: '24%',
    icon: 'i-carbon-user-identification',
  },
  {
    label: t('admin.dashboard.verified_users'),
    value: props.stats.total_users,
    trend: t('admin.dashboard.trend_stable'),
    icon: 'i-carbon-group',
  },
])

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-green-500 text-white',
    pending: 'bg-amber-500 text-white',
    cancelled: 'bg-red-500 text-white',
    waitlist: 'bg-indigo-500 text-white',
    checked_in: 'bg-cyan-500 text-white',
  }
  return classes[status] || 'bg-gray-500 text-white'
}
</script>