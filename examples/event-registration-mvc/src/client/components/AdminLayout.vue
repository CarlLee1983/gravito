<template>
  <div class="min-h-screen bg-gray-50 flex font-sans">
    <!-- Sidebar -->
    <aside class="w-64 bg-gray-900 text-white flex flex-col sticky top-0 h-screen overflow-y-auto transition-all">
      <div class="p-6">
        <Link href="/admin" class="flex items-center space-x-3 group">
          <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
            <div class="i-carbon-settings text-white text-xl" />
          </div>
          <span class="text-xl font-bold tracking-tight">Admin Portal</span>
        </Link>
      </div>

      <nav class="flex-1 px-4 space-y-1 text-sm">
        <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 mb-2 mt-6">Main Menu</div>
        <Link 
          href="/admin" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors"
          :class="$page.url === '/admin' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <div class="i-carbon-dashboard text-xl" />
          <span class="font-medium">{{ t('common.dashboard') }}</span>
        </Link>

        <Link 
          href="/admin/events" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors"
          :class="$page.url.startsWith('/admin/events') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <div class="i-carbon-calendar text-xl" />
          <span class="font-medium">Events</span>
        </Link>

        <Link 
          href="/admin/registrations" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors"
          :class="$page.url.startsWith('/admin/registrations') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <div class="i-carbon-user-identification text-xl" />
          <span class="font-medium">Registrations</span>
        </Link>

        <Link 
          href="/admin/users" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors"
          :class="$page.url.startsWith('/admin/users') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-white'"
        >
          <div class="i-carbon-group text-xl" />
          <span class="font-medium">Users</span>
        </Link>

        <div class="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-4 mb-2 mt-8">System</div>
        
        <!-- Language Switcher -->
        <div class="flex items-center space-x-1 px-4 py-2 bg-gray-800/50 rounded-xl mx-2 mb-2">
          <Link 
            :href="`${$page.url}${ $page.url.includes('?') ? '&' : '?' }lang=en`"
            class="flex-1 text-center py-1 text-[10px] font-bold rounded transition-all"
            :class="getLocale() === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
          >
            EN
          </Link>
          <Link 
            :href="`${$page.url}${ $page.url.includes('?') ? '&' : '?' }lang=zh-TW`"
            class="flex-1 text-center py-1 text-[10px] font-bold rounded transition-all"
            :class="getLocale() === 'zh-TW' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'"
          >
            繁中
          </Link>
        </div>

        <Link 
          href="/" 
          class="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <div class="i-carbon-launch text-xl" />
          <span class="font-medium">View Live Site</span>
        </Link>
      </nav>

      <div class="p-4 border-t border-gray-800">
        <div class="flex items-center space-x-3 px-4 py-3 mb-2">
          <div class="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold uppercase border-1 border-indigo-500/30">
            {{ $page.props.auth.user.name.substring(0, 2) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-white truncate">{{ $page.props.auth.user.name }}</p>
            <p class="text-[10px] text-gray-500 truncate">{{ $page.props.auth.user.role }}</p>
          </div>
        </div>
        <Link 
          href="/logout" 
          method="post" 
          as="button"
          class="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-red-900/30 hover:text-red-400 text-gray-400 transition-all text-sm font-medium"
        >
          <div class="i-carbon-logout" />
          <span>{{ t('common.logout') }}</span>
        </Link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Top Header -->
      <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <h2 class="text-sm font-bold text-gray-400 uppercase tracking-widest">
          {{ getPageTitle() }}
        </h2>
        <div class="flex items-center space-x-4">
          <button class="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
            <div class="i-carbon-notification text-xl" />
            <div class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <div class="h-6 w-px bg-gray-200 mx-2" />
          <div class="text-xs font-medium text-gray-500">
            Gravito v1.0.0
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto p-8">
        <!-- Flash Messages -->
        <TransitionGroup
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform -translate-y-4 opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
        >
          <div v-if="$page.props.flash.success" key="success" class="alert-success shadow-sm mb-8">
            <div class="i-carbon-checkmark-filled mr-3 text-xl" />
            <span class="text-sm font-medium">{{ $page.props.flash.success }}</span>
          </div>
          
          <div v-if="$page.props.flash.error" key="error" class="alert-error shadow-sm mb-8">
            <div class="i-carbon-error-filled mr-3 text-xl" />
            <span class="text-sm font-medium">{{ $page.props.flash.error }}</span>
          </div>
        </TransitionGroup>

        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3';
import { useI18n } from '../composables/useI18n';

const { t, getLocale } = useI18n();
const page = usePage();

const getPageTitle = () => {
  const url = page.url;
  if (url === '/admin') return t('common.dashboard');
  if (url.startsWith('/admin/events')) return 'Event Management';
  if (url.startsWith('/admin/registrations')) return 'Registration Records';
  if (url.startsWith('/admin/users')) return 'User Management';
  return 'Admin';
};
</script>
