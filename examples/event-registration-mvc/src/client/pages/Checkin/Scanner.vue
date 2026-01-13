<template>
  <Layout>
    <div class="bg-indigo-900 py-16 -mt-8 mb-12 relative overflow-hidden">
      <div class="absolute inset-0 opacity-10">
        <div class="i-carbon-qr-code text-9xl absolute -right-10 -bottom-10 rotate-12" />
      </div>
      <div class="container mx-auto px-6 relative z-10 text-center">
        <h1 class="text-4xl font-extrabold text-white mb-4">Event Check-in</h1>
        <p class="text-indigo-200 text-lg max-w-2xl mx-auto">
          Scan attendee QR codes to verify registrations and mark attendance in real-time.
        </p>
      </div>
    </div>

    <div class="container mx-auto px-6 pb-20">
      <div class="max-w-2xl mx-auto">
        <div class="card shadow-xl border-none">
          <div v-if="!scanning" class="text-center py-12">
            <div class="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
              <div class="i-carbon-camera text-4xl" />
            </div>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Ready to Scan?</h2>
            <p class="text-gray-500 mb-8 px-8">Point your camera at the attendee's QR code displayed on their device or printed ticket.</p>
            <button @click="startScanning" class="btn btn-primary btn-lg shadow-indigo-200">
              <div class="i-carbon-scan mr-2" />
              Activate Scanner
            </button>
          </div>
          
          <div v-else class="space-y-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-2 text-indigo-600 font-bold uppercase tracking-widest text-xs">
                <div class="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                <span>Scanner Active</span>
              </div>
              <button @click="stopScanning" class="text-xs font-bold text-red-600 hover:text-red-500 uppercase tracking-widest flex items-center">
                <div class="i-carbon-close mr-1" />
                Stop
              </button>
            </div>

            <div id="qr-reader" class="rounded-2xl overflow-hidden ring-4 ring-gray-50 shadow-inner"></div>
            
            <p class="text-center text-gray-400 text-xs italic">
              Position the QR code within the frame to scan
            </p>
          </div>
          
          <!-- Verification Result Overlay/Section -->
          <Transition
            enter-active-class="transition duration-300 ease-out"
            enter-from-class="transform translate-y-4 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
          >
            <div v-if="verificationResult" class="mt-8 pt-8 border-t border-gray-100">
              <div
                v-if="verificationResult.error"
                class="alert-error"
              >
                <div class="i-carbon-error-filled mr-3 text-xl" />
                <span class="font-bold">{{ verificationResult.error }}</span>
              </div>
              
              <div v-else class="bg-indigo-50 rounded-2xl p-8 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div class="i-carbon-user-avatar text-7xl text-indigo-900" />
                </div>

                <div class="flex items-center space-x-4 mb-6">
                  <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <div class="i-carbon-checkmark-filled text-2xl" />
                  </div>
                  <div>
                    <h3 class="text-xl font-bold text-gray-900 leading-tight">Registration Verified</h3>
                    <p class="text-xs text-indigo-600 font-bold uppercase tracking-wider">Valid Ticket Found</p>
                  </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div class="space-y-4">
                    <div>
                      <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Attendee Name</p>
                      <p class="text-sm font-bold text-gray-900">{{ verificationResult.registration.user.name }}</p>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Event</p>
                      <p class="text-sm font-bold text-gray-900">{{ verificationResult.registration.session.event.title }}</p>
                    </div>
                  </div>
                  <div class="space-y-4">
                    <div>
                      <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Status</p>
                      <span 
                        class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter"
                        :class="getStatusClasses(verificationResult.registration.status)"
                      >
                        {{ verificationResult.registration.status }}
                      </span>
                    </div>
                    <div>
                      <p class="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Session</p>
                      <p class="text-sm font-bold text-gray-900">{{ verificationResult.registration.session.title }}</p>
                    </div>
                  </div>
                </div>
                
                <button
                  v-if="verificationResult.registration.status === 'confirmed'"
                  @click="performCheckIn"
                  :disabled="checkingIn"
                  class="btn btn-primary w-full py-4 shadow-indigo-200"
                >
                  <div v-if="checkingIn" class="i-carbon-progress-bar animate-spin mr-2" />
                  <div v-else class="i-carbon-login mr-2" />
                  Confirm Entry
                </button>
                
                <div v-else-if="verificationResult.registration.status === 'checked_in'" class="p-4 bg-green-100 rounded-xl flex items-center justify-center text-green-700 font-bold text-sm">
                  <div class="i-carbon-checkmark-outline mr-2" />
                  ALREADY CHECKED IN
                </div>

                <div v-else class="p-4 bg-red-100 rounded-xl flex items-center justify-center text-red-700 font-bold text-sm uppercase tracking-wide">
                  <div class="i-carbon-warning mr-2" />
                  Cannot check in: {{ verificationResult.registration.status }}
                </div>

                <button @click="resetScanner" class="mt-4 w-full text-center text-xs font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">
                  Scan Next Attendee
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { router } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';

const scanning = ref(false);
const verificationResult = ref<any>(null);
const checkingIn = ref(false);
let html5QrCode: any = null;
let lastScannedCode = '';

const startScanning = async () => {
  scanning.value = true;
  verificationResult.value = null;
  
  const { Html5Qrcode } = await import('html5-qrcode');
  html5QrCode = new Html5Qrcode('qr-reader');
  
  try {
    await html5QrCode.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      onScanSuccess,
      onScanFailure
    );
  } catch (error) {
    console.error('Failed to start scanner:', error);
    alert('Failed to start camera. Please check permissions.');
    scanning.value = false;
  }
};

const stopScanning = async () => {
  if (html5QrCode) {
    try {
      await html5QrCode.stop();
    } catch (e) {}
    html5QrCode = null;
  }
  scanning.value = false;
  lastScannedCode = '';
};

const resetScanner = async () => {
  verificationResult.value = null;
  lastScannedCode = '';
  await startScanning();
};

const onScanSuccess = async (decodedText: string) => {
  if (decodedText === lastScannedCode) return;
  lastScannedCode = decodedText;
  
  await stopScanning();
  
  try {
    const response = await fetch('/checkin/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ qr_code: decodedText }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      verificationResult.value = data;
    } else {
      verificationResult.value = { error: data.error || 'Invalid QR code' };
    }
  } catch (error) {
    verificationResult.value = { error: 'Failed to verify QR code' };
  }
};

const onScanFailure = (error: string) => {};

const performCheckIn = async () => {
  if (!verificationResult.value?.registration) return;
  
  checkingIn.value = true;
  
  try {
    const response = await fetch(`/checkin/${lastScannedCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      alert('Check-in successful!');
      verificationResult.value.registration.status = 'checked_in';
    } else {
      const data = await response.json();
      alert(data.error || 'Check-in failed');
    }
  } catch (error) {
    alert('Failed to perform check-in');
  } finally {
    checkingIn.value = false;
  }
};

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700',
    pending: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
    waitlist: 'bg-indigo-100 text-indigo-700',
    checked_in: 'bg-cyan-100 text-cyan-700',
  };
  return classes[status] || 'bg-gray-100 text-gray-700';
};

onUnmounted(() => {
  if (html5QrCode) {
    html5QrCode.stop();
  }
});
</script>

<style>
#qr-reader {
  border: none !important;
}
#qr-reader__scan_region {
  background: white;
}
#qr-reader__dashboard {
  display: none !important;
}
</style>
