<template>
  <AdminLayout>
    <div class="max-w-6xl mx-auto pb-20">
      <div class="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div>
          <Link :href="`/admin/events/${event.id}/edit`" class="inline-flex items-center text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors mb-4 group">
            <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
            {{ t('admin.common.back') }}
          </Link>
          <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight leading-none">{{ t('admin.fields.manage') }}</h1>
          <p class="text-gray-500 mt-2 font-medium">{{ t('admin.fields.subtitle') }} <span class="text-cyan-600 font-bold">{{ event.title }}</span></p>
        </div>
        
        <button @click="showCreateModal = true" class="btn-primary !from-cyan-600 !to-indigo-600 shadow-cyan-200">
          <div class="i-carbon-add mr-2" />
          {{ t('admin.fields.create') }}
        </button>
      </div>

      <!-- Drag & Drop Context (Visual Hint) -->
      <div class="mb-6 p-4 bg-amber-50 rounded-2xl border-1 border-amber-100 flex items-center text-amber-700 text-xs font-bold uppercase tracking-widest">
        <div class="i-carbon-information mr-3 text-lg" />
        {{ t('admin.common.attention') }}: {{ t('admin.fields.hint_order') }}
      </div>

      <!-- Fields List -->
      <div v-if="fields.length" class="space-y-4">
        <div 
          v-for="(field, index) in fields" 
          :key="field.id" 
          class="card bg-white border-none shadow-sm hover:shadow-md transition-all group p-5 flex items-center gap-6"
        >
          <!-- Drag Handle Mock -->
          <div class="w-8 h-12 flex flex-col items-center justify-center text-gray-300 cursor-move group-hover:text-indigo-400 transition-colors">
            <div class="i-carbon-draggable" />
          </div>

          <!-- Type Icon -->
          <div class="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
            <div :class="getFieldIcon(field.type)" class="text-2xl" />
          </div>

          <div class="flex-1 min-w-0 text-left">
            <div class="flex items-center space-x-3 mb-1">
              <h3 class="text-base font-black text-gray-900 truncate">{{ field.label }}</h3>
              <span v-if="field.required" class="px-1.5 py-0.5 rounded bg-red-50 text-red-500 text-[8px] font-black uppercase">{{ t('admin.fields.input_fields.required') }}</span>
            </div>
            <p class="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{{ t('admin.fields.input_fields.type') }}: {{ field.type }} • Key: {{ field.name }}</p>
          </div>

          <!-- Options Preview -->
          <div class="hidden md:flex flex-wrap gap-1 max-w-xs justify-end">
            <span 
              v-for="opt in parseOptions(field.options).slice(0, 3)" 
              :key="opt"
              class="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold"
            >
              {{ opt }}
            </span>
            <span v-if="parseOptions(field.options).length > 3" class="text-[10px] text-gray-400 font-bold px-1">+{{ parseOptions(field.options).length - 3 }} more</span>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2 ml-4">
            <button @click="editField(field)" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all">
              <div class="i-carbon-edit text-xl" />
            </button>
            <button @click="deleteField(field.id)" class="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all">
              <div class="i-carbon-trash-can text-xl" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-24 card bg-white border-dashed border-2 border-gray-200">
        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300 font-black">
          <div class="i-carbon-list text-4xl" />
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2 tracking-tight">{{ t('admin.common.no_records') }}</h3>
        <p class="text-gray-500 mb-10 max-w-xs mx-auto">{{ t('admin.fields.subtitle') }}</p>
        <button @click="showCreateModal = true" class="btn-primary !from-cyan-600 !to-indigo-600">
          <div class="i-carbon-add mr-2" />
          {{ t('admin.fields.create') }}
        </button>
      </div>
    </div>

    <!-- Field Modal -->
    <div v-if="showCreateModal || editingField" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" @click="closeModal"></div>
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative z-10 overflow-hidden animate-slide-up">
        <div class="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-xl font-black text-gray-900 tracking-tight">
            {{ editingField ? t('admin.common.edit') : t('admin.fields.create') }}
          </h3>
          <button @click="closeModal" class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white transition-colors">
            <div class="i-carbon-close text-xl" />
          </button>
        </div>
        
        <form @submit.prevent="submit" class="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div class="grid grid-cols-2 gap-4">
            <div class="col-span-2 sm:col-span-1">
              <label class="label-base">{{ t('admin.fields.input_fields.label') }}</label>
              <input v-model="form.label" type="text" class="input-base" placeholder="Dietary Needs" required />
            </div>
            <div class="col-span-2 sm:col-span-1">
              <label class="label-base">Internal Key</label>
              <input v-model="form.name" type="text" class="input-base font-mono text-xs" placeholder="dietary_needs" required />
            </div>
          </div>
          
          <div>
            <label class="label-base">{{ t('admin.fields.input_fields.type') }}</label>
            <div class="grid grid-cols-3 gap-3">
              <button 
                v-for="type in fieldTypes" 
                :key="type.id"
                type="button"
                @click="form.type = type.id"
                class="flex flex-col items-center justify-center p-4 rounded-2xl border-1 transition-all"
                :class="form.type === type.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-gray-50 border-transparent text-gray-500 hover:border-gray-200'"
              >
                <div :class="type.icon" class="text-xl mb-2" />
                <span class="text-[10px] font-black uppercase tracking-tighter">{{ type.label }}</span>
              </button>
            </div>
          </div>

          <!-- Options Editor -->
          <div v-if="['select', 'radio', 'checkbox'].includes(form.type)">
            <label class="label-base">{{ t('admin.fields.input_fields.options') }}</label>
            <textarea 
              @input="updateOptions" 
              :value="optionsText" 
              class="input-base min-h-[120px] font-medium" 
              placeholder="Vegetarian&#10;Vegan&#10;Halal"
            ></textarea>
          </div>

          <div class="flex items-center space-x-6 p-4 bg-gray-50 rounded-2xl border-1 border-gray-100">
            <label class="flex items-center space-x-3 cursor-pointer group">
              <div class="relative w-10 h-6 bg-gray-200 rounded-full transition-colors group-hover:bg-gray-300" :class="{ '!bg-red-500': form.required }">
                <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform" :class="{ 'translate-x-4': form.required }" />
              </div>
              <input type="checkbox" v-model="form.required" class="hidden" />
              <span class="text-xs font-black text-gray-500 uppercase tracking-widest">{{ t('admin.fields.input_fields.required') }}</span>
            </label>
          </div>

          <div class="pt-6 flex gap-4 sticky bottom-0 bg-white pt-4 border-t border-gray-50">
            <button type="submit" class="flex-1 btn-primary py-4" :disabled="processing">
              <div v-if="processing" class="i-carbon-progress-bar animate-spin mr-2" />
              {{ editingField ? t('admin.common.save') : t('admin.common.create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import AdminLayout from '../../../components/AdminLayout.vue';
import { useI18n } from '../../../composables/useI18n';

const { t } = useI18n();

interface RegistrationField {
  id: number;
  label: string;
  name: string;
  type: string;
  options: any;
  required: boolean;
}

const props = defineProps<{
  event: any;
  fields: RegistrationField[];
}>();

const showCreateModal = ref(false);
const editingField = ref<any>(null);
const processing = ref(false);

const form = reactive({
  name: '',
  label: '',
  type: 'text',
  options: [] as string[],
  required: false,
});

const fieldTypes = computed(() => [
  { id: 'text', label: t('admin.fields.types.text'), icon: 'i-carbon-string-text' },
  { id: 'textarea', label: t('admin.fields.types.textarea'), icon: 'i-carbon-paragraph' },
  { id: 'select', label: t('admin.fields.types.select'), icon: 'i-carbon-list-dropdown' },
  { id: 'radio', label: t('admin.fields.types.radio'), icon: 'i-carbon-radio-button-checked' },
  { id: 'checkbox', label: t('admin.fields.types.checkbox'), icon: 'i-carbon-checkbox-checked' },
]);

const getFieldIcon = (type: string) => fieldTypes.value.find((t: any) => t.id === type)?.icon || 'i-carbon-help';

const optionsText = computed(() => form.options.join('\n'));

const updateOptions = (e: any) => {
  form.options = e.target.value.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
};

const parseOptions = (options: any) => {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  try {
    return JSON.parse(options);
  } catch (e) {
    return String(options).split(',').filter(s => s.trim());
  }
};

const editField = (field: any) => {
  editingField.value = field;
  form.name = field.name;
  form.label = field.label;
  form.type = field.type;
  form.options = parseOptions(field.options);
  form.required = !!field.required;
};

const closeModal = () => {
  showCreateModal.value = false;
  editingField.value = null;
  form.name = '';
  form.label = '';
  form.type = 'text';
  form.options = [];
  form.required = false;
};

const submit = () => {
  processing.value = true;
  const url = editingField.value 
    ? `/admin/fields/${editingField.value.id}` 
    : `/admin/events/${props.event.id}/fields`;
  
  const method = editingField.value ? 'put' : 'post';
  
  // Back-end expects options as stringified array
  const data = { ...form, options: form.options };
  
  router[method](url, data, {
    onFinish: () => {
      processing.value = false;
      closeModal();
    }
  });
};

const deleteField = (id: number) => {
  if (confirm(t('admin.common.confirm_delete'))) {
    router.delete(`/admin/fields/${id}`);
  }
};
</script>
