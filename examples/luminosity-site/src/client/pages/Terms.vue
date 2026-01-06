<script setup lang="ts">
import { Head } from '@inertiajs/vue3'
import { Scale, AlertTriangle, CheckCircle } from 'lucide-vue-next'
import Layout from '../components/Layout.vue'
import { useI18n } from '../composables/useI18n'

const { t } = useI18n()
</script>

<template>
  <Layout>
    <Head>
      <title>Terms of Service | Luminosity</title>
    </Head>

    <section class="relative pt-32 pb-20 overflow-hidden bg-black min-h-screen">
      <!-- Ambient Background -->
      <div class="absolute inset-0 z-0">
        <div class="absolute top-0 right-1/2 translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2" />
      </div>

      <div class="max-w-4xl mx-auto px-6 relative z-10">
        <div class="text-center mb-16">
          <h1 class="text-5xl lg:text-7xl font-black italic tracking-tighter mb-4 text-white uppercase">
            {{ t?.legal?.terms?.title }}
          </h1>
          <p class="text-emerald-500 font-mono text-xs uppercase tracking-widest">
            {{ t?.legal?.terms?.lastUpdated }}
          </p>
        </div>

        <div class="space-y-8">
          <!-- Section 1 -->
          <div class="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:border-emerald-500/20 transition-all group">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <Scale class="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 class="text-2xl font-bold mb-4 text-white uppercase italic tracking-tight">
                  {{ t?.legal?.terms?.section1?.title }}
                </h2>
                <p class="text-gray-400 leading-relaxed font-light text-lg">
                  {{ t?.legal?.terms?.section1?.content }}
                </p>
              </div>
            </div>
          </div>

          <!-- Section 2 -->
          <div class="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:border-emerald-500/20 transition-all group">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <AlertTriangle class="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 class="text-2xl font-bold mb-4 text-white uppercase italic tracking-tight">
                  {{ t?.legal?.terms?.section2?.title }}
                </h2>
                <p class="text-gray-400 leading-relaxed font-light text-lg">
                  {{ t?.legal?.terms?.section2?.content }}
                </p>
              </div>
            </div>
          </div>

          <!-- Section 3 -->
          <div class="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm hover:border-emerald-500/20 transition-all group">
            <div class="flex flex-col md:flex-row gap-6">
              <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                <CheckCircle class="w-7 h-7 text-emerald-500" />
              </div>
              <div>
                <h2 class="text-2xl font-bold mb-4 text-white uppercase italic tracking-tight">
                  {{ t?.legal?.terms?.section3?.title }}
                </h2>
                <p class="text-gray-400 leading-relaxed font-light text-lg">
                  {{ t?.legal?.terms?.section3?.content }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </Layout>
</template>
