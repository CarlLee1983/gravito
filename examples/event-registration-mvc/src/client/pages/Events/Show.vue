<template>
  <Layout>
    <!-- Event Banner -->
    <div class="relative h-96 -mt-8 overflow-hidden">
      <img
        v-if="event.image_url"
        :src="event.image_url"
        :alt="event.title"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full bg-indigo-600 flex items-center justify-center">
        <div class="i-carbon-image text-6xl text-white opacity-20" />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
      
      <div class="absolute bottom-0 left-0 w-full py-12">
        <div class="container mx-auto px-6">
          <div class="max-w-3xl">
            <div class="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider mb-4">
              {{ event.status }}
            </div>
            <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              {{ event.title }}
            </h1>
            <div class="flex flex-wrap items-center text-indigo-100 gap-6 text-sm">
              <div class="flex items-center">
                <div class="i-carbon-location mr-2 text-indigo-400" />
                {{ event.location }}
              </div>
              <div class="flex items-center">
                <div class="i-carbon-calendar mr-2 text-indigo-400" />
                {{ formatDate(event.registration_start) }} - {{ formatDate(event.registration_end) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-6 py-12">
      <div class="flex flex-col lg:flex-row gap-12">
        <!-- Main Content -->
        <div class="lg:w-2/3 space-y-12">
          <section>
            <h2 class="text-2xl font-bold text-gray-900 mb-6">{{ t('events.about') }}</h2>
            <div class="prose max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
              {{ event.description }}
            </div>
          </section>

          <section id="sessions">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">{{ t('events.available_sessions') }}</h2>
            <div class="grid gap-4">
              <div
                v-for="session in event.sessions"
                :key="session.id"
                class="card border-none ring-1 ring-gray-100 hover:ring-indigo-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
                :class="{ 'bg-indigo-50 ring-indigo-200': selectedSession?.id === session.id }"
              >
                <div class="flex-1">
                  <h3 class="text-xl font-bold text-gray-900 mb-1">{{ session.title }}</h3>
                  <div class="flex items-center text-gray-500 text-sm">
                    <div class="i-carbon-time mr-2" />
                    {{ formatDateTime(session.start_time) }} - {{ formatDateTime(session.end_time) }}
                  </div>
                </div>
                
                <div class="flex items-center gap-6">
                  <div class="text-right">
                    <div class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{{ t('common.status') }}</div>
                    <div 
                      class="text-sm font-bold"
                      :class="session.registered_count < session.capacity ? 'text-green-600' : 'text-amber-600'"
                    >
                      {{ t('events.seats_left', { count: session.capacity - session.registered_count }) }}
                    </div>
                  </div>

                  <button
                    v-if="$page.props.auth.user"
                    @click="selectedSession = session"
                    :disabled="!session.is_active || (session.registered_count >= session.capacity && !selectedSession)"
                    class="btn"
                    :class="selectedSession?.id === session.id ? 'btn-primary' : 'btn-secondary'"
                  >
                    {{ selectedSession?.id === session.id ? t('events.selected') : t('events.select_session') }}
                  </button>
                  <Link v-else href="/login" class="btn btn-secondary">
                    {{ t('events.login_to_register') }}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Sidebar / Registration Form -->
        <div class="lg:w-1/3">
          <div class="sticky top-24">
            <div v-if="selectedSession" class="card shadow-xl border-none ring-1 ring-indigo-100 bg-white">
              <h3 class="text-xl font-bold text-gray-900 mb-6">{{ t('events.complete_registration') }}</h3>
              <form @submit.prevent="submitRegistration" class="space-y-6">
                <div class="p-4 bg-indigo-50 rounded-lg mb-6">
                  <div class="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">{{ t('events.your_selection') }}</div>
                  <div class="text-sm font-bold text-indigo-900">{{ selectedSession.title }}</div>
                </div>

                <!-- Dynamic Fields -->
                <div v-for="field in event.fields" :key="field.id">
                  <label class="label">
                    {{ field.label }}
                    <span v-if="field.required" class="text-red-500">*</span>
                  </label>
                  
                  <template v-if="field.type === 'text'">
                    <input v-model="form.field_values[field.id]" type="text" class="input" :placeholder="`Enter ${field.label.toLowerCase()}`" :required="field.required" />
                  </template>
                  
                  <template v-else-if="field.type === 'textarea'">
                    <textarea v-model="form.field_values[field.id]" class="input min-h-24" :required="field.required"></textarea>
                  </template>
                  
                  <template v-else-if="field.type === 'select'">
                    <select v-model="form.field_values[field.id]" class="input" :required="field.required">
                      <option value="" disabled selected>Select an option</option>
                      <option v-for="opt in parseOptions(field.options)" :key="opt" :value="opt">{{ opt }}</option>
                    </select>
                  </template>
                </div>

                <div>
                  <label class="label">Additional Notes</label>
                  <textarea v-model="form.notes" class="input min-h-24" placeholder="Anything else we should know?"></textarea>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-primary w-full py-4 text-lg shadow-indigo-200"
                  :disabled="form.processing"
                >
                  <div v-if="form.processing" class="i-carbon-progress-bar animate-spin mr-2" />
                  {{ t('events.confirm_registration') }}
                </button>
              </form>
            </div>
            
            <div v-else class="card bg-gray-100 border-dashed border-2 border-gray-200 text-center py-12">
              <div class="i-carbon-touch-interaction text-4xl text-gray-300 mx-auto mb-4" />
              <p class="text-gray-500 font-medium">{{ t('events.select_to_continue') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

const props = defineProps<{
  event: any;
}>();

const selectedSession = ref<any>(null);

const form = reactive({
  session_id: null,
  field_values: {} as Record<number, string>,
  notes: '',
  processing: false
});

const parseOptions = (options: string) => {
  try {
    return JSON.parse(options);
  } catch (e) {
    return [];
  }
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString(undefined, { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

const submitRegistration = () => {
  if (!selectedSession.value) return;
  
  form.processing = true;
  form.session_id = selectedSession.value.id;
  
  router.post('/registrations', form, {
    onFinish: () => form.processing = false,
    onSuccess: () => {
      selectedSession.value = null;
      form.notes = '';
      form.field_values = {};
    }
  });
};
</script>
