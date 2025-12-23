<template>
  <div :class="className" style="position: relative">
    <div
      v-if="status?.status === 'processing'"
      style="
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        z-index: 10;
      "
    >
      <div
        style="
          width: 80%;
          height: 4px;
          background-color: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          overflow: hidden;
          margin-bottom: 8px;
        "
      >
        <div
          :style="{
            width: `${status.progress}%`,
            height: '100%',
            backgroundColor: '#4CAF50',
            transition: 'width 0.3s ease',
          }"
        />
      </div>
      <span style="font-size: 14px">
        {{ status.progress }}%
        <span v-if="status.message"> - {{ status.message }}</span>
      </span>
    </div>
    <img
      v-if="imageSrc"
      :src="imageSrc"
      alt="Processing"
      style="width: 100%; height: auto; display: block"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ProcessingStatus, FileOutput } from '../types'

interface Props {
  jobId: string
  placeholder?: string
  className?: string
  statusEndpoint?: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  complete: [result: FileOutput]
  error: [error: Error]
}>()

const status = ref<ProcessingStatus | null>(null)
const imageSrc = ref<string | null>(props.placeholder || null)
let eventSource: EventSource | null = null

onMounted(() => {
  const endpoint =
    props.statusEndpoint || `/forge/status/${props.jobId}/stream`
  eventSource = new EventSource(endpoint)

  eventSource.onmessage = (event) => {
    try {
      const newStatus = JSON.parse(event.data) as ProcessingStatus
      status.value = newStatus

      if (newStatus.status === 'completed' && newStatus.result) {
        imageSrc.value = newStatus.result.url
        emit('complete', newStatus.result)
        eventSource?.close()
      } else if (newStatus.status === 'failed') {
        emit('error', new Error(newStatus.error || 'Processing failed'))
        eventSource?.close()
      }
    } catch (error) {
      console.error('[ProcessingImage] Error parsing status:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('[ProcessingImage] SSE error:', error)
    eventSource?.close()
    emit('error', new Error('Failed to connect to status stream'))
  }
})

onUnmounted(() => {
  eventSource?.close()
})
</script>
