<template>
  <section class="py-24 relative z-10">
    <div class="max-w-7xl mx-auto px-8 relative">
        <h2 class="text-3xl md:text-5xl font-bold mb-16 text-center">
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Core Architecture</span>
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Feature 1: Query Builder -->
            <div class="group relative bg-atlas-abyss border border-white/10 p-8 rounded-2xl overflow-hidden hover:border-atlas-cyan/50 transition-all duration-500">
                <!-- Card Internal Data Flux -->
                <div class="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                    <DataSortingGrid />
                </div>
                <div class="absolute inset-0 bg-gradient-to-b from-atlas-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-white">Fluent Orbit</h3>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                        Navigate your data with an expressive, chainable API designed for readability and speed.
                    </p>
                    <div class="bg-black/50 p-4 rounded-lg font-mono text-xs text-gray-300 border border-white/5">
                        <div class="text-purple-400">await <span class="text-yellow-400">DB</span></div>
                        <div class="pl-2">.<span class="text-blue-300">table</span>(<span class="text-green-300">'stars'</span>)</div>
                        <div class="pl-2">.<span class="text-blue-300">where</span>(<span class="text-green-300">'mass'</span>, <span class="text-pink-400">'>'</span>, <span class="text-orange-300">5.0</span>)</div>
                        <div class="pl-2">.<span class="text-blue-300">get</span>()</div>
                    </div>
                </div>
            </div>

            <!-- Feature 2: Migration -->
            <div class="group relative bg-atlas-abyss border border-white/10 p-8 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all duration-500">
                <!-- Card Internal Data Flux -->
                <div class="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                    <DataSortingGrid />
                </div>
                <div class="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-white">Schema Architect</h3>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                        Design your universe structure with version-controlled migrations that keep your team in sync.
                    </p>
                    <div class="bg-black/50 p-4 rounded-lg font-mono text-xs text-gray-300 border border-white/5">
                        <div class="text-purple-400">Schema.<span class="text-blue-300">create</span>(<span class="text-green-300">'users'</span>, <span class="text-orange-300">t</span> => {</div>
                        <div class="pl-4"><span class="text-orange-300">t</span>.<span class="text-blue-300">id</span>()</div>
                        <div class="pl-4"><span class="text-orange-300">t</span>.<span class="text-blue-300">string</span>(<span class="text-green-300">'email'</span>).<span class="text-blue-300">unique</span>()</div>
                        <div class="pl-4"><span class="text-orange-300">t</span>.<span class="text-blue-300">timestamps</span>()</div>
                        <div>})</div>
                        <div class="mt-2 text-gray-500 opacity-50 font-italic">// Rollback</div>
                        <div><span class="text-purple-400">Schema</span>.<span class="text-blue-300">dropTable</span>(<span class="text-green-300">'users'</span>)</div>
                    </div>
                </div>
            </div>

            <!-- Feature 3: Seeding -->
            <div class="group relative bg-atlas-abyss border border-white/10 p-8 rounded-2xl overflow-hidden hover:border-green-500/50 transition-all duration-500">
                <!-- Card Internal Data Flux -->
                <div class="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                    <DataSortingGrid />
                </div>
                <div class="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div class="relative z-10">
                    <div class="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-6 text-green-400 group-hover:scale-110 transition-transform">
                        <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h3 class="text-xl font-bold mb-3 text-white">Data Terraforming</h3>
                    <p class="text-gray-400 text-sm mb-6 leading-relaxed">
                        Populate your structural void with factory-generated seed data for rapid development and testing.
                    </p>
                    <div class="bg-black/50 p-4 rounded-lg font-mono text-xs text-gray-300 border border-white/5">
                        <div class="text-purple-400">Factory.<span class="text-blue-300">define</span>(<span class="text-green-300">'user'</span>, () => ({</div>
                        <div class="pl-4"><span class="text-blue-300">name</span>: <span class="text-yellow-400">faker</span>.<span class="text-blue-300">name</span>(),</div>
                        <div class="pl-4"><span class="text-blue-300">role</span>: <span class="text-green-300">'explorer'</span></div>
                        <div>}))</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import DataSortingGrid from './DataSortingGrid.vue'
</script>
