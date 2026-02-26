<script setup lang="ts">
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <footer class="bg-panel border-t border-white/5 pt-24 pb-12">
    <div class="max-w-7xl mx-auto px-6">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
        <div class="col-span-1 md:col-span-2">
          <Logo size="md" class="mb-6" />
          <p class="text-gray-500 max-w-sm mb-8">
            The intelligent core of the Gravito SmartMap Engine™. 
            High-performance sitemap generation and SEO management for enterprise-scale applications.
          </p>
        </div>
        
        <div>
          <h4 class="font-bold mb-6 text-sm uppercase tracking-widest text-emerald-500">Resources</h4>
          <ul class="space-y-4">
            <li>
              <StaticLink href="/docs/introduction" class="text-gray-400 hover:text-white transition-colors">
                Documentation
              </StaticLink>
            </li>
            <li>
              <StaticLink href="/docs/benchmark" class="text-gray-400 hover:text-white transition-colors">
                Benchmark Report
              </StaticLink>
            </li>
            <li>
              <StaticLink href="/docs/examples" class="text-gray-400 hover:text-white transition-colors">
                Examples
              </StaticLink>
            </li>
          </ul>
        </div>
        
        <div>
          <h4 class="font-bold mb-6 text-sm uppercase tracking-widest text-emerald-500">Community</h4>
          <ul class="space-y-4">
            <li>
              <a href="https://github.com/gravito-framework/gravito" target="_blank" class="text-gray-400 hover:text-white transition-colors">
                GitHub
              </a>
            </li>
            <!-- Pending Community Creation
            <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Discord</a></li>
            <li><a href="#" class="text-gray-400 hover:text-white transition-colors">Twitter</a></li>
            -->
          </ul>
        </div>
      </div>
      
      <div class="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-gray-600 text-sm">
          &copy; {{ new Date().getFullYear() }} Gravito Framework. Built for Builders.
        </p>
        <div class="flex gap-6">
          <StaticLink href="/privacy" class="text-gray-600 hover:text-white text-sm">Privacy</StaticLink>
          <StaticLink href="/terms" class="text-gray-600 hover:text-white text-sm">Terms</StaticLink>
        </div>
      </div>
    </div>
  </footer>
</template>
