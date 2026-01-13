<template>
  <Layout>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-white py-20 lg:py-32">
      <!-- Decorative background -->
      <div class="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-128 h-128 bg-indigo-50 rounded-full blur-3xl opacity-50 pointer-events-none" />
      <div class="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-128 h-128 bg-cyan-50 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div class="container mx-auto px-6 relative z-10 text-center lg:text-left">
        <div class="flex flex-col lg:flex-row items-center justify-between gap-12">
          <div class="lg:w-1/2 space-y-8">
            <div class="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold tracking-wide uppercase">
              🚀 Powering Next-Gen Events
            </div>
            <h1 class="text-5xl lg:text-7xl font-extrabold tracking-tight text-gray-900 leading-tight">
              {{ t('common.welcome').split(' to ')[0] }} <br />
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600">
                {{ t('common.welcome').split(' to ')[1] || 'Incredible Events' }}
              </span>
            </h1>
            <p class="text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              The ultimate platform for event organization, registration, and management. 
              Built for scale, speed, and seamless user experience.
            </p>
            <div class="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-4">
              <Link href="/events" class="btn btn-primary btn-lg group">
                {{ t('common.browse_events') }}
                <div class="i-carbon-arrow-right ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/register" class="btn btn-secondary btn-lg">
                {{ t('common.register') }}
              </Link>
            </div>
            
            <!-- Trust badges -->
            <div class="pt-8 border-t border-gray-100 flex flex-wrap justify-center lg:justify-start gap-8 items-center opacity-50">
              <span class="font-semibold text-gray-400 grayscale contrast-200">TRUSTED BY</span>
              <div class="i-carbon-logo-github text-3xl" />
              <div class="i-carbon-logo-google text-3xl" />
              <div class="i-carbon-logo-slack text-3xl" />
            </div>
          </div>

          <div class="lg:w-1/2 relative">
            <div class="relative z-10 card p-2 bg-indigo-100/50 backdrop-blur shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <img 
                src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
                alt="Conference" 
                class="rounded-lg shadow-inner w-full object-cover aspect-video"
              />
            </div>
            <!-- Floating element -->
            <div class="absolute -bottom-6 -left-6 z-20 card p-4 flex items-center space-x-4 animate-bounce-in animate-duration-1000">
              <div class="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <div class="i-carbon-checkmark-filled text-green-600 text-2xl" />
              </div>
              <div>
                <p class="text-sm font-bold text-gray-900">Registration Confirmed!</p>
                <p class="text-xs text-gray-500">Ticket sent to your email</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features -->
    <section class="py-20 bg-gray-50">
      <div class="container mx-auto px-6">
        <div class="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h2 class="text-3xl font-bold text-gray-900">Everything you need to manage events</h2>
          <p class="text-gray-600">Powerful features built directly into the core framework.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="card hover:border-indigo-200 hover:-translate-y-1 transition-all">
            <div class="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
              <div class="i-carbon-task text-indigo-600 text-2xl" />
            </div>
            <h3 class="text-xl font-bold mb-3">Dynamic Forms</h3>
            <p class="text-gray-600 leading-relaxed">
              Custom fields for every event. Collect exactly the information you need from your attendees.
            </p>
          </div>

          <div class="card hover:border-indigo-200 hover:-translate-y-1 transition-all">
            <div class="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-6">
              <div class="i-carbon-qr-code text-cyan-600 text-2xl" />
            </div>
            <h3 class="text-xl font-bold mb-3">QR Check-in</h3>
            <p class="text-gray-600 leading-relaxed">
              Speed up entry with instant QR code generation and scanning. Real-time attendance tracking.
            </p>
          </div>

          <div class="card hover:border-indigo-200 hover:-translate-y-1 transition-all">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
              <div class="i-carbon-send text-purple-600 text-2xl" />
            </div>
            <h3 class="text-xl font-bold mb-3">Instant Notifications</h3>
            <p class="text-gray-600 leading-relaxed">
              Automated confirmation emails and reminders powered by @gravito/signal.
            </p>
          </div>
        </div>
      </div>
    </section>
  </Layout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Layout from '../components/Layout.vue';
import { useI18n } from '../composables/useI18n';

const { t } = useI18n();
</script>
