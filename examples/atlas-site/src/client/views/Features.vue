<template>
  <div class="pt-24 pb-20 px-8 max-w-7xl mx-auto relative z-10">
      <h1 class="text-4xl font-bold mb-12 border-l-4 border-atlas-cyan pl-6 animate-slide-in-up">Core Capabilities</h1>
      
      <div class="grid grid-cols-1 gap-12">
          <!-- Section 1 -->
          <div class="bg-black/40 backdrop-blur border border-white/5 p-8 rounded-2xl">
              <h2 class="text-2xl font-bold text-white mb-4">Gravity ORM</h2>
              <p class="text-gray-400 mb-4">An Active Record implementation that feels light as feather but strong as a black hole. Define models with TypeScript decorators.</p>
              <pre class="bg-atlas-abyss p-6 rounded-lg border border-white/10 text-sm overflow-x-auto font-mono">
<span class="text-purple-400">import</span> { Model, column, hasMany } <span class="text-purple-400">from</span> <span class="text-green-300">'@gravito/atlas'</span>

<span class="text-purple-400">class</span> <span class="text-yellow-400">User</span> <span class="text-purple-400">extends</span> <span class="text-blue-300">Model</span> {
  <span class="text-purple-400">static</span> tableName = <span class="text-green-300">'users'</span>
  
  <span class="text-blue-300">@column</span>({ isPrimary: <span class="text-orange-300">true</span> })
  <span class="text-purple-400">declare</span> id: <span class="text-yellow-400">number</span>
  
  <span class="text-blue-300">@column</span>()
  <span class="text-purple-400">declare</span> email: <span class="text-yellow-400">string</span>

  <span class="text-blue-300">@hasMany</span>(() => Post)
  <span class="text-purple-400">declare</span> posts: <span class="text-yellow-400">HasMany</span>&lt;<span class="text-purple-400">typeof</span> Post&gt;
}
              </pre>
          </div>
          
          <!-- Section 2 -->
          <div class="bg-black/40 backdrop-blur border border-white/5 p-8 rounded-2xl">
              <h2 class="text-2xl font-bold text-white mb-4">Schema Migrations</h2>
              <p class="text-gray-400 mb-4">Version control for your database structure. Migrate up, roll back down.</p>
              <pre class="bg-atlas-abyss p-6 rounded-lg border border-white/10 text-sm overflow-x-auto font-mono">
<span class="text-purple-400">import</span> { Schema } <span class="text-purple-400">from</span> <span class="text-green-300">'@gravito/atlas'</span>

<span class="text-purple-400">export async function</span> <span class="text-blue-300">up</span>(schema: <span class="text-yellow-400">Schema</span>) {
  <span class="text-purple-400">await</span> schema.<span class="text-blue-300">createTable</span>(<span class="text-green-300">'users'</span>, (<span class="text-orange-300">table</span>) => {
    <span class="text-orange-300">table</span>.<span class="text-blue-300">increments</span>(<span class="text-green-300">'id'</span>)
    <span class="text-orange-300">table</span>.<span class="text-blue-300">string</span>(<span class="text-green-300">'email'</span>).<span class="text-blue-300">unique</span>()
    <span class="text-orange-300">table</span>.<span class="text-blue-300">string</span>(<span class="text-green-300">'password'</span>)
    <span class="text-orange-300">table</span>.<span class="text-blue-300">timestamps</span>()
  })
}
              </pre>
          </div>
      </div>
  </div>
</template>
