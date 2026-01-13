<template>
  <AdminLayout>
    <div class="mb-10">
      <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">System Overview</h1>
      <p class="text-gray-500 mt-1">Real-time performance and registration metrics.</p>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
      <!-- Stats Cards -->
      <div class="card bg-white border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <div class="i-carbon-calendar text-7xl" />
        </div>
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
          <div class="i-carbon-calendar mr-2" /> Active Events
        </h3>
        <p class="text-4xl font-extrabold text-gray-900">{{ stats.total_events }}</p>
        <div class="mt-4 flex items-center text-green-600 text-xs font-bold uppercase tracking-tighter">
          <div class="i-carbon-arrow-up mr-1" /> 12% increase
        </div>
      </div>
      
      <div class="card bg-white border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <div class="i-carbon-user-identification text-7xl" />
        </div>
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
          <div class="i-carbon-user-identification mr-2" /> Total Attendees
        </h3>
        <p class="text-4xl font-extrabold text-gray-900">{{ stats.total_registrations }}</p>
        <div class="mt-4 flex items-center text-green-600 text-xs font-bold uppercase tracking-tighter">
          <div class="i-carbon-arrow-up mr-1" /> 24% increase
        </div>
      </div>
      
      <div class="card bg-white border-none shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
          <div class="i-carbon-group text-7xl" />
        </div>
        <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center">
          <div class="i-carbon-group mr-2" /> Registered Users
        </h3>
        <p class="text-4xl font-extrabold text-gray-900">{{ stats.total_users }}</p>
        <div class="mt-4 flex items-center text-indigo-600 text-xs font-bold uppercase tracking-tighter">
          <div class="i-carbon-checkmark mr-1" /> Stable platform
        </div>
      </div>
    </div>
    
    <div class="card bg-white border-none shadow-sm overflow-hidden p-0">
      <div class="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h2 class="text-lg font-bold text-gray-900 leading-none">Recent Activity</h2>
          <p class="text-xs text-gray-500 mt-1">Latest attendee registrations across all events.</p>
        </div>
        <Link href="/admin/registrations" class="text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest flex items-center">
          View All <div class="i-carbon-arrow-right ml-1" />
        </Link>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Event & Session</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4 text-right">Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="reg in stats.recent_registrations" :key="reg.id" class="hover:bg-indigo-50/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                    {{ reg.user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 leading-none">{{ reg.user.name }}</p>
                    <p class="text-[10px] text-gray-400 mt-1">{{ reg.user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm font-bold text-gray-900 leading-none">{{ reg.session.event.title }}</p>
                <p class="text-[10px] text-indigo-600 mt-1 uppercase tracking-tight font-medium">{{ reg.session.title }}</p>
              </td>
              <td class="px-6 py-4 text-center">
                <span 
                  class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter"
                  :class="getStatusClasses(reg.status)"
                >
                  {{ reg.status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <p class="text-sm text-gray-500">{{ formatDate(reg.created_at) }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import AdminLayout from '../../components/AdminLayout.vue';

defineProps<{
  stats: {
    total_events: number;
    total_registrations: number;
    total_users: number;
    recent_registrations: any[];
  };
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    waitlist: 'bg-indigo-100 text-indigo-700',
    checked_in: 'bg-cyan-100 text-cyan-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};
</script>
