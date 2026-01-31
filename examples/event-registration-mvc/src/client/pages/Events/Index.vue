<template>
  <Layout>
    <div class="bg-indigo-600 dark:bg-indigo-950 py-20 -mt-8 mb-12 relative overflow-hidden transition-colors duration-500">
      <div class="absolute inset-0 opacity-20 pointer-events-none">
        <div class="absolute inset-0 bg-[radial-gradient(white_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>
      <div class="container-wide relative z-10 text-left">
        <div class="max-w-2xl text-white">
          <h1 class="text-4xl md:text-5xl font-black mb-4 tracking-tighter">{{ t('events.discover') }}</h1>
          <p class="text-indigo-100 text-lg font-medium opacity-80 leading-relaxed">
            {{ t('events.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <div class="container-wide pb-32">
      <div v-if="events.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <div
          v-for="event in events"
          :key="event.id"
          class="card-interactive overflow-hidden flex flex-col bg-card border-none ring-1 ring-gray-100 dark:ring-white/5 transition-all duration-500"
        >
          <!-- Image -->
          <div class="relative h-64 overflow-hidden">
            <img
              v-if="event.image_url"
              :src="event.image_url"
              :alt="event.title"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            />
            <div v-else class="w-full h-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <div class="i-carbon-image text-5xl text-indigo-300 dark:text-indigo-700" />
            </div>
            <!-- Status Badge -->
            <div class="absolute top-4 right-4 glass px-3 py-1.5 rounded-full shadow-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest border-1 border-white/20">
              {{ event.status }}
            </div>
          </div>
          
          <div class="p-8 flex-1 flex flex-col text-left">
            <h2 class="text-2xl font-black text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors mb-3 leading-tight tracking-tight">
              {{ event.title }}
            </h2>
            
            <div class="flex items-center text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 space-x-4">
              <div class="flex items-center">
                <div class="i-carbon-location mr-2 text-brand-500" />
                {{ event.location }}
              </div>
            </div>

            <p class="text-gray-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-8 line-clamp-3">
              {{ truncate(event.description, 150) }}
            </p>
            
            <div class="mt-auto pt-8 border-t border-gray-100 dark:border-white/5 flex flex-col space-y-5">
              <div class="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-slate-500">
                <span>{{ t('events.registration_closes') }}</span>
                <span class="text-gray-900 dark:text-white">{{ formatDate(event.registration_end) }}</span>
              </div>
              
              <Link :href="`/events/${event.id}`" class="btn-primary w-full group py-4">
                {{ t('events.reserve_spot') }}
                <div class="i-carbon-chevron-right ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-32 bg-card rounded-[3rem] border-1 border-dashed border-gray-200 dark:border-white/10">
        <div class="w-24 h-24 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-300 dark:text-gray-700">
          <div class="i-carbon-calendar text-5xl" />
        </div>
        <h3 class="text-2xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">{{ t('events.no_events') }}</h3>
        <p class="text-gray-500 dark:text-slate-500 font-medium">{{ t('events.check_back') }}</p>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

defineProps<{
  events: any[]
}>()

const truncate = (text: string, length: number) => {
  return text.length > length ? `${text.substring(0, length)}...` : text
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>