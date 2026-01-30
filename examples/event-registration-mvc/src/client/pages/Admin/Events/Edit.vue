<template>
  <AdminLayout>
    <div class="max-w-6xl mx-auto pb-32 transition-colors duration-500 text-left">
      <!-- Premium Header with Sub-management -->
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <Link href="/admin/events" class="inline-flex items-center text-[10px] font-black text-gray-400 hover:text-brand-600 transition-all uppercase tracking-[0.2em] mb-6 group">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            Control Plane / Nodes
          </Link>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">Configure Terminal</h1>
          <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">Modifying orchestration parameters for: <span class="text-indigo-600 font-bold">#{{ event.id }}</span></p>
        </div>
        
        <!-- Rapid Management Matrix -->
        <div class="flex items-center bg-card p-2 rounded-[1.5rem] shadow-xl dark:shadow-black/20 border-1 border-gray-100 dark:border-white/5">
          <Link :href="`/admin/events/${event.id}/sessions`" class="flex flex-col items-center justify-center px-6 py-3 rounded-2xl hover:bg-brand-50 dark:hover:bg-brand-900/20 group transition-all">
            <div class="i-carbon-time text-2xl text-indigo-600 group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mt-2 group-hover:text-indigo-600">Sessions</span>
          </Link>
          <div class="w-px h-10 bg-gray-100 dark:bg-white/5 mx-2" />
          <Link :href="`/admin/events/${event.id}/fields`" class="flex flex-col items-center justify-center px-6 py-3 rounded-2xl hover:bg-cyan-50 dark:hover:bg-cyan-900/20 group transition-all">
            <div class="i-carbon-task text-2xl text-cyan-600 group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mt-2 group-hover:text-cyan-600">Forms</span>
          </Link>
          <div class="w-px h-10 bg-gray-100 dark:bg-white/5 mx-2" />
          <Link :href="`/events/${event.id}`" target="_blank" class="flex flex-col items-center justify-center px-6 py-3 rounded-2xl hover:bg-gray-100 dark:hover:bg-white/10 group transition-all">
            <div class="i-carbon-launch text-2xl text-gray-400 group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-black text-gray-400 uppercase mt-2">Live</span>
          </Link>
        </div>
      </div>
      
      <form @submit.prevent="submit" class="space-y-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
          
          <div class="lg:col-span-2 space-y-8">
            <div class="bg-card rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
              <h3 class="label-premium mb-10 flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-500 mr-3 shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                Terminal Core Identity
              </h3>

              <div class="space-y-8">
                <div class="group">
                  <label class="label-premium text-[9px]">Official Label</label>
                  <input v-model="form.title" type="text" class="input-premium" required />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div class="group">
                    <label class="label-premium text-[9px]">Location Vector</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-400 group-focus-within:text-brand-500 transition-colors">
                        <div class="i-carbon-location" />
                      </div>
                      <input v-model="form.location" type="text" class="input-premium pl-14" required />
                    </div>
                  </div>
                  <div class="group">
                    <label class="label-premium text-[9px]">Banner Proxy URL</label>
                    <div class="relative">
                      <div class="absolute inset-y-0 left-0 pl-5 flex items-center text-gray-400 group-focus-within:text-brand-500 transition-colors">
                        <div class="i-carbon-image" />
                      </div>
                      <input v-model="form.image_url" type="url" class="input-premium pl-14" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-card rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 class="label-premium mb-8 flex items-center text-cyan-500">
                <div class="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-3 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                Operational Description
              </h3>
              <textarea v-model="form.description" class="input-premium min-h-[280px] resize-none leading-relaxed text-sm font-medium" required />
            </div>
          </div>

          <div class="space-y-8">
            <div class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden transition-all hover:shadow-xl">
              <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500" />
              <h3 class="label-premium mb-6">Protocol State</h3>
              
              <div class="space-y-6 text-left">
                <div class="relative group">
                  <select v-model="form.status" class="input-premium appearance-none pr-12 font-black text-sm uppercase tracking-widest" required>
                    <option value="draft">System: DRAFT</option>
                    <option value="published">System: PUBLISHED</option>
                    <option value="cancelled">System: CANCELLED</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none text-brand-500">
                    <div class="i-carbon-chevron-down" />
                  </div>
                </div>

                <div class="flex items-center space-x-4 p-4 bg-soft rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
                  <div class="flex-1 text-center border-r border-gray-200 dark:border-white/10">
                    <p class="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Load</p>
                    <p class="text-xl font-black text-gray-900 dark:text-white">{{ event.sessions?.length || 0 }} <span class="text-[8px] opacity-30">SEG</span></p>
                  </div>
                  <div class="flex-1 text-center">
                    <p class="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest">Logic</p>
                    <p class="text-xl font-black text-gray-900 dark:text-white">{{ event.fields?.length || 0 }} <span class="text-[8px] opacity-30">VAR</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 class="label-premium mb-6 flex items-center text-indigo-400">
                <div class="i-carbon-time mr-2" /> Schedule Window
              </h3>
              
              <div class="space-y-4">
                <!-- Start Date Card -->
                <div class="date-card">
                  <input v-model="form.registration_start" type="datetime-local" class="date-native-input" required />
                  <div class="date-icon-box">
                    <div class="i-carbon-event-schedule text-xl" />
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Opening Epoch</p>
                    <p class="text-xs font-black text-gray-900 dark:text-white font-mono">
                      {{ form.registration_start ? formatDisplayDate(form.registration_start) : 'Not Scheduled' }}
                    </p>
                  </div>
                  <div class="i-carbon-chevron-sort text-gray-300 dark:text-gray-700" />
                </div>

                <!-- End Date Card -->
                <div class="date-card">
                  <input v-model="form.registration_end" type="datetime-local" class="date-native-input" required />
                  <div class="date-icon-box">
                    <div class="i-carbon-alarm-confirm text-xl" />
                  </div>
                  <div class="flex-1 text-left">
                    <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1.5">Closing Epoch</p>
                    <p class="text-xs font-black text-gray-900 dark:text-white font-mono">
                      {{ form.registration_end ? formatDisplayDate(form.registration_end) : 'Not Scheduled' }}
                    </p>
                  </div>
                  <div class="i-carbon-chevron-sort text-gray-300 dark:text-gray-700" />
                </div>
              </div>
            </div>

            <div class="pt-4">
              <button type="submit" class="btn-primary w-full py-5 text-lg font-black shadow-2xl shadow-brand-500/30 group" :disabled="processing">
                <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
                <div v-else class="i-carbon-checkmark mr-3 group-hover:scale-125 transition-transform" />
                Update Configuration
              </button>
              <p class="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest mt-6 opacity-50">Authorized changes only.</p>
            </div>
          </div>

        </div>
      </form>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Link, router } from '@inertiajs/vue3'
import AdminLayout from '../../../components/AdminLayout.vue'

const props = defineProps<{
  event: any
}>()

const processing = ref(false)
const form = reactive({
  title: props.event.title,
  description: props.event.description,
  location: props.event.location,
  image_url: props.event.image_url || '',
  status: props.event.status,
  registration_start: formatDateTimeLocal(props.event.registration_start),
  registration_end: formatDateTimeLocal(props.event.registration_end),
})

function formatDateTimeLocal(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const submit = () => {
  processing.value = true
  router.post(`/admin/events/${props.event.id}/update`, form, {
    onFinish: () => (processing.value = false),
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
</script>
