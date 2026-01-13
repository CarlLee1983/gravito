<template>
  <AdminLayout>
    <div class="mb-10">
      <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">User Directory</h1>
      <p class="text-gray-500 mt-1">Manage platform users and their access levels.</p>
    </div>
    
    <div class="card bg-white border-none shadow-sm overflow-hidden p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
              <th class="px-6 py-4">User</th>
              <th class="px-6 py-4">Role</th>
              <th class="px-6 py-4 text-right">Joined Date</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="user in users" :key="user.id" class="hover:bg-indigo-50/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center space-x-3">
                  <div 
                    class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs"
                    :class="user.role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'"
                  >
                    {{ user.name.substring(0, 2).toUpperCase() }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-gray-900 leading-none">{{ user.name }}</p>
                    <p class="text-[10px] text-gray-400 mt-1">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <span 
                  class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter"
                  :class="user.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'"
                >
                  {{ user.role }}
                </span>
              </td>
              <td class="px-6 py-4 text-right text-xs font-medium text-gray-500">
                {{ formatDate(user.created_at) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div v-if="users.length === 0" class="text-center py-20">
        <div class="i-carbon-group text-4xl text-gray-200 mx-auto mb-4" />
        <p class="text-gray-500 font-medium">No users found in the system.</p>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import AdminLayout from '../../../components/AdminLayout.vue';

defineProps<{
  users: any[];
}>();

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
</script>
