<template>
  <div class="mb-6 group">
    <label :for="field.name" class="label group-focus-within:text-indigo-600 transition-colors">
      {{ field.label }}
      <span v-if="field.required" class="text-red-500 ml-1">*</span>
    </label>
    
    <!-- Text Input -->
    <input
      v-if="field.type === 'text'"
      :id="field.name"
      v-model="localValue"
      type="text"
      class="input"
      :placeholder="`Enter your ${field.label.toLowerCase()}`"
      :required="field.required"
    />
    
    <!-- Textarea -->
    <textarea
      v-else-if="field.type === 'textarea'"
      :id="field.name"
      v-model="localValue"
      class="input min-h-24"
      :placeholder="`Provide details for ${field.label.toLowerCase()}`"
      :required="field.required"
    ></textarea>
    
    <!-- Select -->
    <div v-else-if="field.type === 'select'" class="relative">
      <select
        :id="field.name"
        v-model="localValue"
        class="input appearance-none pr-10"
        :required="field.required"
      >
        <option value="" disabled selected>Select an option</option>
        <option
          v-for="option in getOptions()"
          :key="option"
          :value="option"
        >
          {{ option }}
        </option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
        <div class="i-carbon-chevron-down" />
      </div>
    </div>
    
    <!-- Radio -->
    <div v-else-if="field.type === 'radio'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      <label
        v-for="option in getOptions()"
        :key="option"
        class="flex items-center space-x-3 p-3 rounded-xl border-1 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all"
        :class="{ 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600': localValue === option }"
      >
        <input
          v-model="localValue"
          type="radio"
          :name="field.name"
          :value="option"
          class="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
          :required="field.required"
        />
        <span class="text-sm font-medium text-gray-700">{{ option }}</span>
      </label>
    </div>
    
    <!-- Checkbox -->
    <div v-else-if="field.type === 'checkbox'" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
      <label
        v-for="option in getOptions()"
        :key="option"
        class="flex items-center space-x-3 p-3 rounded-xl border-1 border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-all"
        :class="{ 'border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600': isChecked(option) }"
      >
        <input
          type="checkbox"
          :value="option"
          :checked="isChecked(option)"
          @change="toggleCheckbox(option)"
          class="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
        />
        <span class="text-sm font-medium text-gray-700">{{ option }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  field: {
    id: number
    name: string
    label: string
    type: string
    options?: string
    required: boolean
  }
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const localValue = ref(props.modelValue || '')

watch(localValue, (newValue) => {
  emit('update:modelValue', newValue)
})

const getOptions = (): string[] => {
  if (!props.field.options) return []
  try {
    return JSON.parse(props.field.options)
  } catch {
    return []
  }
}

const isChecked = (option: string): boolean => {
  if (!localValue.value) return false
  const values = localValue.value.split(',')
  return values.includes(option)
}

const toggleCheckbox = (option: string) => {
  const values = localValue.value ? localValue.value.split(',') : []
  const index = values.indexOf(option)

  if (index > -1) {
    values.splice(index, 1)
  } else {
    values.push(option)
  }

  localValue.value = values.filter((v) => v).join(',')
}
</script>
