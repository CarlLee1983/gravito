<script setup lang="ts">

</script>

<template>
  <div class="min-h-screen bg-void text-gray-200">
    <!-- Background Grid Effect -->
    <div class="fixed inset-0 pointer-events-none bg-hex-grid opacity-50 z-0"></div>

    <div class="relative z-10 flex flex-col min-h-screen">
      <Nav />
      <main class="flex-grow">
        <slot />
      </main>
      <Footer />
    </div>
  </div>
</template>
