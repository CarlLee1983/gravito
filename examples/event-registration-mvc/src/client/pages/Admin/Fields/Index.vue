<template>
  <AdminLayout>
    <div class="max-w-6xl mx-auto pb-32 transition-colors duration-500 text-left">
      <!-- Premium Header -->
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
        <div>
          <Link :href="`/admin/events/${event.id}/edit`" class="inline-flex items-center text-[10px] font-black text-gray-400 hover:text-indigo-600 transition-all uppercase tracking-[0.2em] mb-6 group text-left">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            Control Plane / Logic Definitions
          </Link>
          <h1 class="text-4xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">Ingestion Logic</h1>
          <p class="text-gray-500 dark:text-slate-500 mt-2 font-medium">Design the participant metadata schema for <span class="text-cyan-600 dark:text-cyan-400 font-bold">#{{ event.title }}</span></p>
        </div>
        
        <button @click="showCreateModal = true" class="btn-primary !from-cyan-600 !to-indigo-600 shadow-cyan-500/20 px-8 py-4">
          <div class="i-carbon-add mr-2 text-xl" />
          Add Data Variable
        </button>
      </div>

      <!-- Logic Visualization Hint -->
      <div class="mb-10 p-6 bg-indigo-900 text-white rounded-[2.5rem] shadow-xl shadow-indigo-900/20 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        <div class="absolute inset-0 opacity-10 pointer-events-none">
          <div class="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
        </div>
        <div class="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0 border-1 border-white/20">
          <div class="i-carbon-flow-data text-3xl" />
        </div>
        <div class="flex-1 text-center md:text-left relative z-10">
          <h4 class="text-sm font-black uppercase tracking-widest mb-1 text-cyan-300">Schema Sequence</h4>
          <p class="text-sm font-medium text-indigo-100 opacity-80">The order defined below will be strictly enforced on the participant registration interface.</p>
        </div>
      </div>

      <!-- Logic Map (Fields List) -->
      <div v-if="fields.length" class="space-y-4">
        <div 
          v-for="(field, index) in fields" 
          :key="field.id" 
          class="bg-card rounded-[2.5rem] p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 group flex items-center gap-8"
        >
          <!-- Order Handle -->
          <div class="w-10 h-14 flex flex-col items-center justify-center text-gray-200 dark:text-gray-800 border-r border-gray-100 dark:border-white/5 pr-4 group-hover:text-indigo-400 transition-colors">
            <span class="text-[10px] font-black mb-1 opacity-40 uppercase tracking-tighter">POS</span>
            <span class="text-lg font-black leading-none text-gray-900 dark:text-white">{{ index + 1 }}</span>
          </div>

          <!-- Type Visualization -->
          <div class="w-14 h-14 rounded-2xl bg-soft flex items-center justify-center text-gray-400 group-hover:bg-brand-50 dark:group-hover:bg-brand-900/20 group-hover:text-brand-600 transition-all shadow-inner border border-transparent group-hover:border-brand-100">
            <div :class="getFieldIcon(field.type)" class="text-3xl" />
          </div>

          <div class="flex-1 min-w-0 text-left">
            <div class="flex items-center space-x-3 mb-1.5">
              <h3 class="text-lg font-black text-gray-900 dark:text-white truncate tracking-tight">{{ field.label }}</h3>
              <span v-if="field.required" class="px-2 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 text-[8px] font-black uppercase border border-red-100/50">Mandatory</span>
            </div>
            <div class="flex items-center space-x-4">
              <span class="text-[9px] font-mono font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">KEY: {{ field.name }}</span>
              <span class="text-[9px] font-black text-indigo-600 dark:text-brand-400 uppercase tracking-widest bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-lg">{{ field.type }}</span>
            </div>
          </div>

          <!-- Options Preview -->
          <div class="hidden xl:flex items-center space-x-2 flex-shrink-0">
            <div v-if="['select', 'radio', 'checkbox'].includes(field.type)" class="flex -space-x-2">
              <div 
                v-for="opt in parseOptions(field.options).slice(0, 4)" 
                :key="opt"
                class="w-8 h-8 rounded-full bg-white dark:bg-gray-800 ring-4 ring-bg-base flex items-center justify-center text-[8px] font-black text-gray-400 border border-gray-100 dark:border-white/5 shadow-sm truncate"
                :title="opt"
              >
                {{ opt.substring(0, 2).toUpperCase() }}
              </div>
              <div v-if="parseOptions(field.options).length > 4" class="w-8 h-8 rounded-full bg-brand-600 ring-4 ring-bg-base flex items-center justify-center text-[8px] font-black text-white shadow-lg">
                +{{ parseOptions(field.options).length - 4 }}
              </div>
            </div>
          </div>

          <!-- Logic Actions -->
          <div class="flex items-center space-x-2 ml-4">
            <button @click="editField(field)" class="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-600 transition-all">
              <div class="i-carbon-edit text-2xl" />
            </button>
            <button @click="deleteField(field.id)" class="w-12 h-12 rounded-2xl flex items-center justify-center text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-all">
              <div class="i-carbon-trash-can text-2xl" />
            </button>
          </div>
        </div>
      </div>

      <!-- Executive Empty State -->
      <div v-else class="text-center py-32 bg-card rounded-[4rem] border-2 border-dashed border-gray-200 dark:border-white/10 shadow-inner">
        <div class="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-gray-300 dark:text-gray-700 font-black">
          <div class="i-carbon-flow-data text-5xl" />
        </div>
        <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">No ingestion logic defined</h3>
        <p class="text-gray-500 dark:text-slate-500 font-medium mb-12 max-w-sm mx-auto leading-relaxed px-8">Initialize custom variables to capture specific attendee telemetry during the registration lifecycle.</p>
        <button @click="showCreateModal = true" class="btn-primary px-12 py-4">
          <div class="i-carbon-add mr-2" />
          Initialize First Variable
        </button>
      </div>
    </div>

    <!-- Logic Definition Modal -->
    <div v-if="showCreateModal || editingField" class="fixed inset-0 z-[100] flex items-center justify-center p-6 transition-all duration-500">
      <div class="absolute inset-0 bg-gray-900/90 backdrop-blur-md animate-fade-in" @click="closeModal"></div>
      <div class="bg-card rounded-[3.5rem] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden animate-slide-up border-1 border-white/10">
        <div class="p-10 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
          <div>
            <h3 class="text-2xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
              {{ editingField ? 'Update Variable' : 'Define Variable' }}
            </h3>
            <p class="text-[10px] font-black text-gray-400 dark:text-gray-600 uppercase tracking-widest mt-2">Telemetry Parameter Configuration</p>
          </div>
          <button @click="closeModal" class="w-12 h-12 flex items-center justify-center rounded-2xl hover:bg-white dark:hover:bg-white/10 transition-colors">
            <div class="i-carbon-close text-2xl" />
          </button>
        </div>
        
        <form @submit.prevent="submit" class="p-10 space-y-10 text-left max-h-[75vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div class="space-y-2">
              <label class="label-premium text-[9px]">Public Label</label>
              <input v-model="form.label" type="text" class="input-premium" placeholder="e.g. Dietary Requirements" required />
            </div>
            <div class="space-y-2">
              <label class="label-premium text-[9px]">Internal Database Key</label>
              <input v-model="form.name" type="text" class="input-premium font-mono text-xs" placeholder="dietary_req" required />
            </div>
          </div>
          
          <div class="space-y-4">
            <label class="label-premium text-[9px]">Ingestion Interface Type</label>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-4">
              <button 
                v-for="type in fieldTypes" 
                :key="type.id"
                type="button"
                @click="form.type = type.id"
                class="flex flex-col items-center justify-center p-5 rounded-[1.5rem] border-1 transition-all duration-300 group"
                :class="form.type === type.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-500/20 scale-105' : 'bg-soft border-transparent text-gray-400 dark:text-gray-600 hover:border-gray-200 dark:hover:border-gray-800'"
              >
                <div :class="type.icon" class="text-2xl mb-2" />
                <span class="text-[8px] font-black uppercase tracking-widest text-center">{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Dynamic Options Logic -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform -translate-y-4 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
          >
            <div v-if="['select', 'radio', 'checkbox'].includes(form.type)" class="space-y-4">
              <div class="flex justify-between items-center">
                <label class="label-premium text-[9px]">Dictionary Options</label>
                <span class="text-[8px] font-black text-brand-500 uppercase tracking-[0.2em]">One entry per line</span>
              </div>
              <textarea 
                @input="updateOptions" 
                :value="optionsText" 
                class="input-premium min-h-[160px] font-bold leading-loose tracking-tight"
                placeholder="Vegetarian&#10;Vegan&#10;Halal"
              ></textarea>
            </div>
          </Transition>

          <div class="flex items-center space-x-6 p-6 bg-soft rounded-[2rem] border-1 border-gray-100 dark:border-white/5 shadow-inner">
            <label class="flex items-center space-x-4 cursor-pointer group">
              <div class="relative w-12 h-7 bg-gray-200 dark:bg-gray-800 rounded-full transition-all group-hover:ring-4 ring-red-500/10" :class="{ '!bg-red-500': form.required }">
                <div class="absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-sm" :class="{ 'translate-x-5': form.required }" />
              </div>
              <input type="checkbox" v-model="form.required" class="hidden" />
              <div class="flex flex-col">
                <span class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-widest">Enforce Validation</span>
                <span class="text-[9px] font-medium text-gray-400 dark:text-gray-600 mt-0.5">Participant must fill this variable</span>
              </div>
            </label>
          </div>

          <div class="pt-10 border-t border-gray-100 dark:border-white/5 flex gap-4 sticky bottom-0 bg-card pt-6 pb-2">
            <button type="button" @click="closeModal" class="btn-secondary !py-4 flex-1">Discard</button>
            <button type="submit" class="btn-primary !py-4 flex-[2]" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-3" />
              <div v-else class="i-carbon-checkmark mr-3" />
              Commit Logic
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Link, router } from '@inertiajs/vue3'
import AdminLayout from '../../../components/AdminLayout.vue'

const props = defineProps<{
  event: any
  fields: any[]
}>()

const showCreateModal = ref(false)
const editingField = ref<any>(null)
const processing = ref(false)

const form = reactive({
  name: '',
  label: '',
  type: 'text',
  options: [] as string[],
  required: false,
})

const fieldTypes = [
  { id: 'text', label: 'Short Text', icon: 'i-carbon-string-text' },
  { id: 'textarea', label: 'Long Text', icon: 'i-carbon-paragraph' },
  { id: 'select', label: 'Dropdown', icon: 'i-carbon-list-dropdown' },
  { id: 'radio', label: 'Single', icon: 'i-carbon-radio-button-checked' },
  { id: 'checkbox', label: 'Multiple', icon: 'i-carbon-checkbox-checked' },
]

const getFieldIcon = (type: string) =>
  fieldTypes.find((t) => t.id === type)?.icon || 'i-carbon-help'

const optionsText = computed(() => form.options.join('\n'))

const updateOptions = (e: any) => {
  form.options = e.target.value
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0)
}

const parseOptions = (options: any) => {
  if (!options) return []
  if (Array.isArray(options)) return options
  try {
    return JSON.parse(options)
  } catch (e) {
    return String(options)
      .split(',')
      .filter((s) => s.trim())
  }
}

const editField = (field: any) => {
  editingField.value = field
  form.name = field.name
  form.label = field.label
  form.type = field.type
  form.options = parseOptions(field.options)
  form.required = !!field.required
}

const closeModal = () => {
  showCreateModal.value = false
  editingField.value = null
  form.name = ''
  form.label = ''
  form.type = 'text'
  form.options = []
  form.required = false
}

const submit = () => {
  processing.value = true
  const url = editingField.value
    ? `/admin/fields/${editingField.value.id}/update`
    : `/admin/events/${props.event.id}/fields`

  // Use POST for both create and update (with /update suffix)
  const method = 'post'

  // Send options as actual array (backend handles stringification if needed)
  const data = { ...form, options: form.options }

  router[method](url, data, {
    onFinish: () => {
      processing.value = false
      closeModal()
    },
  })
}

const deleteField = (id: number) => {
  if (
    confirm(
      'Initiate variable purge? Collected participant data for this variable will be archived.'
    )
  ) {
    router.delete(`/admin/fields/${id}`)
  }
}
</script>
