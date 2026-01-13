<template>
  <Layout>
    <!-- Event Banner -->
    <div class="relative h-[50vh] md:h-[60vh] -mt-8 overflow-hidden transition-colors duration-500">
      <img
        v-if="event.image_url"
        :src="event.image_url"
        :alt="event.title"
        class="w-full h-full object-cover scale-105 animate-slow-zoom"
      />
      <div v-else class="w-full h-full bg-indigo-600 dark:bg-indigo-950 flex items-center justify-center">
        <div class="i-carbon-image text-9xl text-white opacity-10" />
      </div>
      <div class="absolute inset-0 bg-gradient-to-t from-bg-base via-bg-base/40 to-transparent" />
      
      <div class="absolute bottom-0 left-0 w-full py-16">
        <div class="container-wide">
          <div class="max-w-4xl text-left">
            <div class="inline-flex items-center px-3 py-1 rounded-full bg-brand-500 text-white text-[10px] font-black uppercase tracking-widest mb-6 shadow-xl shadow-brand-500/20">
              {{ event.status }}
            </div>
            <h1 class="text-5xl md:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-[0.9] tracking-tighter">
              {{ event.title }}
            </h1>
            <div class="flex flex-wrap items-center text-gray-600 dark:text-brand-300/80 gap-8 text-xs font-black uppercase tracking-widest">
              <div class="flex items-center">
                <div class="i-carbon-location mr-2 text-brand-500 text-lg" />
                {{ event.location }}
              </div>
              <div class="flex items-center border-l border-gray-200 dark:border-white/10 pl-8">
                <div class="i-carbon-calendar mr-2 text-brand-500 text-lg" />
                {{ formatDate(event.registration_start) }} — {{ formatDate(event.registration_end) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="container-wide py-20">
      <div class="flex flex-col lg:flex-row gap-20 items-start">
        <!-- Main Content -->
        <div class="lg:w-2/3 space-y-20 text-left">
          <section>
            <h2 class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.3em] mb-8">About this event</h2>
            <div class="prose dark:prose-invert max-w-none text-gray-600 dark:text-slate-400 text-lg leading-relaxed font-medium whitespace-pre-wrap">
              {{ event.description }}
            </div>
          </section>

          <section id="sessions">
            <h2 class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.3em] mb-8">Available Sessions</h2>
            <div class="grid gap-6">
              <div
                v-for="session in event.sessions"
                :key="session.id"
                class="bg-card rounded-3xl p-8 border border-gray-100 dark:border-white/5 hover:border-brand-500/30 dark:hover:border-brand-500/30 transition-all duration-500 flex flex-col md:flex-row md:items-center justify-between gap-8 group"
                :class="{ 'ring-2 ring-brand-500 bg-brand-50/30 dark:bg-brand-900/10 border-transparent': selectedSession?.id === session.id }"
              >
                <div class="flex-1">
                  <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight group-hover:text-brand-600 transition-colors">{{ session.title }}</h3>
                  <div class="flex items-center text-gray-500 dark:text-slate-500 text-sm font-bold uppercase tracking-widest">
                    <div class="i-carbon-time mr-2 text-brand-500" />
                    {{ formatDateTime(session.start_time) }} — {{ formatDateTime(session.end_time) }}
                  </div>
                </div>
                
                <div class="flex items-center gap-8">
                  <div class="text-right">
                    <div class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-widest mb-1">{{ t('events.seats') }}</div>
                    <div 
                      class="text-sm font-black"
                      :class="session.registered_count < session.capacity ? 'text-green-600' : 'text-amber-600'"
                    >
                      {{ t('events.seats_left', { count: session.capacity - session.registered_count }) }}
                    </div>
                  </div>

                  <button
                    v-if="user"
                    @click="selectedSession = session"
                    :disabled="!session.is_active || (session.registered_count >= session.capacity && !selectedSession)"
                    class="btn-base !px-8"
                    :class="selectedSession?.id === session.id ? 'btn-primary' : 'btn-secondary'"
                  >
                    {{ selectedSession?.id === session.id ? t('events.selected') : t('events.select_session') }}
                  </button>
                  <Link v-else href="/login" class="btn-secondary">
                    {{ t('events.login_to_register') }}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Sidebar / Registration Form -->
        <div class="lg:w-1/3 sticky top-32">
          <Transition
            enter-active-class="transition duration-500 ease-out"
            enter-from-class="transform translate-y-8 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
          >
            <div v-if="selectedSession" class="bg-card rounded-[2.5rem] shadow-2xl dark:shadow-black/50 p-10 border-1 border-gray-100 dark:border-white/5 relative overflow-hidden text-left">
              <!-- Glow Decoration -->
              <div class="absolute -top-24 -right-24 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tighter">{{ t('events.complete_registration') }}</h3>
              
              <form @submit.prevent="submitRegistration" class="space-y-8 relative z-10">
                <div class="p-5 bg-soft rounded-2xl border border-gray-100 dark:border-white/5">
                  <div class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em] mb-1">{{ t('events.your_selection') }}</div>
                  <div class="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{{ selectedSession.title }}</div>
                </div>

                <!-- Dynamic Fields -->
                <div v-for="field in event.fields" :key="field.id" class="space-y-2">
                  <label class="label-premium">
                    {{ field.label }}
                    <span v-if="field.required" class="text-red-500">*</span>
                  </label>
                  
                  <template v-if="field.type === 'text'">
                    <input v-model="form.field_values[field.id]" type="text" class="input-premium" :placeholder="t('events.enter') + ' ' + field.label" :required="field.required" />
                  </template>
                  
                  <template v-else-if="field.type === 'textarea'">
                    <textarea v-model="form.field_values[field.id]" class="input-premium min-h-32 resize-none" :required="field.required"></textarea>
                  </template>
                  
                  <template v-else-if="field.type === 'select'">
                    <div class="relative group">
                      <select v-model="form.field_values[field.id]" class="input-premium appearance-none pr-12" :required="field.required">
                        <option value="" disabled selected>{{ t('events.select_option') }}</option>
                        <option v-for="opt in parseOptions(field.options)" :key="opt" :value="opt">{{ opt }}</option>
                      </select>
                      <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                        <div class="i-carbon-chevron-down" />
                      </div>
                    </div>
                  </template>
                </div>

                <div class="space-y-2">
                  <label class="label-premium">{{ t('events.additional_notes') }}</label>
                  <textarea v-model="form.notes" class="input-premium min-h-24 resize-none" :placeholder="t('events.placeholder_notes')"></textarea>
                </div>

                <div class="pt-4">
                  <button 
                    type="submit" 
                    class="btn-primary w-full py-5 text-lg font-black shadow-2xl shadow-indigo-500/20 group"
                    :disabled="form.processing"
                  >
                    <div v-if="form.processing" class="i-carbon-progress-bar animate-spin mr-3" />
                    {{ t('events.confirm_registration') }}
                    <div class="i-carbon-arrow-right ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </form>
            </div>
            
            <div v-else class="bg-card rounded-[2.5rem] border-2 border-dashed border-gray-200 dark:border-white/10 p-16 text-center shadow-inner">
              <div class="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300 dark:text-gray-700">
                <div class="i-carbon-touch-interaction text-4xl" />
              </div>
              <p class="text-gray-500 dark:text-slate-500 font-bold uppercase tracking-widest text-xs leading-relaxed max-w-[180px] mx-auto">{{ t('events.select_to_continue') }}</p>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Link, router, usePage } from '@inertiajs/vue3';
import { PageProps } from '@inertiajs/core';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const page = usePage<PageProps>();
const user = computed(() => page.props.auth.user);

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

<style scoped>
@keyframes slow-zoom {
  from { transform: scale(1.05); }
  to { transform: scale(1); }
}
.animate-slow-zoom {
  animation: slow-zoom 20s ease-out forwards;
}
</style>