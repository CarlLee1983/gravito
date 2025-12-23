<template>
  <div class="pt-24 pb-20 px-8 max-w-7xl mx-auto relative z-10">
      <h1 class="text-4xl font-bold mb-12">The Gravito Ecosystem</h1>
      <p class="text-gray-400 mb-12 max-w-2xl text-lg">
        Atlas is designed to work seamlessly with other Gravito modules. Together, they form a cohesive universe for application development.
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="bg-black/40 border border-white/10 p-8 rounded-xl hover:border-atlas-cyan/50 hover:bg-atlas-cyan/5 transition-all group">
              <div class="text-atlas-cyan font-bold text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">Luminosity</div>
              <p class="text-sm text-gray-500 font-mono mb-4">@gravito/luminosity</p>
              <p class="text-gray-400 text-sm">Next-gen SEO Engine with streaming Sitemap generation.</p>
          </div>
          
          <div class="bg-black/40 border border-white/10 p-8 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all group">
              <div class="text-purple-400 font-bold text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">Orbit</div>
              <p class="text-sm text-gray-500 font-mono mb-4">@gravito/orbit</p>
              <p class="text-gray-400 text-sm">Modular Application Core for managing lifecycles and DI.</p>
          </div>
          
          <div class="bg-black/40 border border-atlas-cyan/50 p-8 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.15)] transform scale-105 ring-1 ring-atlas-cyan/50 relative overflow-hidden">
               <div class="absolute top-0 right-0 bg-atlas-cyan text-black text-xs font-bold px-2 py-1">YOU ARE HERE</div>
              <div class="text-white font-bold text-2xl mb-2">Atlas</div>
              <p class="text-sm text-gray-500 font-mono mb-4">@gravito/atlas</p>
              <p class="text-gray-300 text-sm">Universal Database Interface and Query Builder.</p>
          </div>
          
          <div class="bg-black/40 border border-white/10 p-8 rounded-xl hover:border-pink-500/50 hover:bg-pink-500/5 transition-all group">
              <div class="text-pink-400 font-bold text-2xl mb-2 group-hover:scale-110 transition-transform origin-left">Nebula</div>
              <p class="text-sm text-gray-500 font-mono mb-4">@gravito/nebula</p>
              <p class="text-gray-400 text-sm">Microservices mesh and inter-service communication.</p>
          </div>
      </div>
  </div>
</template>
