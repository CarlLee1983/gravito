<template>
  <AdminLayout>
    <div class="max-w-5xl mx-auto pb-32 transition-colors duration-500 text-left">
      <!-- Premium Header -->
      <div class="mb-12">
        <Link href="/admin/events" class="inline-flex items-center text-[10px] font-black text-gray-400 hover:text-brand-600 dark:text-gray-500 dark:hover:text-brand-400 transition-all uppercase tracking-[0.2em] mb-6 group">
          <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
          Protocol / Event Registry
        </Link>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">Create Event Terminal</h1>
            <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">Initialize a new secure ingestion point for participants.</p>
          </div>
        </div>
      </div>
      
      <form @submit.prevent="submit" class="space-y-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <!-- Left Column: Core Configuration -->
          <div class="lg:col-span-2 space-y-8">
            <!-- Section: Identity -->
            <div class="bg-card rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                <div class="i-carbon-tag text-9xl" />
              </div>
              
              <h3 class="label-premium mb-8 flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-500 mr-3 shadow-[0_0_10px_rgba(124,58,237,0.5)]" />
                Identity & Visuals
              </h3>

              <div class="space-y-8">
                <div class="group">
                  <label class="label-premium text-[9px]">Official Event Title</label>
                  <input v-model="form.title" type="text" class="input-premium" placeholder="e.g. Quantum Computing Symposium 2026" required />
                </div>

                <div class="group">
                  <label class="label-premium text-[9px]">Public Location / Platform</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500">
                      <div class="i-carbon-location text-xl" />
                    </div>
                    <input v-model="form.location" type="text" class="input-premium pl-14" placeholder="Virtual or Physical Address" required />
                  </div>
                </div>

                <div class="group">
                  <label class="label-premium text-[9px]">Cover Asset URL</label>
                  <div class="relative">
                    <div class="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500">
                      <div class="i-carbon-image text-xl" />
                    </div>
                    <input v-model="form.image_url" type="url" class="input-premium pl-14" placeholder="https://assets.gravito.io/banners/event-01.jpg" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Section: Narrative -->
            <div class="bg-card rounded-[2.5rem] p-10 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 class="label-premium mb-8 flex items-center">
                <div class="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-3 shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                Event Narrative
              </h3>
              <textarea v-model="form.description" class="input-premium min-h-[240px] resize-none leading-relaxed" placeholder="Craft a compelling story for your attendees. Markdown support enabled." required />
            </div>
          </div>

          <!-- Right Column: Control & Metadata -->
          <div class="space-y-8">
            <!-- Lifecycle Control -->
            <div class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm relative overflow-hidden">
              <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-cyan-500" />
              <h3 class="label-premium mb-6">Status & Visibility</h3>
              
              <div class="space-y-6">
                <div class="relative group">
                  <select v-model="form.status" class="input-premium appearance-none pr-12 font-bold" required>
                    <option value="draft">System: DRAFT</option>
                    <option value="published">System: PUBLISHED</option>
                    <option value="cancelled">System: CANCELLED</option>
                  </select>
                  <div class="absolute inset-y-0 right-0 flex items-center pr-5 pointer-events-none text-brand-500">
                    <div class="i-carbon-chevron-down" />
                  </div>
                </div>

                <div class="p-4 bg-soft rounded-2xl border border-gray-100 dark:border-white/5">
                  <p class="text-[9px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mb-3 text-center">Protocol Hint</p>
                  <div class="flex items-start space-x-3">
                    <div class="i-carbon-information text-brand-500 mt-0.5" />
                    <p class="text-[10px] leading-relaxed text-gray-500 dark:text-slate-500">Events in <strong>DRAFT</strong> mode are only visible to the orchestration team.</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Ingestion Window -->
            <div class="bg-card rounded-[2.5rem] p-8 border border-gray-100 dark:border-white/5 shadow-sm">
              <h3 class="label-premium mb-6 flex items-center">
                <div class="i-carbon-calendar mr-2 text-brand-500" /> Ingestion Window
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

            <!-- Deployment Trigger -->
            <div class="pt-4">
              <button type="submit" class="btn-primary w-full py-5 text-lg font-black shadow-2xl shadow-indigo-500/30 group" :disabled="processing">
                <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
                <div v-else class="i-carbon-cloud-upload mr-3 group-hover:-translate-y-1 transition-transform" />
                Initialize Event
              </button>
              <Link href="/admin/events" class="w-full mt-4 btn-secondary py-4 text-xs font-black uppercase tracking-[0.2em]">
                Discard Terminal
              </Link>
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

const processing = ref(false)
const form = reactive({
  title: '',
  description: '',
  location: '',
  image_url: '',
  status: 'draft',
  registration_start: '',
  registration_end: '',
})

const submit = () => {
  processing.value = true
  router.post('/admin/events', form, {
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
