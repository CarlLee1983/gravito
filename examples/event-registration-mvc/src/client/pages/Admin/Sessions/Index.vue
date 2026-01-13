<template>
  <AdminLayout>
    <div class="max-w-6xl mx-auto pb-20">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <Link :href="`/admin/events/${event.id}/edit`" class="inline-flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-4 group">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            {{ t('admin.common.back') }}
          </Link>
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{{ t('admin.sessions.title') }}</h1>
          <p class="text-gray-500 mt-2 font-medium">{{ t('admin.sessions.subtitle') }} <span class="text-indigo-600 font-bold">{{ event.title }}</span></p>
        </div>
        
        <button @click="showCreateModal = true" class="btn-primary shadow-indigo-200">
          <div class="i-carbon-add mr-2" />
          {{ t('admin.sessions.create') }}
        </button>
      </div>

      <!-- Sessions Grid -->
      <div v-if="sessions.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="session in sessions" :key="session.id" class="card bg-white border-none shadow-sm hover:shadow-md transition-all group">
          <div class="flex justify-between items-start mb-6">
            <div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <div class="i-carbon-time text-2xl" />
            </div>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="editSession(session)" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
                <div class="i-carbon-edit" />
              </button>
              <button @click="deleteSession(session.id)" class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all">
                <div class="i-carbon-trash-can" />
              </button>
            </div>
          </div>

          <h3 class="text-lg font-black text-gray-900 mb-4">{{ session.title }}</h3>
          
          <div class="space-y-3 mb-8">
            <div class="flex items-center text-sm text-gray-500">
              <div class="i-carbon-calendar mr-3 text-indigo-400" />
              {{ formatDateTime(session.start_time) }}
            </div>
            <div class="flex items-center text-sm text-gray-500">
              <div class="i-carbon-time mr-3 text-indigo-400" />
              {{ formatTimeOnly(session.start_time) }} - {{ formatTimeOnly(session.end_time) }}
            </div>
          </div>

          <div class="pt-6 border-t border-gray-50 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{{ t('admin.sessions.fields.capacity') }}</span>
              <div class="flex items-center space-x-2">
                <span class="text-sm font-black text-gray-900">{{ session.registered_count }} / {{ session.capacity }}</span>
                <div class="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-indigo-600 rounded-full transition-all duration-1000"
                    :style="{ width: `${Math.min(100, (session.registered_count / session.capacity) * 100)}%` }"
                  />
                </div>
              </div>
            </div>
            <div class="flex items-center">
              <div 
                class="w-2 h-2 rounded-full mr-2"
                :class="session.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'"
              />
              <span class="text-[10px] font-black uppercase tracking-widest" :class="session.is_active ? 'text-green-600' : 'text-gray-400'">
                {{ session.is_active ? t('admin.sessions.status.active') : t('admin.sessions.status.paused') }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-24 card bg-white border-dashed border-2 border-gray-200">
        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 font-black">
          <div class="i-carbon-time text-4xl" />
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2 tracking-tight">{{ t('admin.common.no_records') }}</h3>
        <p class="text-gray-500 mb-10 max-w-xs mx-auto">{{ t('admin.sessions.subtitle') }}</p>
        <button @click="showCreateModal = true" class="btn-primary">
          <div class="i-carbon-add mr-2" />
          {{ t('admin.sessions.create_first') }}
        </button>
      </div>
    </div>

    <!-- Modern Slide-over Modal (simplified for implementation) -->
    <div v-if="showCreateModal || editingSession" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" @click="closeModal"></div>
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-slide-up">
        <div class="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-xl font-black text-gray-900 tracking-tight">
            {{ editingSession ? t('admin.sessions.edit') : t('admin.sessions.new') }}
          </h3>
          <button @click="closeModal" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-colors">
            <div class="i-carbon-close text-xl" />
          </button>
        </div>
        
        <form @submit.prevent="submit" class="p-8 space-y-6">
          <div>
            <label class="label-base">{{ t('admin.sessions.fields.title') }}</label>
            <input v-model="form.title" type="text" class="input-base" placeholder="Morning Workshop" required />
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-base text-[10px]">{{ t('admin.sessions.fields.start_time') }}</label>
              <input v-model="form.start_time" type="datetime-local" class="input-base !py-2.5 text-sm" required />
            </div>
            <div>
              <label class="label-base text-[10px]">{{ t('admin.sessions.fields.end_time') }}</label>
              <input v-model="form.end_time" type="datetime-local" class="input-base !py-2.5 text-sm" required />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label-base text-[10px]">{{ t('admin.sessions.fields.capacity') }}</label>
              <input v-model="form.capacity" type="number" class="input-base !py-2.5 text-sm" min="1" required />
            </div>
            <div class="flex items-end pb-3">
              <label class="flex items-center space-x-3 cursor-pointer group">
                <div class="relative w-10 h-6 bg-gray-200 rounded-full transition-colors group-hover:bg-gray-300" :class="{ '!bg-indigo-600': form.is_active }">
                  <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform" :class="{ 'translate-x-4': form.is_active }" />
                </div>
                <input type="checkbox" v-model="form.is_active" class="hidden" />
                <span class="text-xs font-black text-gray-500 uppercase tracking-widest">{{ t('admin.sessions.fields.is_active') }}</span>
              </label>
            </div>
          </div>

          <div class="pt-6 flex gap-4">
            <button type="submit" class="flex-1 btn-primary py-4" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-2" />
              {{ editingSession ? t('admin.common.save') : t('admin.common.confirm') }}
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
  sessions: any[];
}>();

const showCreateModal = ref(false);
const editingSession = ref<any>(null);
const processing = ref(false);

const form = reactive({
  title: '',
  start_time: '',
  end_time: '',
  capacity: 100,
  is_active: true,
});

const formatDateTime = (date: string) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const formatTimeOnly = (date: string) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const editSession = (session: any) => {
  editingSession.value = session;
  form.title = session.title;
  form.start_time = formatDateTimeLocal(session.start_time);
  form.end_time = formatDateTimeLocal(session.end_time);
  form.capacity = session.capacity;
  form.is_active = session.is_active;
};

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

const closeModal = () => {
  showCreateModal.value = false;
  editingSession.value = null;
  form.title = '';
  form.start_time = '';
  form.end_time = '';
  form.capacity = 100;
  form.is_active = true;
};

const submit = () => {
  processing.value = true;
  const url = editingSession.value 
    ? `/admin/sessions/${editingSession.value.id}` 
    : `/admin/events/${props.event.id}/sessions`;
  
  const method = editingSession.value ? 'put' : 'post';
  
  router[method](url, form, {
    onFinish: () => {
      processing.value = false;
      closeModal();
    }
  });
};

const deleteSession = (id: number) => {
  if (confirm(t('admin.common.confirm_delete'))) {
    router.delete(`/admin/sessions/${id}`);
  }
};
</script>
