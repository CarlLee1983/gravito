<template>
  <AdminLayout>
    <div class="mb-10">
      <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Attendee Records</h1>
      <p class="text-gray-500 mt-1">View and manage all event registrations.</p>
    </div>
    
    <div class="card bg-white border-none shadow-sm overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <th class="px-6 py-4">Attendee</th>
              <th class="px-6 py-4">Event & Session</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4">Registered At</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="reg in registrations" :key="reg.id" class="hover:bg-indigo-50/30 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                    {{ reg.user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">{{ reg.user.name }}</p>
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
              <td class="px-6 py-4">
                <p class="text-xs text-gray-500 font-medium">{{ formatDate(reg.registered_at) }}</p>
              </td>
              <td class="px-6 py-4 text-right">
                <Link 
                  :href="`/admin/registrations/${reg.id}`" 
                  class="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-widest"
                >
                  <span>Details</span>
                  <div class="i-carbon-chevron-right" />
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="registrations.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
          <div class="i-carbon-user-identification" />
        </div>
        <p class="text-gray-500 font-medium">No registrations found yet.</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';

defineProps<{
  registrations: any[];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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
