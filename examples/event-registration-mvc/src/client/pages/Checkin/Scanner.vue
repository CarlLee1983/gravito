<template>
  <Layout>
    <div class="relative min-h-[40vh] flex items-center justify-center overflow-hidden bg-gray-900 -mt-8">
      <!-- Sophisticated Background -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.2),transparent_70%)]" />
        <div class="i-carbon-qr-code text-[20rem] absolute -right-20 -bottom-20 text-white/5 rotate-12" />
      </div>
      
      <div class="container mx-auto px-6 relative z-10 text-center">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border-1 border-indigo-500/20 text-indigo-400 mb-6 animate-fade-in">
          <div class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span class="text-[10px] font-black uppercase tracking-[0.2em]">{{ t('scan.gate_control') }}</span>
        </div>
        <h1 class="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">{{ t('scan.title') }}</h1>
        <p class="text-gray-400 text-lg max-w-xl mx-auto font-medium">
          {{ t('scan.subtitle') }}
        </p>
      </div>
    </div>

    <div class="container-wide -mt-16 pb-32 relative z-20">
      <div class="max-w-2xl mx-auto">
        <div class="glass dark:glass-dark rounded-[2.5rem] shadow-2xl overflow-hidden border-1 border-white/10">
          <!-- Scanner Launcher -->
          <div v-if="!scanning" class="p-12 text-center">
            <div class="w-24 h-24 bg-indigo-600/10 rounded-3xl flex items-center justify-center mx-auto mb-8 relative group">
              <div class="absolute inset-0 bg-indigo-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity" />
              <div class="i-carbon-camera text-5xl text-indigo-600 relative z-10" />
            </div>
            <h2 class="text-2xl font-black text-gray-900 mb-3 tracking-tight">{{ t('scan.activate') }}</h2>
            <p class="text-gray-500 mb-10 max-w-sm mx-auto font-medium">{{ t('scan.permission_msg') }}</p>
            <button @click="startScanning" class="btn-primary px-10 py-4 text-base shadow-2xl shadow-indigo-500/40 group">
              <div class="i-carbon-scan mr-2 group-hover:rotate-90 transition-transform duration-500" />
              {{ t('scan.start') }}
            </button>
          </div>
          
          <!-- Active Scanner View -->
          <div v-else class="p-8 space-y-8">
            <div class="flex items-center justify-between px-4">
              <div class="flex items-center space-x-3">
                <div class="relative w-3 h-3">
                  <div class="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-75" />
                  <div class="relative w-3 h-3 bg-indigo-600 rounded-full" />
                </div>
                <span class="text-xs font-black text-indigo-600 uppercase tracking-widest">{{ t('scan.live') }}</span>
              </div>
              <button @click="stopScanning" class="btn-ghost !text-red-500 hover:bg-red-50 !px-3 !py-1 text-[10px] font-black uppercase">
                {{ t('scan.deactivate') }}
              </button>
            </div>

            <div class="relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 aspect-square max-w-sm mx-auto">
              <div id="qr-reader" class="w-full h-full"></div>
              <!-- Futuristic Scanning Frame overlay -->
              <div class="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                <div class="w-full h-full border-2 border-indigo-500/30 relative">
                  <div class="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg" />
                  <div class="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg" />
                  <div class="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg" />
                  <div class="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg" />
                  <!-- Scanning line -->
                  <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-scan-line" />
                </div>
              </div>
            </div>
            
            <p class="text-center text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">
              {{ t('scan.align_qr') }}
            </p>
          </div>
          
          <!-- Sophisticated Result Feedback -->
          <Transition
            enter-active-class="transition duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            enter-from-class="transform translate-y-8 opacity-0 scale-95"
            enter-to-class="transform translate-y-0 opacity-100 scale-100"
          >
            <div v-if="verificationResult" class="p-8 bg-gray-50 border-t border-gray-100">
              <div v-if="verificationResult.error" class="bg-red-50 border-1 border-red-100 rounded-2xl p-6 flex items-center text-red-700">
                <div class="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 text-red-600">
                  <div class="i-carbon-error-filled text-2xl" />
                </div>
                <div>
                  <p class="font-black uppercase tracking-widest text-[10px] mb-1 text-red-500">{{ t('scan.failed') }}</p>
                  <p class="font-bold">{{ verificationResult.error }}</p>
                </div>
              </div>
              
              <div v-else class="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-900/5 border-1 border-indigo-100 relative overflow-hidden">
                <div class="relative z-10">
                  <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center space-x-4">
                      <div class="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
                        <div class="i-carbon-checkmark-filled text-3xl" />
                      </div>
                      <div>
                        <h3 class="text-xl font-black text-gray-900 tracking-tight leading-none">{{ t('scan.access_granted') }}</h3>
                        <span class="inline-block mt-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase rounded">{{ t('scan.verified_member') }}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ t('scan.entry_ref') }}</p>
                      <p class="text-sm font-mono font-bold text-gray-900 mt-1">#{{ verificationResult.registration.qr_code.substring(0,8).toUpperCase() }}</p>
                    </div>
                  </div>
                  
                  <div class="grid grid-cols-2 gap-8 mb-10 text-left">
                    <div class="space-y-1">
                      <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ t('scan.attendee') }}</p>
                      <p class="text-lg font-black text-gray-900 leading-tight">{{ verificationResult.registration.user.name }}</p>
                      <p class="text-xs font-medium text-gray-500">{{ verificationResult.registration.user.email }}</p>
                    </div>
                    <div class="space-y-1 text-right">
                      <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ t('scan.event_session') }}</p>
                      <p class="text-sm font-bold text-gray-900 line-clamp-1">{{ verificationResult.registration.session.event.title }}</p>
                      <p class="text-xs font-black text-indigo-600 uppercase tracking-tighter">{{ verificationResult.registration.session.title }}</p>
                    </div>
                  </div>
                  
                  <button
                    v-if="verificationResult.registration.status === 'confirmed'"
                    @click="performCheckIn"
                    :disabled="checkingIn"
                    class="btn-primary w-full py-5 text-lg shadow-2xl shadow-indigo-500/30"
                  >
                    <div v-if="checkingIn" class="i-carbon-progress-bar animate-spin mr-3" />
                    <div v-else class="i-carbon-login mr-3" />
                    {{ t('scan.confirm_entry') }}
                  </button>
                  
                  <div v-else-if="verificationResult.registration.status === 'checked_in'" class="py-5 px-6 bg-green-50 rounded-2xl flex items-center justify-center text-green-700 font-black text-sm border-1 border-green-100 uppercase tracking-widest">
                    <div class="i-carbon-checkmark-outline mr-3 text-xl" />
                    {{ t('scan.confirmed_entry') }}
                  </div>

                  <button @click="resetScanner" class="mt-6 w-full text-center text-[10px] font-black text-gray-400 hover:text-indigo-600 uppercase tracking-[0.3em] transition-all">
                    {{ t('scan.dismiss_next') }}
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { router } from '@inertiajs/vue3'
import { onUnmounted, ref } from 'vue'
import Layout from '../../components/Layout.vue'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()
const scanning = ref(false)

interface CheckinResponse {
  registration?: any
  error?: string
  [key: string]: any
}

const verificationResult = ref<CheckinResponse | null>(null)
const checkingIn = ref(false)
let html5QrCode: any = null
let lastScannedCode = ''

const startScanning = async () => {
  scanning.value = true
  verificationResult.value = null

  const { Html5Qrcode } = await import('html5-qrcode')
  html5QrCode = new Html5Qrcode('qr-reader')

  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 15,
        qrbox: { width: 250, height: 250 },
      },
      onScanSuccess,
      onScanFailure
    )
  } catch (error) {
    console.error('Failed to start scanner:', error)
    alert('Failed to start camera. Please check permissions.')
    scanning.value = false
  }
}

const stopScanning = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop()
    } catch (e) {}
    html5QrCode = null
  }
  scanning.value = false
  lastScannedCode = ''
}

const resetScanner = async () => {
  verificationResult.value = null
  lastScannedCode = ''
  await startScanning()
}

const onScanSuccess = async (decodedText: string) => {
  if (decodedText === lastScannedCode) return
  lastScannedCode = decodedText

  await stopScanning()

  try {
    const response = await fetch('/checkin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_code: decodedText }),
    })

    const data = (await response.json()) as any
    if (response.ok) {
      verificationResult.value = data
    } else {
      verificationResult.value = { error: data.error || 'Invalid QR code' }
    }
  } catch (error) {
    verificationResult.value = { error: 'Failed to verify QR code' }
  }
}

const onScanFailure = () => {}

const performCheckIn = async () => {
  if (!verificationResult.value?.registration) return
  checkingIn.value = true

  try {
    const response = await fetch(`/checkin/${lastScannedCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (response.ok) {
      verificationResult.value.registration.status = 'checked_in'
    } else {
      const data = (await response.json()) as any
      alert(data.error || 'Check-in failed')
    }
  } catch (error) {
    alert('Failed to perform check-in')
  } finally {
    checkingIn.value = false
  }
}

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    waitlist: 'bg-indigo-100 text-indigo-700',
    checked_in: 'bg-cyan-100 text-cyan-700',
  }
  return classes[status] || 'bg-gray-100 text-gray-700'
}

onUnmounted(() => {
  if (html5QrCode) html5QrCode.stop()
})
</script>

<style>
#qr-reader { border: none !important; }
#qr-reader video { border-radius: 1.5rem; object-fit: cover !important; }
#qr-reader__scan_region { background: black !important; }
#qr-reader__dashboard { display: none !important; }

@keyframes scan-line {
  0% { top: 0; }
  100% { top: 100%; }
}
.animate-scan-line {
  animation: scan-line 3s ease-in-out infinite;
}
</style>