<template>
  <div :class="className">
    <div v-if="!status" style="margin-bottom: 8px">Loading...</div>
    <template v-else>
      <div style="margin-bottom: 8px">
        <strong>Status:</strong> {{ status.status }}
      </div>
      <template v-if="status.status === 'processing'">
        <div
          style="
            width: 100%;
            height: 8px;
            background-color: #e0e0e0;
            border-radius: 4px;
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
        <div style="font-size: 14px; color: #666">
          {{ status.progress }}%
          <span v-if="status.message"> - {{ status.message }}</span>
        </div>
      </template>
      <div v-if="status.status === 'completed'" style="color: #4caf50">
        Processing completed!
      </div>
      <div v-if="status.status === 'failed'" style="color: #f44336">
        Processing failed: {{ status.error }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import type { ProcessingStatus } from '../types'

interface Props {
  jobId: string
  statusEndpoint?: string
  className?: string
}

const props = defineProps<Props>()
const status = ref<ProcessingStatus | null>(null)
let eventSource: EventSource | null = null

onMounted(() => {
  const endpoint =
    props.statusEndpoint || `/forge/status/${props.jobId}/stream`
  eventSource = new EventSource(endpoint)

  eventSource.onmessage = (event) => {
    try {
      const newStatus = JSON.parse(event.data) as ProcessingStatus
      status.value = newStatus

      if (
        newStatus.status === 'completed' ||
        newStatus.status === 'failed'
      ) {
        eventSource?.close()
      }
    } catch (error) {
      console.error('[ProcessingStatus] Error parsing status:', error)
    }
  }

  eventSource.onerror = (error) => {
    console.error('[ProcessingStatus] SSE error:', error)
    eventSource?.close()
  }
})

onUnmounted(() => {
  eventSource?.close()
})
</script>
