<template>
  <Layout>
    <div class="max-w-2xl mx-auto py-12 px-4">
      <Link href="/profile" class="inline-flex items-center text-indigo-600 hover:text-indigo-500 font-medium mb-8 group">
        <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to My Registrations
      </Link>
      
      <div class="card shadow-2xl border-none p-0 overflow-hidden">
        <!-- Ticket Header -->
        <div class="bg-indigo-600 p-8 text-white relative">
          <div class="absolute top-0 right-0 p-4 opacity-10">
            <div class="i-carbon-event text-9xl" />
          </div>
          
          <div class="relative z-10 flex justify-between items-start">
            <div class="space-y-2">
              <div class="inline-flex px-2 py-1 rounded bg-white/20 text-[10px] font-bold uppercase tracking-widest">
                Official Ticket
              </div>
              <h1 class="text-3xl font-extrabold">{{ registration.session.event.title }}</h1>
              <p class="text-indigo-100 text-lg font-medium">{{ registration.session.title }}</p>
            </div>
            <div 
              class="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              :class="getStatusClasses(registration.status)"
            >
              {{ registration.status }}
            </div>
          </div>
        </div>

        <!-- Ticket Body -->
        <div class="p-8 space-y-8 bg-white relative">
          <!-- Perforated Line Decoration -->
          <div class="absolute top-0 left-0 w-full flex justify-between -translate-y-1/2 px-4 pointer-events-none">
            <div class="w-6 h-6 rounded-full bg-gray-50 -ml-11" />
            <div class="flex-1 border-t-2 border-dashed border-indigo-100 mt-3 mx-2" />
            <div class="w-6 h-6 rounded-full bg-gray-50 -mr-11" />
          </div>

          <div class="grid grid-cols-2 gap-8">
            <div class="space-y-1">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Time</p>
              <p class="text-sm font-bold text-gray-900">{{ formatDateTime(registration.session.start_time) }}</p>
            </div>
            <div class="space-y-1 text-right">
              <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Location</p>
              <p class="text-sm font-bold text-gray-900 line-clamp-1">{{ registration.session.event.location }}</p>
            </div>
          </div>

          <!-- Info Details -->
          <div v-if="registration.values && registration.values.length > 0" class="bg-gray-50 rounded-xl p-6">
            <h3 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Attendee Details</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div v-for="value in registration.values" :key="value.id">
                <p class="text-[10px] text-gray-500 font-medium">{{ value.field.label }}</p>
                <p class="text-sm font-bold text-gray-900">{{ value.value }}</p>
              </div>
            </div>
          </div>

          <!-- QR Code Section -->
          <div v-if="registration.status === 'confirmed' || registration.status === 'checked_in'" class="text-center pt-4">
            <div class="inline-block p-4 bg-white ring-1 ring-gray-100 rounded-2xl shadow-sm mb-4">
              <QrCodeDisplay
                :value="registration.qr_code"
                :label="`QR Code for ${registration.session.event.title}`"
                :downloadable="true"
                :filename="`registration-${registration.id}.png`"
              />
            </div>
            <p class="text-sm font-bold text-gray-900 mb-1">Entry QR Code</p>
            <p class="text-xs text-gray-500 max-w-xs mx-auto">
              Please present this code to the event staff upon arrival for check-in.
            </p>
          </div>
          
          <div v-else class="text-center py-12 bg-amber-50 rounded-2xl border-1 border-amber-100">
            <div class="i-carbon-warning text-3xl text-amber-500 mx-auto mb-3" />
            <p class="text-amber-800 font-bold mb-1">Ticket Not Ready</p>
            <p class="text-amber-600 text-xs px-6">
              Your QR code will be generated once your registration status is confirmed.
            </p>
          </div>
        </div>

        <!-- Ticket Footer -->
        <div class="bg-gray-50 p-6 flex justify-between items-center border-t border-gray-100 border-dashed">
          <div class="flex items-center space-x-2 opacity-30">
            <div class="w-4 h-4 bg-indigo-600 rounded flex items-center justify-center">
              <div class="i-carbon-event text-white text-[8px]" />
            </div>
            <span class="text-[10px] font-bold text-gray-900">GRAVITO EVENTS</span>
          </div>
          <div class="text-[10px] font-mono text-gray-400">
            ID: {{ registration.qr_code }}
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import QrCodeDisplay from '../../components/QrCodeDisplay.vue';

defineProps<{
  registration: any;
}>();

const formatDateTime = (date: string) => {
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
