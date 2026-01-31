<template>
  <AdminLayout>
    <div class="max-w-6xl mx-auto pb-32 transition-colors duration-500 text-left">
      <!-- Premium Breadcrumb Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <Link :href="`/admin/events/${event.id}/edit`" class="inline-flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition-all uppercase tracking-[0.2em] mb-6 group">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            Control Plane / Segment Registry
          </Link>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">Operational Sessions</h1>
          <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">Define ingestion slots for <span class="text-brand-600 dark:text-brand-400 font-bold">#{{ event.title }}</span></p>
        </div>
        
        <button @click="showCreateModal = true" class="btn-primary shadow-indigo-500/20 px-8 py-4">
          <div class="i-carbon-add mr-2 text-xl" />
          Initialize New Slot
        </button>
      </div>

      <!-- Sessions Matrix -->
      <div v-if="sessions.length" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <div v-for="session in sessions" :key="session.id" class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 group relative overflow-hidden">
          <!-- Subtle Accent Glow -->
          <div class="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          
          <div class="flex justify-between items-start mb-8">
            <div class="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-brand-950 flex items-center justify-center text-indigo-600 dark:text-brand-400 shadow-inner">
              <div class="i-carbon-time text-3xl" />
            </div>
            <div class="flex space-x-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
              <button @click="editSession(session)" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-brand-50 dark:hover:bg-white/10 hover:text-brand-600 transition-all">
                <div class="i-carbon-edit text-xl" />
              </button>
              <button @click="deleteSession(session.id)" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-all">
                <div class="i-carbon-trash-can text-xl" />
              </button>
            </div>
          </div>

          <h3 class="text-xl font-black text-gray-900 dark:text-white mb-6 leading-tight tracking-tight">{{ session.title }}</h3>
          
          <div class="space-y-4 mb-10">
            <div class="flex items-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
              <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mr-4 text-brand-500">
                <div class="i-carbon-calendar" />
              </div>
              {{ formatDateTime(session.start_time) }}
            </div>
            <div class="flex items-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
              <div class="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center mr-4 text-brand-500">
                <div class="i-carbon-time" />
              </div>
              {{ formatTimeOnly(session.start_time) }} — {{ formatTimeOnly(session.end_time) }}
            </div>
          </div>

          <div class="pt-8 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <div class="flex-1 mr-6">
              <div class="flex justify-between text-[9px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-2">
                <span>Ingestion Load</span>
                <span>{{ Math.round((session.registered_count / session.capacity) * 100) }}%</span>
              </div>
              <div class="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-indigo-600 dark:bg-brand-500 rounded-full shadow-[0_0_10px_rgba(124,58,237,0.5)] transition-all duration-1000"
                  :style="{ width: `${Math.min(100, (session.registered_count / session.capacity) * 100)}%` }"
                />
              </div>
            </div>
            <div 
              class="w-3 h-3 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.4)]"
              :class="session.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-800 shadow-none'"
              :title="session.is_active ? 'Active' : 'Offline'"
            />
          </div>
        </div>
      </div>

      <!-- Professional Empty State -->
      <div v-else class="text-center py-32 bg-card rounded-[4rem] border-2 border-dashed border-gray-200 dark:border-white/10 shadow-inner">
        <div class="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-time text-5xl" />
        </div>
        <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No sessions initialized</h3>
        <p class="text-gray-500 dark:text-slate-500 font-medium mb-12 max-w-sm mx-auto">Establish operational time segments to begin participant ingestion for this node.</p>
        <button @click="showCreateModal = true" class="btn-primary px-12 py-4">
          <div class="i-carbon-add mr-2" />
          Initialize First Segment
        </button>
      </div>
    </div>

    <!-- Executive Modal System -->
    <div v-if="showCreateModal || editingSession" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div class="absolute inset-0 bg-gray-900/80 backdrop-blur-md animate-fade-in" @click="closeModal"></div>
      <div class="bg-card rounded-[3rem] shadow-2xl w-full max-w-xl relative z-10 overflow-hidden animate-slide-up border-1 border-white/10">
        <div class="p-10 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
          <div>
            <h3 class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              {{ editingSession ? 'Update Segment' : 'Initialize Segment' }}
            </h3>
            <p class="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">Operational Parameter Configuration</p>
          </div>
          <button @click="closeModal" class="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white dark:hover:bg-white/10 transition-colors">
            <div class="i-carbon-close text-2xl" />
          </button>
        </div>
        
        <form @submit.prevent="submit" class="p-10 space-y-8 text-left max-h-[75vh] overflow-y-auto">
          <div class="space-y-2">
            <label class="label-premium text-[9px]">Segment Label</label>
            <input v-model="form.title" type="text" class="input-premium" placeholder="e.g. Masterclass Segment A" required />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Opening Epoch Card -->
            <div class="date-card">
              <input v-model="form.start_time" type="datetime-local" class="date-native-input" required />
              <div class="date-icon-box">
                <div class="i-carbon-event-schedule text-xl" />
              </div>
              <div class="flex-1 text-left">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Opening Epoch</p>
                <p class="text-xs font-black text-gray-900 dark:text-white font-mono">
                  {{ form.start_time ? formatDisplayDate(form.start_time) : 'Not Scheduled' }}
                </p>
              </div>
            </div>

            <!-- Closing Epoch Card -->
            <div class="date-card">
              <input v-model="form.end_time" type="datetime-local" class="date-native-input" required />
              <div class="date-icon-box">
                <div class="i-carbon-alarm-confirm text-xl" />
              </div>
              <div class="flex-1 text-left">
                <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Closing Epoch</p>
                <p class="text-xs font-black text-gray-900 dark:text-white font-mono">
                  {{ form.end_time ? formatDisplayDate(form.end_time) : 'Not Scheduled' }}
                </p>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-8">
            <div class="space-y-2">
              <label class="label-premium text-[9px]">Ingestion Ceiling (Max Seats)</label>
              <input v-model="form.capacity" type="number" class="input-premium !py-3 font-mono" min="1" required />
            </div>
            <div class="flex items-end pb-2">
              <label class="flex items-center space-x-4 cursor-pointer group bg-soft px-6 py-3.5 rounded-2xl border border-gray-100 dark:border-white/5 w-full">
                <div class="relative w-12 h-7 bg-gray-200 dark:bg-gray-800 rounded-full transition-all group-hover:ring-4 ring-indigo-500/10" :class="{ '!bg-indigo-600': form.is_active }">
                  <div class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm" :class="{ 'translate-x-5': form.is_active }" />
                </div>
                <input type="checkbox" v-model="form.is_active" class="hidden" />
                <span class="text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest">Live Node</span>
              </label>
            </div>
          </div>

          <div class="pt-8 border-t border-gray-100 dark:border-white/5 flex gap-4">
            <button type="button" @click="closeModal" class="btn-secondary !py-4 flex-1">Abort</button>
            <button type="submit" class="btn-primary !py-4 flex-[2]" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
              <div v-else class="i-carbon-save mr-3" />
              Commit Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { reactive, ref } from 'vue'

const props = defineProps<{
  event: any
  sessions: any[]
}>()

const showCreateModal = ref(false)
const editingSession = ref<any>(null)
const processing = ref(false)

const form = reactive({
  title: '',
  start_time: '',
  end_time: '',
  capacity: 100,
  is_active: true,
})

const formatDateTime = (date: string) =>
  new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
const formatTimeOnly = (date: string) =>
  new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const editSession = (session: any) => {
  editingSession.value = session
  form.title = session.title
  form.start_time = formatDateTimeLocal(session.start_time)
  form.end_time = formatDateTimeLocal(session.end_time)
  form.capacity = session.capacity
  form.is_active = session.is_active
}

function formatDateTimeLocal(dateString: string): string {
  if (!dateString) {
    return ''
  }
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const closeModal = () => {
  showCreateModal.value = false
  editingSession.value = null
  form.title = ''
  form.start_time = ''
  form.end_time = ''
  form.capacity = 100
  form.is_active = true
}

const submit = () => {
  processing.value = true
  const url = editingSession.value
    ? `/admin/sessions/${editingSession.value.id}/update`
    : `/admin/events/${props.event.id}/sessions`

  // Use POST for both create and update (with /update suffix)
  const method = 'post'

  router[method](url, form, {
    onFinish: () => {
      processing.value = false
      closeModal()
    },
  })
}

const formatDisplayDate = (val: string) => {
  const d = new Date(val)
  return d
    .toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(',', '')
}

const deleteSession = (id: number) => {
  if (
    confirm(
      'Initiate segment purge? This action will disconnect all current registrations for this slot.'
    )
  ) {
    router.delete(`/admin/sessions/${id}`)
  }
}
</script>