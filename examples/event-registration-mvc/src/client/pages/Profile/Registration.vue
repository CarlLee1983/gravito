<template>
  <Layout>
    <div class="max-w-3xl mx-auto py-20 px-4 transition-colors duration-500">
      <Link href="/profile" class="inline-flex items-center text-brand-600 dark:text-brand-400 hover:text-brand-500 font-black text-xs uppercase tracking-widest mb-10 group">
        <div class="i-carbon-arrow-left mr-2 group-hover:-translate-x-1 transition-transform" />
        {{ t('profile_reg.back') }}
      </Link>
      
      <div class="bg-card shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] dark:shadow-black/50 border-none rounded-[3rem] overflow-hidden transition-all duration-500">
        <!-- Ticket Header -->
        <div class="bg-indigo-600 dark:bg-indigo-900 p-10 text-white relative">
          <!-- Pattern -->
          <div class="absolute inset-0 opacity-10 pointer-events-none">
            <div class="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:24px_24px]" />
          </div>
          
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 text-left">
            <div class="space-y-3">
              <div class="inline-flex px-2 py-0.5 rounded bg-white/20 text-[10px] font-black uppercase tracking-[0.2em] border-1 border-white/10">
                {{ t('profile_reg.official_entry') }}
              </div>
              <h1 class="text-3xl md:text-4xl font-black tracking-tighter leading-none">{{ registration.session.event.title }}</h1>
              <p class="text-indigo-100 text-lg font-bold opacity-90">{{ registration.session.title }}</p>
            </div>
            <div 
              class="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border-1 border-white/10"
              :class="getStatusClasses(registration.status)"
            >
              {{ registration.status }}
            </div>
          </div>
        </div>

        <!-- Ticket Body -->
        <div class="p-10 space-y-12 bg-card relative">
          <!-- Perforated Line Decoration -->
          <div class="absolute top-0 left-0 w-full flex justify-between -translate-y-1/2 px-6 pointer-events-none">
            <div class="w-8 h-8 rounded-full bg-base -ml-14 border-r border-gray-100 dark:border-white/5" />
            <div class="flex-1 border-t-2 border-dashed border-gray-100 dark:border-white/10 mt-4 mx-4" />
            <div class="w-8 h-8 rounded-full bg-base -mr-14 border-l border-gray-100 dark:border-white/5" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
            <div class="space-y-2">
              <p class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.3em]">{{ t('profile_reg.location') }}</p>
              <p class="text-base font-black text-gray-900 dark:text-white leading-tight">{{ registration.session.event.location }}</p>
            </div>
            <div class="space-y-2 md:text-right">
              <p class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.3em]">{{ t('profile_reg.date') }}</p>
              <p class="text-base font-black text-gray-900 dark:text-white leading-tight">{{ formatDateTime(registration.session.start_time) }}</p>
            </div>
          </div>

          <!-- Info Details -->
          <div v-if="registration.values?.length" class="bg-soft rounded-[2rem] p-8 border-1 border-gray-100 dark:border-white/5">
            <h3 class="text-[10px] font-black text-gray-400 dark:text-slate-600 uppercase tracking-[0.3em] mb-6">{{ t('profile_reg.attendee') }}</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6 text-left">
              <div v-for="value in registration.values" :key="value.id" class="group">
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400/60 font-black uppercase tracking-widest mb-1">{{ value.field.label }}</p>
                <p class="text-sm font-black text-gray-900 dark:text-white group-hover:translate-x-1 transition-transform">{{ value.value }}</p>
              </div>
            </div>
          </div>

          <!-- QR Code Section -->
          <div v-if="registration.status === 'confirmed' || registration.status === 'checked_in'" class="text-center pt-6">
            <div class="inline-block p-6 bg-white dark:bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-900/10 mb-8 relative group">
              <QrCodeDisplay
                :value="registration.qr_code"
                :label="`QR Code ID: ${registration.qr_code.substring(0,8).toUpperCase()}`"
                :downloadable="true"
                :filename="`registration-${registration.id}.png`"
              />
            </div>
            <p class="text-sm font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tighter">{{ t('profile_reg.verified_ticket') }}</p>
            <p class="text-xs text-gray-500 dark:text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
              {{ t('profile_reg.scan_instruction') }}
            </p>
          </div>
          
          <div v-else class="py-16 bg-amber-50 dark:bg-amber-950/20 rounded-[2.5rem] border-1 border-dashed border-amber-200 dark:border-amber-900/30 text-center">
            <div class="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-amber-600">
              <div class="i-carbon-warning-alt text-3xl" />
            </div>
            <p class="text-amber-900 dark:text-amber-200 font-black text-lg tracking-tight mb-2">{{ t('profile_reg.pending') }}</p>
            <p class="text-amber-700/70 dark:text-amber-400/50 text-xs font-medium px-12 leading-relaxed">
              {{ t('profile_reg.pending_desc') }}
            </p>
          </div>
        </div>

        <!-- Ticket Footer -->
        <div class="bg-gray-50 dark:bg-black/20 p-8 flex justify-between items-center border-t border-gray-100 dark:border-white/5">
          <div class="flex items-center space-x-3 opacity-40">
            <div class="w-6 h-6 bg-brand-600 rounded-lg flex items-center justify-center">
              <div class="i-carbon-event text-white text-[10px]" />
            </div>
            <span class="text-[10px] font-black text-gray-900 dark:text-white tracking-[0.2em]">{{ t('profile_reg.security') }}</span>
          </div>
          <div class="text-[10px] font-mono font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">
            ID: {{ registration.qr_code }}
          </div>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

defineProps<{
  registration: any
}>()

const formatDateTime = (date: string) => {
  return new Date(date).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusClasses = (status: string) => {
  const classes: Record<string, string> = {
    confirmed: 'bg-white/20 text-white',
    pending: 'bg-amber-500/20 text-amber-200',
    cancelled: 'bg-red-500/20 text-red-200',
    waitlist: 'bg-indigo-500/20 text-indigo-200',
    checked_in: 'bg-cyan-500/20 text-cyan-200',
  }
  return classes[status] || 'bg-white/10 text-white'
}
</script>