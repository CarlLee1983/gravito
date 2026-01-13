<template>
  <div class="min-h-screen flex flex-col bg-gray-50 text-gray-900 font-sans">
    <!-- Header -->
    <header class="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
      <div class="container mx-auto px-4 sm:px-6">
        <div class="flex justify-between items-center h-16">
          <!-- Logo -->
          <Link href="/" class="flex items-center space-x-2 group">
            <div class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <div class="i-carbon-event text-white text-xl" />
            </div>
            <span class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
              Gravito Events
            </span>
          </Link>
          
          <!-- Navigation -->
          <nav class="hidden md:flex items-center space-x-1">
            <Link 
              href="/events" 
              class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              :class="{ 'text-indigo-600 bg-indigo-50': $page.url === '/events' }"
            >
              {{ t('common.explore') }}
            </Link>
            
            <div class="h-4 w-px bg-gray-200 mx-2" />

            <!-- Language Switcher -->
            <div class="flex items-center bg-gray-100 rounded-lg p-1 mr-2">
              <Link 
                :href="`${$page.url}${ $page.url.includes('?') ? '&' : '?' }lang=en`"
                class="px-2 py-1 text-[10px] font-bold rounded transition-all"
                :class="getLocale() === 'en' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              >
                EN
              </Link>
              <Link 
                :href="`${$page.url}${ $page.url.includes('?') ? '&' : '?' }lang=zh-TW`"
                class="px-2 py-1 text-[10px] font-bold rounded transition-all"
                :class="getLocale() === 'zh-TW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'"
              >
                繁中
              </Link>
            </div>

            <template v-if="$page.props.auth.user">
              <Link 
                href="/profile" 
                class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                :class="{ 'text-indigo-600 bg-indigo-50': $page.url.startsWith('/profile') }"
              >
                {{ t('common.my_registrations') }}
              </Link>
              
              <Link
                v-if="$page.props.auth.user.role === 'admin'"
                href="/admin"
                class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                {{ t('common.dashboard') }}
              </Link>
              
              <Link 
                href="/logout" 
                method="post" 
                as="button"
                class="ml-4 btn btn-secondary text-sm"
              >
                {{ t('common.logout') }}
              </Link>
            </template>
            
            <template v-else>
              <Link href="/login" class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">
                {{ t('common.login') }}
              </Link>
              <Link href="/register" class="ml-2 btn btn-primary text-sm">
                {{ t('common.get_started') }}
              </Link>
            </template>
          </nav>

          <!-- Mobile Menu Button -->
          <button class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            <div class="i-carbon-menu text-2xl" />
          </button>
        </div>
      </div>
    </header>

    <!-- Flash Messages -->
    <div class="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
      <TransitionGroup
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0"
      >
        <div v-if="$page.props.flash.success" key="success" class="alert-success shadow-lg pointer-events-auto mb-2">
          <div class="i-carbon-checkmark-filled mr-3 text-xl" />
          <span class="text-sm font-medium">{{ $page.props.flash.success }}</span>
        </div>
        
        <div v-if="$page.props.flash.error" key="error" class="alert-error shadow-lg pointer-events-auto mb-2">
          <div class="i-carbon-error-filled mr-3 text-xl" />
          <span class="text-sm font-medium">{{ $page.props.flash.error }}</span>
        </div>
      </TransitionGroup>
    </div>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-100 py-12">
      <div class="container mx-auto px-6">
        <div class="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div class="flex items-center space-x-2">
            <div class="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center">
              <div class="i-carbon-event text-white text-xs" />
            </div>
            <span class="font-bold text-gray-900">Gravito Events</span>
          </div>
          <p class="text-sm text-gray-500">
            &copy; 2026 Gravito Framework. All rights reserved.
          </p>
          <div class="flex space-x-6">
            <a href="#" class="text-gray-400 hover:text-indigo-600 transition-colors"><div class="i-carbon-logo-twitter" /></a>
            <a href="#" class="text-gray-400 hover:text-indigo-600 transition-colors"><div class="i-carbon-logo-github" /></a>
            <a href="#" class="text-gray-400 hover:text-indigo-600 transition-colors"><div class="i-carbon-logo-linkedin" /></a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
import { useI18n } from '../composables/useI18n';

const { t, getLocale } = useI18n();
</script>
