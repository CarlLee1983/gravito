<template>
  <AdminLayout>
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Event Management</h1>
        <p class="text-gray-500 mt-1">Create, edit and manage your scheduled events.</p>
      </div>
      <Link href="/admin/events/create" class="btn btn-primary shadow-indigo-200">
        <div class="i-carbon-add mr-2" />
        Create New Event
      </Link>
    </div>
    
    <div class="card bg-white border-none shadow-sm overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <th class="px-6 py-4">Event Details</th>
              <th class="px-6 py-4">Location</th>
              <th class="px-6 py-4 text-center">Status</th>
              <th class="px-6 py-4">Registration</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="event in events" :key="event.id" class="hover:bg-indigo-50/30 transition-colors group">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-4">
                  <div class="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border-1 border-gray-100">
                    <img v-if="event.image_url" :src="event.image_url" class="w-full h-full object-cover" />
                    <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                      <div class="i-carbon-image" />
                    </div>
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 leading-none group-hover:text-indigo-600 transition-colors">{{ event.title }}</p>
                    <p class="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">ID: {{ event.id }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center text-sm text-gray-600">
                  <div class="i-carbon-location mr-2 text-gray-400" />
                  {{ event.location }}
                </div>
              </td>
              <td class="px-6 py-4 text-center">
                <span 
                  class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter"
                  :class="getStatusClasses(event.status)"
                >
                  {{ event.status }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-[10px] font-medium text-gray-500 space-y-1">
                  <p><span class="text-gray-400 mr-1">START:</span> {{ formatDate(event.registration_start) }}</p>
                  <p><span class="text-gray-400 mr-1">END:</span> {{ formatDate(event.registration_end) }}</p>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end items-center space-x-2">
                  <Link 
                    :href="`/admin/events/${event.id}/edit`" 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    title="Edit Event"
                  >
                    <div class="i-carbon-edit" />
                  </Link>
                  <button 
                    @click="deleteEvent(event.id)" 
                    class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                    title="Delete Event"
                  >
                    <div class="i-carbon-trash-can" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="events.length === 0" class="text-center py-20">
        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
          <div class="i-carbon-calendar" />
        </div>
        <p class="text-gray-500 font-medium">No events found. Start by creating one.</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';

defineProps<{
  events: any[];
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
    draft: 'bg-amber-100 text-amber-700',
    published: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

const deleteEvent = (id: number) => {
  if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
    router.delete(`/admin/events/${id}`);
  }
};
</script>
