<template>
  <AdminLayout>
    <div class="max-w-5xl mx-auto pb-20">
      <div class="mb-10">
        <Link href="/admin/registrations" class="inline-flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-4 group">
          <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
          {{ t('admin.common.back') }}
        </Link>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{{ t('admin.registrations.view_details') }}</h1>
            <p class="text-gray-500 mt-2 font-medium">Ref: <span class="font-mono text-indigo-600">#{{ registration.qr_code.toUpperCase() }}</span></p>
          </div>
          <div class="flex items-center space-x-3">
            <button @click="resendEmail" class="btn-secondary" :disabled="resending">
              <div v-if="resending" class="i-carbon-progress-bar animate-spin mr-2" />
              <div v-else class="i-carbon-email mr-2" />
              {{ t('admin.registrations.resend') }}
            </button>
            <div class="relative">
              <select 
                v-model="registration.status" 
                @change="updateStatus"
                class="btn-primary !py-2.5 appearance-none pr-10"
              >
                <option value="pending">{{ t('profile.registration.status.pending') }}</option>
                <option value="confirmed">{{ t('profile.registration.status.confirmed') }}</option>
                <option value="cancelled">{{ t('profile.registration.status.cancelled') }}</option>
                <option value="waitlist">{{ t('profile.registration.status.waitlist') }}</option>
                <option value="checked_in">{{ t('profile.registration.status.checked_in') }}</option>
              </select>
              <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
                <div class="i-carbon-chevron-down" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Main Info -->
        <div class="lg:col-span-2 space-y-8">
          <!-- Attendee Card -->
          <div class="card bg-white border-none shadow-sm p-8">
            <div class="flex items-center space-x-6 mb-8 pb-8 border-b border-gray-100">
              <div class="w-20 h-20 rounded-3xl bg-indigo-100 flex items-center justify-center text-indigo-600 text-2xl font-black">
                {{ registration.user.name.substring(0, 2).toUpperCase() }}
              </div>
              <div>
                <h3 class="text-2xl font-black text-gray-900 leading-none">{{ registration.user.name }}</h3>
                <p class="text-gray-500 mt-2 font-medium">{{ registration.user.email }}</p>
                <div class="flex items-center mt-4 space-x-2">
                  <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase">{{ t('admin.registrations.member_id') }}: {{ registration.user.id }}</span>
                  <span class="text-gray-300">•</span>
                  <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ t('admin.users.joined') }} {{ formatDate(registration.user.created_at) }}</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{{ t('admin.registrations.event_context') }}</h4>
                <div class="space-y-4">
                  <div>
                    <p class="text-xs font-bold text-gray-400">{{ t('admin.registrations.selected_event') }}</p>
                    <p class="text-sm font-bold text-gray-900 mt-1">{{ registration.session.event.title }}</p>
                  </div>
                  <div>
                    <p class="text-xs font-bold text-gray-400">{{ t('admin.registrations.assigned_session') }}</p>
                    <p class="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-tighter">{{ registration.session.title }}</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">{{ t('admin.registrations.timeline') }}</h4>
                <div class="space-y-4">
                  <div>
                    <p class="text-xs font-bold text-gray-400">{{ t('admin.registrations.registered_on') }}</p>
                    <p class="text-sm font-bold text-gray-900 mt-1">{{ formatDateTime(registration.registered_at) }}</p>
                  </div>
                  <div v-if="registration.checked_in_at">
                    <p class="text-xs font-bold text-gray-400">{{ t('admin.registrations.checked_in_at') }}</p>
                    <p class="text-sm font-bold text-green-600 mt-1">{{ formatDateTime(registration.checked_in_at) }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Form Values -->
          <div class="card bg-white border-none shadow-sm p-8">
            <h3 class="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-8 flex items-center">
              <div class="i-carbon-list mr-2" /> {{ t('admin.registrations.custom_fields') }}
            </h3>
            
            <div v-if="registration.values?.length" class="space-y-6">
              <div v-for="val in registration.values" :key="val.id" class="group">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{{ val.field.label }}</p>
                <p class="text-sm font-bold text-gray-900 py-3 px-4 bg-gray-50 rounded-xl group-hover:bg-indigo-50/50 transition-colors">
                  {{ val.value || t('admin.common.not_provided') }}
                </p>
              </div>
            </div>
            <div v-else class="text-center py-10 bg-gray-50 rounded-2xl border-1 border-dashed border-gray-200">
              <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">{{ t('admin.registrations.custom_fields_empty') }}</p>
            </div>
          </div>
        </div>

        <!-- Sidebar Actions -->
        <div class="space-y-8">
          <!-- Ticket Status Card -->
          <div class="card bg-white border-none shadow-sm p-8 text-center overflow-hidden relative">
            <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500" />
            <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">{{ t('admin.registrations.security_token') }}</h3>
            
            <div class="inline-block p-4 bg-white ring-1 ring-gray-100 rounded-3xl shadow-inner mb-6">
              <QrCodeDisplay :value="registration.qr_code" :downloadable="false" />
            </div>
            
            <p class="text-xs font-bold text-gray-900 uppercase tracking-widest mb-1">{{ t('admin.dashboard.status') }}: {{ t(`profile.registration.status.${registration.status}`) }}</p>
            <p class="text-[10px] text-gray-400 leading-relaxed px-4">
              {{ t('admin.registrations.qr_hint') }}
            </p>
          </div>

          <!-- Admin Notes -->
          <div class="card bg-indigo-900 text-white border-none shadow-xl shadow-indigo-900/20 p-8">
            <h3 class="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-4">{{ t('admin.registrations.notes') }}</h3>
            <p class="text-sm font-medium leading-relaxed italic text-indigo-100">
              "{{ registration.notes || t('admin.registrations.no_notes') }}"
            </p>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';
import QrCodeDisplay from '../../../components/QrCodeDisplay.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

const props = defineProps<{
  registration: any;
}>();

const resending = ref(false);

const formatDate = (date: string) => new Date(date).toLocaleDateString();
const formatDateTime = (date: string) => new Date(date).toLocaleString();

const updateStatus = (e: any) => {
  const status = e.target.value;
  router.put(`/admin/registrations/${props.registration.id}/status`, { status });
};

const resendEmail = () => {
  resending.value = true;
  router.post(`/admin/registrations/${props.registration.id}/resend`, {}, {
    onFinish: () => resending.value = false
  });
};
</script>
