<template>
  <Layout>
    <div class="bg-indigo-600 py-16 -mt-8 mb-12">
      <div class="container mx-auto px-6">
        <div class="max-w-2xl text-white">
          <h1 class="text-4xl font-extrabold mb-4">{{ t('events.discover') }}</h1>
          <p class="text-indigo-100 text-lg">
            {{ t('events.subtitle') }}
          </p>
        </div>
      </div>
    </div>

    <div class="container mx-auto px-6 pb-20">
      <div v-if="events.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div
          v-for="event in events"
          :key="event.id"
          class="card group overflow-hidden flex flex-col hover:shadow-xl transition-all"
        >
          <!-- Image -->
          <div class="relative h-56 -mt-6 -mx-6 mb-6 overflow-hidden">
            <img
              v-if="event.image_url"
              :src="event.image_url"
              :alt="event.title"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div v-else class="w-full h-full bg-indigo-100 flex items-center justify-center">
              <div class="i-carbon-image text-4xl text-indigo-300" />
            </div>
            <!-- Status Badge -->
            <div class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm text-xs font-bold text-indigo-600 uppercase tracking-wider">
              {{ event.status }}
            </div>
          </div>
          
          <div class="flex-1 flex flex-col">
            <h2 class="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors mb-2">
              {{ event.title }}
            </h2>
            
            <div class="flex items-center text-gray-500 text-sm mb-4 space-x-4">
              <div class="flex items-center">
                <div class="i-carbon-location mr-1" />
                {{ event.location }}
              </div>
            </div>

            <p class="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
              {{ truncate(event.description, 150) }}
            </p>
            
            <div class="mt-auto pt-6 border-t border-gray-100 flex flex-col space-y-4">
              <div class="flex items-center justify-between text-xs font-medium uppercase tracking-widest text-gray-400">
                <span>{{ t('events.registration_closes') }}</span>
                <span class="text-gray-900">{{ formatDate(event.registration_end) }}</span>
              </div>
              
              <Link :href="`/events/${event.id}`" class="btn btn-primary w-full group">
                {{ t('events.reserve_spot') }}
                <div class="i-carbon-chevron-right ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-20 card bg-white">
        <div class="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
          <div class="i-carbon-calendar text-4xl" />
        </div>
        <h3 class="text-xl font-bold text-gray-900 mb-2">No events found</h3>
        <p class="text-gray-500">Check back later for new event listings.</p>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

defineProps<{
  events: any[];
}>();

const truncate = (text: string, length: number) => {
  return text.length > length ? text.substring(0, length) + '...' : text;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};
</script>
