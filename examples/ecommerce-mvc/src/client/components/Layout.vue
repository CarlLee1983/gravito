<script setup lang="ts">
import { ref, computed } from 'vue'
import { Link, usePage, router } from '@inertiajs/vue3'
import { useI18n } from '../composables/useI18n'

const { t, locale } = useI18n()
const page = usePage()
const isMenuOpen = ref(false)
const isUserMenuOpen = ref(false)

const auth = computed(() => page.props.auth as any)
const cart = computed(() => page.props.cart as any)
const categories = computed(() => (page.props.categories || []) as any[])

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
  if (isUserMenuOpen.value) isLangMenuOpen.value = false
}

const isLangMenuOpen = ref(false)
const toggleLangMenu = () => {
  isLangMenuOpen.value = !isLangMenuOpen.value
  if (isLangMenuOpen.value) isUserMenuOpen.value = false
}

const switchLanguage = (lang: string) => {
  router.visit(window.location.pathname, {
    data: { lang },
    preserveState: true,
  })
  isLangMenuOpen.value = false
}

const languages = [
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' }
]

const currentLanguageName = computed(() => {
  return languages.find(l => l.code === locale.value)?.name || locale.value
})
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <header class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-200/50 dark:border-gray-800/50 transition-colors duration-300">
      <div class="container">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <Link href="/" class="flex items-center gap-2 text-xl font-bold text-primary">
            <span class="i-heroicons-shopping-bag text-2xl"></span>
            <span>Gravito Shop</span>
          </Link>

          <!-- Desktop Navigation -->
          <nav class="hidden md:flex items-center gap-6">
            <Link href="/" class="nav-link">{{ t('nav.home') }}</Link>
            <Link href="/products" class="nav-link">{{ t('nav.products') }}</Link>
            <Link href="/pages/news" class="nav-link">{{ t('news.title') }}</Link>
            <div v-for="category in categories.slice(0, 5)" :key="category.id">
              <Link :href="`/category/${category.slug}`" class="nav-link">
                {{ category.name }}
              </Link>
            </div>
          </nav>

          <!-- Right Actions -->
          <div class="flex items-center gap-4">
            <!-- Language Switcher -->
            <div class="relative">
              <button
                @click="toggleLangMenu"
                class="flex items-center gap-1 p-2 text-gray-500 hover:text-primary transition-colors text-sm"
              >
                <span class="i-heroicons-language text-xl"></span>
                <span class="hidden lg:inline">{{ currentLanguageName }}</span>
              </button>
              
              <div
                v-if="isLangMenuOpen"
                class="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50"
              >
                <button
                  v-for="lang in languages"
                  :key="lang.code"
                  @click="switchLanguage(lang.code)"
                  class="flex items-center w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  :class="{ 'text-primary font-bold': locale === lang.code }"
                >
                  {{ lang.name }}
                </button>
              </div>
            </div>

            <!-- Search -->
            <Link href="/search" class="p-2 text-gray-500 hover:text-primary transition-colors">
              <span class="i-heroicons-magnifying-glass text-xl"></span>
            </Link>

            <!-- Cart -->
            <Link href="/cart" class="relative p-2 text-gray-500 hover:text-primary transition-colors">
              <span class="i-heroicons-shopping-cart text-xl"></span>
              <span v-if="cart?.item_count > 0" class="cart-badge">{{ cart.item_count }}</span>
            </Link>

            <!-- User Menu -->
            <div v-if="auth?.isAuthenticated" class="relative">
              <button
                @click="toggleUserMenu"
                class="flex items-center gap-2 p-2 text-gray-500 hover:text-primary transition-colors"
              >
                <span class="i-heroicons-user-circle text-xl"></span>
                <span class="hidden md:inline text-sm">{{ auth.user?.name }}</span>
              </button>
              
              <!-- Dropdown -->
              <div
                v-if="isUserMenuOpen"
                class="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2"
              >
                <Link href="/account/profile" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {{ t('nav.profile') }}
                </Link>
                <Link href="/account/orders" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {{ t('nav.orders') }}
                </Link>
                <Link href="/account/wishlist" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {{ t('nav.wishlist') }}
                </Link>
                <Link href="/account/addresses" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                  {{ t('nav.addresses') }}
                </Link>
                <template v-if="auth.user?.role === 'admin'">
                  <hr class="my-2 border-gray-200 dark:border-gray-700">
                  <Link href="/admin" class="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-primary">
                    {{ t('nav.admin') }}
                  </Link>
                </template>
                <hr class="my-2 border-gray-200 dark:border-gray-700">
                <Link href="/logout" method="post" as="button" class="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-500">
                  {{ t('nav.logout') }}
                </Link>
              </div>
            </div>
            <template v-else>
              <Link href="/login" class="btn btn-sm btn-ghost">{{ t('nav.login') }}</Link>
              <Link href="/register" class="btn btn-sm btn-primary hidden md:inline-flex">{{ t('nav.register') }}</Link>
            </template>

            <!-- Mobile Menu Toggle -->
            <button @click="toggleMenu" class="md:hidden p-2">
              <span :class="isMenuOpen ? 'i-heroicons-x-mark' : 'i-heroicons-bars-3'" class="text-xl"></span>
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        <nav v-if="isMenuOpen" class="md:hidden pb-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <Link href="/" class="block py-2">{{ t('nav.home') }}</Link>
          <Link href="/products" class="block py-2">{{ t('nav.products') }}</Link>
          <Link href="/pages/news" class="block py-2">{{ t('news.title') }}</Link>
          <div v-for="category in categories" :key="category.id">
            <Link :href="`/category/${category.slug}`" class="block py-2">{{ category.name }}</Link>
          </div>
        </nav>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="bg-gray-800 text-gray-300 py-12 mt-auto">
      <div class="container">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 class="text-lg font-semibold text-white mb-4">{{ t('footer.about_title') }}</h3>
            <p class="text-sm">{{ t('footer.about_desc') }}</p>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">{{ t('footer.quick_links') }}</h4>
            <ul class="space-y-2 text-sm">
              <li><Link href="/" class="hover:text-white">{{ t('nav.home') }}</Link></li>
              <li><Link href="/products" class="hover:text-white">{{ t('nav.products') }}</Link></li>
              <li><Link href="/pages/news" class="hover:text-white">{{ t('news.title') }}</Link></li>
              <li><Link href="/cart" class="hover:text-white">{{ t('nav.cart') }}</Link></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">{{ t('footer.customer_service') }}</h4>
            <ul class="space-y-2 text-sm">
              <li><Link href="/pages/faq" class="hover:text-white">{{ t('footer.faq') }}</Link></li>
              <li><Link href="/pages/shipping" class="hover:text-white">{{ t('footer.shipping') }}</Link></li>
              <li><Link href="/pages/returns" class="hover:text-white">{{ t('footer.returns') }}</Link></li>
              <li><Link href="/pages/contact" class="hover:text-white">{{ t('footer.contact_us') }}</Link></li>
            </ul>
          </div>
          <div>
            <h4 class="font-semibold text-white mb-4">{{ t('footer.contact_us') }}</h4>
            <p class="text-sm">support@gravito.dev</p>
          </div>
        </div>
        <div class="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2026 {{ t('footer.about_title') }}. {{ t('footer.powered_by') }}</p>
        </div>
      </div>
    </footer>
  </div>
</template>
