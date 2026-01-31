<script setup lang="ts">
import { usePage } from '@inertiajs/vue3'
import { computed, ref } from 'vue'

const page = usePage()
const isSidebarOpen = ref(true)
const auth = computed(() => page.props.auth as any)

const menuItems = [
  { name: '儀表板', href: '/admin', icon: 'i-heroicons-home' },
  { name: '商品管理', href: '/admin/products', icon: 'i-heroicons-cube' },
  { name: '分類管理', href: '/admin/categories', icon: 'i-heroicons-tag' },
  { name: '訂單管理', href: '/admin/orders', icon: 'i-heroicons-shopping-bag' },
  { name: '用戶管理', href: '/admin/users', icon: 'i-heroicons-users' },
]

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const isActive = (href: string) => {
  const url = page.url
  if (href === '/admin') {
    return url === '/admin'
  }
  return url.startsWith(href)
}
</script>

<template>
  <div class="min-h-screen flex bg-gray-100 dark:bg-gray-900">
    <!-- Sidebar -->
    <aside
      :class="isSidebarOpen ? 'w-64' : 'w-20'"
      class="bg-gray-800 text-white transition-all duration-300 flex flex-col"
    >
      <!-- Logo -->
      <div class="h-16 flex items-center justify-center border-b border-gray-700">
        <Link href="/admin" class="flex items-center gap-2">
          <span class="i-heroicons-cog-6-tooth text-2xl text-primary"></span>
          <span v-if="isSidebarOpen" class="font-bold">後台管理</span>
        </Link>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 p-4 space-y-2">
        <Link
          v-for="item in menuItems"
          :key="item.href"
          :href="item.href"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
            isActive(item.href)
              ? 'bg-primary text-white'
              : 'hover:bg-gray-700'
          ]"
        >
          <span :class="item.icon" class="text-xl"></span>
          <span v-if="isSidebarOpen">{{ item.name }}</span>
        </Link>
      </nav>

      <!-- Back to Shop -->
      <div class="p-4 border-t border-gray-700">
        <Link href="/" class="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-700">
          <span class="i-heroicons-arrow-left text-xl"></span>
          <span v-if="isSidebarOpen">返回商店</span>
        </Link>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col">
      <!-- Top Bar -->
      <header class="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6">
        <button @click="toggleSidebar" class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <span class="i-heroicons-bars-3 text-xl"></span>
        </button>

        <div class="flex items-center gap-4">
          <span class="text-sm text-gray-600 dark:text-gray-300">{{ auth?.user?.name }}</span>
          <Link
            href="/logout"
            method="post"
            as="button"
            class="btn btn-sm btn-ghost text-red-500"
          >
            登出
          </Link>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 p-6 overflow-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
