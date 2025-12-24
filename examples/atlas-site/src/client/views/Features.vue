<template>
  <div class="pt-24 pb-20 px-8 max-w-7xl mx-auto relative z-10">
      <div class="text-center mb-20 animate-slide-in-up">
          <h1 class="text-5xl md:text-6xl font-bold mb-6 text-white tracking-tight">
              {{ t('features.title') }}
          </h1>
          <p class="text-xl text-gray-400 max-w-3xl mx-auto">
              {{ t('features.subtitle') }}
          </p>
      </div>
      
      <div class="space-y-32">
          <!-- The Evolution Section: Atlas vs Prisma & Drizzle -->
          <div class="bg-atlas-cyan/5 border border-atlas-cyan/20 rounded-3xl p-8 md:p-12 relative overflow-hidden group min-h-[400px]">
              <DataSortingGrid />
              <div class="absolute top-0 right-0 w-64 h-64 bg-atlas-cyan/10 blur-[100px] -mr-32 -mt-32"></div>
              <div class="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div class="lg:col-span-1">
                      <div class="text-atlas-cyan font-mono text-xs mb-4 tracking-tighter">PHASE_EVOLUTION</div>
                      <h2 class="text-3xl font-bold text-white mb-4">{{ t('features.evolution_title') }}</h2>
                      <p class="text-gray-400 leading-relaxed text-sm">
                          {{ t('features.evolution_desc') }}
                      </p>
                  </div>
                  <div class="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <!-- Prisma Strengths -->
                      <div class="bg-black/40 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors">
                          <div class="text-blue-400 font-bold mb-3 flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-blue-400"></div>
                             Prisma's DX
                          </div>
                          <ul class="text-xs space-y-2 text-gray-500">
                              <li>• Intuitive Model Definition</li>
                              <li>• Strong Structural Integrity</li>
                              <li>• Rich ecosystem feel</li>
                              <li class="text-red-400/50 line-through">× Heavy Rust Binary</li>
                              <li class="text-red-400/50 line-through">× Custom Schema Language</li>
                          </ul>
                      </div>
                      <!-- Drizzle Strengths -->
                      <div class="bg-black/40 p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors">
                          <div class="text-green-400 font-bold mb-3 flex items-center gap-2">
                             <div class="w-2 h-2 rounded-full bg-green-400"></div>
                             Drizzle's Performance
                          </div>
                          <ul class="text-xs space-y-2 text-gray-500">
                              <li>• No binaries</li>
                              <li>• Raw SQL Power</li>
                              <li>• Direct TS-first approach</li>
                              <li class="text-red-400/50 line-through">× Verbose Query API</li>
                              <li class="text-red-400/50 line-through">× Scattered configuration</li>
                          </ul>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Section 1: ORM & Models (Left Text, Right Code) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div class="order-2 lg:order-1">
                  <div class="inline-block bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-mono mb-4 border border-purple-500/20">{{ t('features.eloquent_pattern') }}</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.orm_title') }}</h2>
                  <p class="text-gray-400 mb-6 leading-relaxed">
                      {{ t('features.orm_desc') }}
                  </p>
                  <ul class="space-y-3 text-gray-300">
                      <li class="flex items-center gap-3">
                          <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                          {{ t('features.timestamp_mgmt') }}
                      </li>
                      <li class="flex items-center gap-3">
                          <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                          {{ t('features.lifecycle_hooks') }}
                      </li>
                      <li class="flex items-center gap-3">
                          <svg class="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
                          {{ t('features.json_serialization') }}
                      </li>
                  </ul>
              </div>
              <div class="order-1 lg:order-2 bg-black/40 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl hover:border-purple-500/30 transition-colors">
                  <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5 mb-2">
                      <div class="w-3 h-3 rounded-full bg-red-500/20"></div>
                      <div class="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                      <div class="w-3 h-3 rounded-full bg-green-500/20"></div>
                      <span class="ml-2 text-xs text-gray-600 font-mono">User.ts</span>
                  </div>
                  <pre class="p-4 text-sm overflow-x-auto font-mono leading-relaxed">
<span class="text-purple-400">import</span> { Model, column, hasMany } <span class="text-purple-400">from</span> <span class="text-green-300">'@gravito/atlas'</span>

<span class="text-purple-400">export default class</span> <span class="text-yellow-400">User</span> <span class="text-purple-400">extends</span> <span class="text-blue-300">Model</span> {
  <span class="text-purple-400">static</span> tableName = <span class="text-green-300">'users'</span>
  
  <span class="text-blue-300">@column</span>({ isPrimary: <span class="text-orange-300">true</span> })
  <span class="text-purple-400">declare</span> id: <span class="text-yellow-400">number</span>
  
  <span class="text-blue-300">@column</span>()
  <span class="text-purple-400">declare</span> email: <span class="text-yellow-400">string</span>

  <span class="text-blue-300">@hasMany</span>(() => Post)
  <span class="text-purple-400">declare</span> posts: <span class="text-yellow-400">HasMany</span>&lt;<span class="text-purple-400">typeof</span> Post&gt;

  <span class="text-blue-300">@column</span>.<span class="text-blue-300">dateTime</span>({ autoCreate: <span class="text-orange-300">true</span> })
  <span class="text-purple-400">declare</span> createdAt: <span class="text-yellow-400">DateTime</span>
}</pre>
              </div>
          </div>

          <!-- Section 2: Query Builder (Left Code, Right Text) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div class="bg-black/40 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl hover:border-atlas-cyan/30 transition-colors">
                  <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5 mb-2">
                       <span class="text-xs text-gray-600 font-mono">Controller.ts</span>
                  </div>
                  <pre class="p-4 text-sm overflow-x-auto font-mono leading-relaxed">
<span class="text-gray-500">// Fluent Chainable API</span>
<span class="text-purple-400">const</span> <span class="text-blue-300">users</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">User</span>.<span class="text-blue-300">query</span>()
  .<span class="text-blue-300">where</span>(<span class="text-green-300">'isActive'</span>, <span class="text-orange-300">true</span>)
  .<span class="text-blue-300">whereHas</span>(<span class="text-green-300">'posts'</span>, (<span class="text-orange-300">query</span>) => {
    <span class="text-orange-300">query</span>.<span class="text-blue-300">where</span>(<span class="text-green-300">'likes'</span>, <span class="text-pink-400">'>'</span>, <span class="text-orange-300">100</span>)
  })
  .<span class="text-blue-300">orderBy</span>(<span class="text-green-300">'createdAt'</span>, <span class="text-green-300">'desc'</span>)
  .<span class="text-blue-300">limit</span>(<span class="text-orange-300">10</span>)

<span class="text-gray-500">// Or use the DB Facade directly</span>
<span class="text-purple-400">const</span> <span class="text-blue-300">stats</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>
  .<span class="text-blue-300">from</span>(<span class="text-green-300">'access_logs'</span>)
  .<span class="text-blue-300">select</span>(<span class="text-green-300">'region'</span>)
  .<span class="text-blue-300">count</span>(<span class="text-green-300">'*'</span>, <span class="text-green-300">'hits'</span>)
  .<span class="text-blue-300">groupBy</span>(<span class="text-green-300">'region'</span>)</pre>
              </div>
              <div>
                  <div class="inline-block bg-atlas-cyan/10 text-atlas-cyan px-3 py-1 rounded-full text-xs font-mono mb-4 border border-atlas-cyan/20">Fluent API Builder</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.query_title') }}</h2>
                  <p class="text-gray-400 mb-6 leading-relaxed">
                      {{ t('features.query_desc') }}
                  </p>
                  <p class="text-gray-400 leading-relaxed border-l-2 border-atlas-cyan pl-4 italic">
                      "It feels like writing plain SQL, but with the superpowers of TypeScript."
                  </p>
              </div>
          </div>
          
          <!-- Memory Streams Section (Full Width HUD) -->
          <div class="relative py-20 px-8 bg-atlas-cyan/5 border-y border-atlas-cyan/10 overflow-hidden">
              <!-- Background Flow Animation -->
              <div class="absolute inset-0 z-0 opacity-20">
                  <div class="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-atlas-cyan to-transparent animate-pulse" style="animation-duration: 3s"></div>
                  <div class="absolute top-0 left-2/4 w-px h-full bg-gradient-to-b from-transparent via-atlas-cyan to-transparent animate-pulse" style="animation-duration: 4s; animation-delay: 1s"></div>
                  <div class="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-atlas-cyan to-transparent animate-pulse" style="animation-duration: 5s; animation-delay: 0.5s"></div>
              </div>

              <div class="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div class="space-y-8">
                      <div>
                          <div class="px-3 py-1 rounded-full border border-atlas-cyan/30 text-atlas-cyan text-[10px] font-mono tracking-widest uppercase mb-4 w-fit bg-atlas-cyan/10">
                              System_Resource_Optimization
                          </div>
                          <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">
                              {{ t('features.stream_title') }}
                          </h2>
                          <p class="text-gray-400 text-lg leading-relaxed">
                              {{ t('features.stream_desc') }}
                          </p>
                      </div>

                      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div class="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-atlas-cyan/40 transition-all group">
                              <div class="text-atlas-cyan font-bold mb-1 text-sm">{{ t('features.stream_lazy') }}</div>
                              <div class="text-[10px] text-gray-500 font-mono">{{ t('features.stream_lazy_sub') }}</div>
                          </div>
                          <div class="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-atlas-cyan/40 transition-all group">
                              <div class="text-atlas-cyan font-bold mb-1 text-sm">{{ t('features.stream_cursor') }}</div>
                              <div class="text-[10px] text-gray-500 font-mono">{{ t('features.stream_cursor_sub') }}</div>
                          </div>
                          <div class="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-atlas-cyan/40 transition-all group">
                              <div class="text-atlas-cyan font-bold mb-1 text-sm">{{ t('features.stream_chunk') }}</div>
                              <div class="text-[10px] text-gray-500 font-mono">{{ t('features.stream_chunk_sub') }}</div>
                          </div>
                      </div>
                  </div>

                  <div class="relative">
                      <!-- HUD Corner Brackets -->
                      <div class="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-atlas-cyan opacity-40"></div>
                      <div class="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-atlas-cyan opacity-40"></div>
                      
                      <div class="bg-black/80 backdrop-blur-xl border border-atlas-cyan/20 p-6 rounded-lg shadow-[0_0_50px_rgba(0,255,255,0.05)]">
                          <div class="flex items-center justify-between mb-4 border-b border-white/10 pb-2">
                              <div class="flex gap-1.5">
                                  <div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan"></div>
                                  <div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan/50"></div>
                                  <div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan/20"></div>
                              </div>
                              <div class="text-[10px] font-mono text-atlas-cyan/60 tracking-tighter">DATASTREAM_PROTOCOL_V2</div>
                          </div>
                          <pre class="text-xs md:text-sm font-mono leading-relaxed text-gray-300">
<span class="text-gray-500">// Efficiently process 1M+ records</span>
<span class="text-purple-400">for await</span> (<span class="text-purple-400">const</span> <span class="text-blue-300">users</span> <span class="text-purple-400">of</span> <span class="text-yellow-400">User</span>.<span class="text-blue-300">cursor</span>(<span class="text-orange-300">500</span>)) {
  <span class="text-purple-400">for</span> (<span class="text-purple-400">const</span> <span class="text-blue-300">user</span> <span class="text-purple-400">of</span> <span class="text-blue-300">users</span>) {
    <span class="text-purple-400">await</span> <span class="text-blue-300">user</span>.<span class="text-blue-300">syncToSearchEngine</span>()
    <span class="text-gray-500">// System handles garbage collection </span>
  }
}

<span class="text-gray-500">// Raw data chunking (no hydration)</span>
<span class="text-purple-400">for await</span> (<span class="text-purple-400">const</span> <span class="text-blue-300">rows</span> <span class="text-purple-400">of</span> <span class="text-yellow-400">User</span>.<span class="text-blue-300">lazyAll</span>(<span class="text-orange-300">1000</span>)) {
  <span class="text-comment text-gray-500">// Performance critical bulk operations</span>
}</pre>
                      </div>
                  </div>
              </div>
          </div>

          <!-- Section 3: Migrations (Left Text, Right Code) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div class="order-2 lg:order-1">
                  <div class="inline-block bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-mono mb-4 border border-blue-500/20">{{ t('features.migration_engine') }}</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.migration_title') }}</h2>
                  <p class="text-gray-400 mb-6 leading-relaxed">
                      {{ t('features.migration_desc') }}
                  </p>
                  <div class="grid grid-cols-2 gap-4">
                      <div class="bg-blue-500/5 p-4 rounded border border-blue-500/10 hover:bg-blue-500/10 transition-colors">
                          <div class="text-blue-400 font-bold mb-1">{{ t('features.up') }}</div>
                          <div class="text-xs text-gray-500">{{ t('features.up_desc') }}</div>
                      </div>
                      <div class="bg-red-500/5 p-4 rounded border border-red-500/10 hover:bg-red-500/10 transition-colors">
                          <div class="text-red-400 font-bold mb-1">{{ t('features.down') }}</div>
                          <div class="text-xs text-gray-500">{{ t('features.down_desc') }}</div>
                      </div>
                  </div>
              </div>
              <div class="order-1 lg:order-2 bg-black/40 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl hover:border-blue-500/30 transition-colors">
                  <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5 mb-2">
                      <span class="text-xs text-gray-600 font-mono">database/migrations/xxx_users.ts</span>
                  </div>
                  <pre class="p-4 text-sm overflow-x-auto font-mono leading-relaxed">
<span class="text-purple-400">import</span> { Schema } <span class="text-purple-400">from</span> <span class="text-green-300">'@gravito/atlas'</span>

<span class="text-purple-400">export async function</span> <span class="text-blue-300">up</span>(schema: <span class="text-yellow-400">Schema</span>) {
  <span class="text-purple-400">await</span> schema.<span class="text-blue-300">createTable</span>(<span class="text-green-300">'users'</span>, (<span class="text-orange-300">table</span>) => {
    <span class="text-orange-300">table</span>.<span class="text-blue-300">increments</span>(<span class="text-green-300">'id'</span>)
    <span class="text-orange-300">table</span>.<span class="text-blue-300">string</span>(<span class="text-green-300">'email'</span>, <span class="text-orange-300">255</span>).<span class="text-blue-300">notNullable</span>().<span class="text-blue-300">unique</span>()
    <span class="text-orange-300">table</span>.<span class="text-blue-300">string</span>(<span class="text-green-300">'password'</span>, <span class="text-orange-300">180</span>).<span class="text-blue-300">notNullable</span>()
    <span class="text-orange-300">table</span>.<span class="text-blue-300">boolean</span>(<span class="text-green-300">'is_active'</span>).<span class="text-blue-300">defaultTo</span>(<span class="text-orange-300">true</span>)
    
    <span class="text-comment text-gray-500">// Foreign Keys</span>
    <span class="text-orange-300">table</span>.<span class="text-blue-300">integer</span>(<span class="text-green-300">'team_id'</span>).<span class="text-blue-300">unsigned</span>().<span class="text-blue-300">references</span>(<span class="text-green-300">'id'</span>).<span class="text-blue-300">inTable</span>(<span class="text-green-300">'teams'</span>)

    <span class="text-orange-300">table</span>.<span class="text-blue-300">timestamps</span>()
  })
}

<span class="text-purple-400">export async function</span> <span class="text-blue-300">down</span>(schema: <span class="text-yellow-400">Schema</span>) {
  <span class="text-purple-400">await</span> schema.<span class="text-blue-300">dropTable</span>(<span class="text-green-300">'users'</span>)
}</pre>
              </div>
          </div>
          
          <!-- Section 4: Seeding & Factory (Left Code, Right Text) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
               <div class="bg-black/40 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl hover:border-green-500/30 transition-colors">
                  <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5 mb-2">
                       <span class="text-xs text-gray-600 font-mono">database/seeders/UserSeeder.ts</span>
                  </div>
                  <pre class="p-4 text-sm overflow-x-auto font-mono leading-relaxed">
<span class="text-purple-400">import</span> { Factory } <span class="text-purple-400">from</span> <span class="text-green-300">'@gravito/atlas'</span>
<span class="text-purple-400">import</span> User <span class="text-purple-400">from</span> <span class="text-green-300">'@/models/User'</span>

<span class="text-comment text-gray-500">// Define factory blueprint</span>
Factory.<span class="text-blue-300">define</span>(User, ({ <span class="text-orange-300">faker</span> }) => {
  <span class="text-purple-400">return</span> {
    <span class="text-blue-300">email</span>: <span class="text-orange-300">faker</span>.internet.<span class="text-blue-300">email</span>(),
    <span class="text-blue-300">password</span>: <span class="text-green-300">'secret'</span>,
    <span class="text-blue-300">avatarUrl</span>: <span class="text-orange-300">faker</span>.image.<span class="text-blue-300">avatar</span>(),
  }
})

<span class="text-comment text-gray-500">// Run seeder</span>
<span class="text-purple-400">export async function</span> <span class="text-blue-300">run</span>() {
  <span class="text-comment text-gray-500">// Create 50 users with related posts</span>
  <span class="text-purple-400">await</span> Factory.<span class="text-blue-300">model</span>(User)
    .<span class="text-blue-300">with</span>(<span class="text-green-300">'posts'</span>, <span class="text-orange-300">3</span>)
    .<span class="text-blue-300">createMany</span>(<span class="text-orange-300">50</span>)
}</pre>
              </div>
              <div>
                  <div class="inline-block bg-green-500/10 text-green-400 px-3 py-1 rounded-full text-xs font-mono mb-4 border border-green-500/20">{{ t('features.blueprints_factories') }}</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.seeding_title') }}</h2>
                  <p class="text-gray-400 mb-6 leading-relaxed">
                      {{ t('features.seeding_desc') }}
                  </p>
              </div>
          </div>

          <!-- Section 7: CLI (Full Width HUD / Terminal) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                  <div class="inline-block bg-atlas-cyan/10 text-atlas-cyan px-3 py-1 rounded-full text-xs font-mono mb-4 border border-atlas-cyan/20">Control Interface</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.cli_title') }}</h2>
                  <p class="text-gray-400 mb-8 leading-relaxed">
                      {{ t('features.cli_desc') }}
                  </p>

                  <StaticLink to="/docs/cli" class="inline-flex items-center gap-2 text-atlas-cyan hover:text-white transition-all group font-mono text-sm">
                      <span class="border-b border-atlas-cyan/50 group-hover:border-white transition-all">{{ t('features.cli_button') }}</span>
                  </StaticLink>
              </div>
              <div class="bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                   <div class="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/5">
                        <div class="flex gap-1.5">
                            <div class="w-2.5 h-2.5 rounded-full bg-red-500/40"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-yellow-500/40"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-green-500/40"></div>
                        </div>
                        <div class="text-[9px] font-mono text-gray-500 tracking-widest">ATLAS_TERMINAL_SESSION</div>
                   </div>
                   <div class="p-6 font-mono text-sm">
                        <div class="flex gap-2 mb-2">
                             <span class="text-green-400">$</span>
                             <span class="text-white">bun atlas migrate</span>
                        </div>
                        <div class="text-gray-500 mb-1">Running migrations...</div>
                        <div class="text-atlas-cyan flex gap-2">
                             <span>✓</span>
                             <span>2024_12_24_084201_create_logs_table</span>
                        </div>
                        <div class="text-atlas-cyan flex gap-2 mb-4">
                             <span>✓</span>
                             <span>2024_12_24_091530_add_context_to_users</span>
                        </div>
                        <div class="text-gray-400 mb-2">Done. Database schema synchronized.</div>
                        <div class="flex gap-2">
                             <span class="text-green-400">$</span>
                             <span class="w-2 h-5 bg-atlas-cyan/80 animate-pulse"></span>
                        </div>
                   </div>
              </div>
          </div>

          <!-- Section 5: Raw Query & Execution (Right Code, Left Text) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
              <div class="order-2 lg:order-1 relative z-10">
                  <div class="inline-block bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-xs font-mono mb-4 border border-orange-500/20">{{ t('features.bare_metal') }}</div>
                  <h2 class="text-3xl font-bold text-white mb-6">{{ t('features.raw_title') }}</h2>
                  <p class="text-gray-400 mb-8 leading-relaxed">
                      {{ t('features.raw_desc') }}
                  </p>
                  
                  <!-- Security Badges -->
                  <div class="space-y-4">
                      <div class="flex items-center gap-4 p-4 bg-green-500/5 rounded-xl border border-green-500/10 group hover:border-green-500/30 transition-all">
                          <div class="bg-green-500/20 p-2 rounded-lg">
                              <svg class="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          </div>
                          <div>
                              <div class="text-white font-bold text-sm">{{ t('features.security_shield') }}</div>
                              <div class="text-xs text-gray-500 font-mono">AUTOMATIC_SANITY_CHECK_V3</div>
                          </div>
                      </div>

                      <div class="flex items-center gap-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 group hover:border-blue-500/30 transition-all">
                          <div class="bg-blue-500/20 p-2 rounded-lg text-blue-400">
                             <div class="w-6 h-6 flex items-center justify-center font-bold text-[10px]">{}</div>
                          </div>
                          <div>
                              <div class="text-white font-bold text-sm">{{ t('features.security_auto_bind') }}</div>
                              <div class="text-xs text-gray-500 font-mono">PREVENT_SQL_INJECTION_ACTIVE</div>
                          </div>
                      </div>
                  </div>
              </div>

              <div class="order-1 lg:order-2 bg-black/40 backdrop-blur border border-white/10 p-2 rounded-xl shadow-2xl hover:border-orange-500/30 transition-colors relative group overflow-hidden">
                   <!-- Security Scanning Line -->
                   <div class="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                        <div class="w-full h-1 bg-green-500/40 blur-sm absolute top-0 animate-scanning-vertical"></div>
                   </div>

                   <div class="flex items-center justify-between px-4 py-2 border-b border-white/5 mb-2 bg-black/20">
                        <span class="text-xs text-gray-600 font-mono">RawExecution.ts</span>
                        <div class="flex items-center gap-1.5">
                            <div class="text-[9px] font-mono text-green-500">{{ t('features.security_protected') }}</div>
                            <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                  </div>
                  <pre class="p-4 text-sm overflow-x-auto font-mono leading-relaxed relative z-10">
<span class="text-comment text-gray-500">// Direct SQL execution with bindings</span>
<span class="text-purple-400">const</span> <span class="text-blue-300">result</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>.<span class="text-blue-300">rawQuery</span>(
  <span class="text-green-300">'SELECT * FROM users WHERE status = ? AND score > ?'</span>,
  [<span class="text-green-300">'active'</span>, <span class="text-orange-300">1000</span>]
)

<span class="text-comment text-gray-500">// Even for complex analytical queries</span>
<span class="text-purple-400">const</span> <span class="text-blue-300">analytics</span> = <span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>.<span class="text-blue-300">raw</span>(
  <span class="text-green-300">`SELECT region, COUNT(*) as total 
   FROM orders 
   GROUP BY region 
   HAVING total > :min`</span>,
  { min: <span class="text-orange-300">50</span> }
)</pre>
              </div>
          </div>
          <!-- Section 6: Connection Nexus (Unified DX) -->
          <div class="pt-16 border-t border-white/5">
              <div class="text-center mb-16">
                  <div class="text-atlas-cyan font-mono text-[10px] tracking-[0.4em] uppercase mb-4">Connection_Orchestration_Active</div>
                  <h2 class="text-4xl font-bold text-white mb-4">{{ t('connection_hub.title') }}</h2>
                  <p class="text-gray-500 max-w-2xl mx-auto">{{ t('connection_hub.subtitle') }}</p>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  <!-- Central Config Logic -->
                  <div class="lg:col-span-2 bg-black/60 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                      <div class="absolute top-0 right-0 p-4 opacity-20">
                          <svg class="w-24 h-24 text-atlas-cyan" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7L12 1222 7L12 2Z opacity-50"/><path d="M2 12L12 17L22 12 opacity-30"/><path d="M2 17L12 22L22 17 opacity-10"/></svg>
                      </div>
                      
                      <div class="relative z-10">
                          <h3 class="text-xl font-bold text-white mb-6 flex items-center gap-3">
                              <div class="w-2 h-2 rounded-full bg-atlas-cyan animate-pulse"></div>
                              {{ t('connection_hub.driver_protocol_title') }}
                          </h3>
                          
                          <pre class="bg-black/40 rounded-xl p-6 font-mono text-sm leading-relaxed border border-white/5 text-gray-300">
<span class="text-comment text-gray-500">// atlas.config.ts - Central Data Hub</span>
<span class="text-purple-400">export default</span> <span class="text-blue-300">defineConfig</span>({
  default: <span class="text-green-300">'sqlite'</span>,
  connections: {
    sqlite: { driver: <span class="text-green-300">'sqlite'</span>, database: <span class="text-green-300">'db.sqlite'</span> },
    mongodb: { driver: <span class="text-green-300">'mongodb'</span>, uri: <span class="text-blue-300">process</span>.<span class="text-blue-300">env</span>.<span class="text-blue-300">MONGO_URI</span> },
    redis: { driver: <span class="text-green-300">'redis'</span>, host: <span class="text-green-300">'127.0.0.1'</span> }
  }
})

<span class="text-comment text-gray-500">// Freedom to switch anywhere in your app</span>
<span class="text-purple-400">const</span> users = <span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>.<span class="text-blue-300">connection</span>(<span class="text-green-300">'mongodb'</span>).<span class="text-blue-300">table</span>(<span class="text-green-300">'users'</span>).<span class="text-blue-300">get</span>()
<span class="text-purple-400">await</span> <span class="text-yellow-400">DB</span>.<span class="text-blue-300">connection</span>(<span class="text-green-300">'redis'</span>).<span class="text-blue-300">set</span>(<span class="text-green-300">'recent_users'</span>, users)</pre>
                      </div>
                  </div>

                  <!-- Satellite Info -->
                  <div class="space-y-6">
                      <div class="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-atlas-cyan/40 transition-all cursor-default group">
                          <div class="text-atlas-cyan font-bold mb-2 flex items-center gap-2">
                              <div class="w-1.5 h-1.5 rounded-full bg-atlas-cyan"></div>
                              {{ t('connection_hub.switching_title') }}
                          </div>
                          <p class="text-xs text-gray-500 leading-relaxed mb-4">
                              {{ t('connection_hub.switching_desc') }}
                          </p>
                          <div class="flex gap-2">
                             <StaticLink to="/docs/mongodb" class="text-[10px] font-mono text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all">
                                MongoDB →
                             </StaticLink>
                             <StaticLink to="/docs/redis" class="text-[10px] font-mono text-gray-400 border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-all">
                                Redis →
                             </StaticLink>
                          </div>
                       </div>

                       <div class="bg-white/5 border border-white/10 p-6 rounded-2xl opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-default relative overflow-hidden">
                          <!-- Bun Performance Tag -->
                          <div class="absolute -right-8 -top-8 w-24 h-24 bg-orange-500/10 rotate-45 border-b border-orange-500/20 flex items-end justify-center pb-2">
                              <span class="text-[8px] font-bold text-orange-400 tracking-widest uppercase">Bun Native</span>
                          </div>

                          <div class="text-gray-400 font-bold mb-2 text-sm flex items-center gap-2">
                              <svg class="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 16h-1v-4h1v4zm0-6h-1V7h1v5z"/></svg>
                              {{ t('connection_hub.bun_engine_title') }}
                          </div>
                          <p class="text-[10px] text-gray-600 font-mono mb-4">
                            {{ t('connection_hub.bun_engine_desc') }}
                          </p>
                          <StaticLink to="/docs/mongodb" class="block w-full py-2 bg-orange-500/5 hover:bg-orange-500/10 text-[10px] font-center text-center font-mono text-orange-400 uppercase tracking-widest border border-orange-500/10 transition-all">
                             Optimize with Bun →
                          </StaticLink>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import { useI18n } from 'vue-i18n'
import DataSortingGrid from '@/client/components/DataSortingGrid.vue'
import StaticLink from '@/client/components/StaticLink.vue'
const { t } = useI18n()
</script>

<style scoped>
.animate-scanning-vertical {
    animation: scanningVertical 3s linear infinite;
}

@keyframes scanningVertical {
    0% { top: -10%; }
    100% { top: 110%; }
}

.animate-slide-in-up {
    animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes slideInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
