<template>
  <AdminLayout>
    <div class="max-w-4xl mx-auto pb-20">
      <div class="mb-10">
        <Link href="/admin/events" class="inline-flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-4 group">
          <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
          {{ t('admin.common.back') }}
        </Link>
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">{{ t('admin.events.create_new') }}</h1>
        <p class="text-gray-500 mt-1 font-medium text-sm">{{ t('admin.events.subtitle') }}</p>
      </div>
      
      <div class="card bg-white border-none shadow-xl shadow-indigo-900/5 p-8 relative overflow-hidden">
        <!-- Accent Decoration -->
        <div class="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <div class="i-carbon-event text-[12rem]" />
        </div>

        <form @submit.prevent="submit" class="space-y-10 relative z-10">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Basic Info -->
            <div class="space-y-6">
              <h3 class="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-indigo-600 mr-2" />
                {{ t('admin.common.details') }}
              </h3>
              
              <div>
                <label class="label-base">{{ t('admin.events.fields.title') }}</label>
                <input v-model="form.title" type="text" class="input-base" :placeholder="t('admin.events.fields.title')" required />
              </div>
              
              <div>
                <label class="label-base">{{ t('admin.events.fields.location') }}</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <div class="i-carbon-location" />
                  </div>
                  <input v-model="form.location" type="text" class="input-base pl-11" :placeholder="t('admin.events.fields.location')" required />
                </div>
              </div>

              <div>
                <label class="label-base">{{ t('admin.events.fields.image_url') }}</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                    <div class="i-carbon-image" />
                  </div>
                  <input v-model="form.image_url" type="url" class="input-base pl-11" placeholder="https://unsplash.com/..." />
                </div>
              </div>
            </div>

            <!-- Configuration -->
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

              <!-- Preview Card (Real-time hint) -->
              <div class="p-4 bg-gray-50 rounded-2xl border-1 border-gray-100 mt-2">
                <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{{ t('admin.common.attention') }}</p>
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                    <div class="i-carbon-view" />
                  </div>
                  <div class="text-[10px] leading-tight text-gray-500 font-medium">
                    {{ t('admin.events.subtitle') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label class="label-base">{{ t('admin.events.fields.description') }}</label>
            <textarea v-model="form.description" class="input-base min-h-[160px] resize-none" :placeholder="t('admin.events.fields.description')" required />
          </div>
          
          <div class="pt-8 border-t border-gray-100 flex items-center justify-between">
            <Link href="/admin/events" class="btn-ghost">
              {{ t('admin.common.cancel') }}
            </Link>
            <button type="submit" class="btn-primary px-12 py-4 text-base shadow-xl" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
              <div v-else class="i-carbon-save mr-3" />
              {{ t('admin.common.create') }}
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

const processing = ref(false);
const form = reactive({
  title: '',
  description: '',
  location: '',
  image_url: '',
  status: 'draft',
  registration_start: '',
  registration_end: '',
});

const submit = () => {
  processing.value = true;
  router.post('/admin/events', form, {
    onFinish: () => processing.value = false
  });
};
</script>