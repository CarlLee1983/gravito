<template>
  <div class="text-center">
    <div class="inline-block relative">
      <!-- Loading state -->
      <div v-if="!dataUrl" class="w-64 h-64 bg-gray-50 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
        <div class="i-carbon-progress-bar animate-spin text-3xl text-indigo-400 mb-2" />
        <p class="text-xs text-gray-400 font-medium tracking-wide uppercase">Generating...</p>
      </div>

      <template v-else>
        <!-- Actual QR Image -->
        <div class="bg-white p-2 rounded-2xl shadow-inner border-1 border-gray-100 group relative">
          <img
            :src="dataUrl"
            :alt="`QR Code for ${label}`"
            class="w-64 h-64 block rounded-xl group-hover:opacity-20 transition-opacity duration-300"
          />
          
          <!-- Hover Overlay -->
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              v-if="downloadable"
              @click="downloadQrCode"
              class="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform"
              title="Download Ticket"
            >
              <div class="i-carbon-download text-xl" />
            </button>
          </div>
        </div>
      </template>
    </div>
    
    <div v-if="label" class="mt-4 text-sm font-bold text-gray-900 uppercase tracking-widest">{{ label }}</div>
    
    <button
      v-if="downloadable && dataUrl"
      @click="downloadQrCode"
      class="mt-6 inline-flex items-center text-xs font-bold text-indigo-600 hover:text-indigo-500 uppercase tracking-wider group"
    >
      <div class="i-carbon-download mr-2 group-hover:translate-y-0.5 transition-transform" />
      Save to device
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps<{
  value: string
  label?: string
  downloadable?: boolean
  filename?: string
}>()

const dataUrl = ref<string>('')

onMounted(async () => {
  // Generate QR code on client side
  const QRCode = (await import('qrcode')).default
  try {
    dataUrl.value = await QRCode.toDataURL(props.value, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 600,
      margin: 2,
      color: {
        dark: '#1e1b4b', // gray-900
        light: '#ffffff',
      },
    })
  } catch (error) {
    console.error('Failed to generate QR code:', error)
  }
})

const downloadQrCode = () => {
  if (!dataUrl.value) return

  const link = document.createElement('a')
  link.href = dataUrl.value
  link.download = props.filename || `qrcode-${props.value}.png`
  link.click()
}
</script>
