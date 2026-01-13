<template>
  <AdminLayout>
    <div class="max-w-5xl mx-auto pb-20">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <Link href="/admin/events" class="inline-flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-4 group">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            {{ t('admin.common.back') }}
          </Link>
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">{{ t('admin.events.edit_event') }}</h1>
          <p class="text-gray-500 mt-1 font-medium text-sm truncate max-w-md">{{ t('admin.common.edit') }}: {{ event.title }}</p>
        </div>
        
        <!-- Management Shortcuts -->
        <div class="flex items-center space-x-3 bg-white p-1.5 rounded-2xl shadow-sm border-1 border-gray-100">
          <Link :href="`/admin/events/${event.id}/sessions`" class="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black text-indigo-600 hover:bg-indigo-50 transition-all">
            <div class="i-carbon-time" />
            <span>{{ t('admin.sessions.manage') }}</span>
          </Link>
          <Link :href="`/admin/events/${event.id}/fields`" class="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black text-cyan-600 hover:bg-cyan-50 transition-all">
            <div class="i-carbon-task" />
            <span>{{ t('admin.fields.manage') }}</span>
          </Link>
          <div class="h-4 w-px bg-gray-100" />
          <Link :href="`/events/${event.id}`" target="_blank" class="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black text-gray-400 hover:text-gray-900 transition-all">
            <div class="i-carbon-launch" />
            <span>{{ t('admin.common.view') }}</span>
          </Link>
        </div>
      </div>
      
      <div class="card bg-white border-none shadow-xl shadow-indigo-900/5 p-8 relative overflow-hidden">
        <form @submit.prevent="submit" class="space-y-10">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
            <!-- Details -->
            <div class="space-y-6">
              <h3 class="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2" />
                {{ t('admin.common.details') }}
              </h3>
              
              <div>
                <label class="label-base">{{ t('admin.events.fields.title') }}</label>
                <input v-model="form.title" type="text" class="input-base" required />
              </div>
              
              <div>
                <label class="label-base">{{ t('admin.events.fields.location') }}</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <div class="i-carbon-location" />
                  </div>
                  <input v-model="form.location" type="text" class="input-base pl-11" required />
                </div>
              </div>

              <div>
                <label class="label-base">{{ t('admin.events.fields.image_url') }}</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <div class="i-carbon-image" />
                  </div>
                  <input v-model="form.image_url" type="url" class="input-base pl-11" />
                </div>
              </div>
            </div>

            <!-- Settings -->
            <div class="space-y-6">
              <h3 class="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2" />
                {{ t('admin.common.status') }}
              </h3>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="label-base text-[10px]">{{ t('admin.events.fields.registration_start') }}</label>
                  <input v-model="form.registration_start" type="datetime-local" class="input-base !py-2.5 text-sm" required />
                </div>
                <div>
                  <label class="label-base text-[10px]">{{ t('admin.events.fields.registration_end') }}</label>
                  <input v-model="form.registration_end" type="datetime-local" class="input-base !py-2.5 text-sm" required />
                </div>
              </div>

              <div>
                <label class="label-base text-[10px]">{{ t('admin.events.fields.status') }}</label>
                <div class="relative">
                  <select v-model="form.status" class="input-base appearance-none pr-10" required>
                    <option value="draft">{{ t('admin.events.status.draft') }}</option>
                    <option value="published">{{ t('admin.events.status.published') }}</option>
                    <option value="cancelled">{{ t('admin.events.status.cancelled') }}</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                    <div class="i-carbon-chevron-down" />
                  </div>
                </div>
              </div>

              <!-- Quick Info -->
              <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-2xl border-1 border-gray-100">
                <div class="flex-1 text-center border-r border-gray-200">
                  <p class="text-[10px] font-black text-gray-400 uppercase">{{ t('admin.sessions.manage') }}</p>
                  <p class="text-lg font-black text-gray-900">{{ event.sessions?.length || 0 }}</p>
                </div>
                <div class="flex-1 text-center">
                  <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ t('admin.fields.manage') }}</p>
                  <p class="text-lg font-black text-gray-900">{{ event.fields?.length || 0 }}</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="label-base">{{ t('admin.events.fields.description') }}</label>
            <textarea v-model="form.description" class="input-base min-h-[160px] resize-none" required />
          </div>
          
          <div class="pt-8 border-t border-gray-100 flex items-center justify-between">
            <Link href="/admin/events" class="btn-ghost">
              {{ t('admin.common.cancel') }}
            </Link>
            <button type="submit" class="btn-primary px-12 py-4 text-base shadow-xl" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
              <div v-else class="i-carbon-checkmark mr-3" />
              {{ t('admin.common.update') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

const props = defineProps<{
  event: any;
}>();

const processing = ref(false);
const form = reactive({
  title: props.event.title,
  description: props.event.description,
  location: props.event.location,
  image_url: props.event.image_url || '',
  status: props.event.status,
  registration_start: formatDateTimeLocal(props.event.registration_start),
  registration_end: formatDateTimeLocal(props.event.registration_end),
});

function formatDateTimeLocal(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const submit = () => {
  processing.value = true;
  router.put(`/admin/events/${props.event.id}`, form, {
    onFinish: () => processing.value = false
  });
};
</script>