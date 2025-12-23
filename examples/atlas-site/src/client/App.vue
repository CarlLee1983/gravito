<template>
  <!-- Background with grid and gradient -->
  <div class="min-h-screen bg-atlas-void bg-grid-pattern relative overflow-hidden flex flex-col">
    <!-- Background Image Layer -->
    <div class="absolute inset-0 z-0 select-none pointer-events-none">
        <img src="/hero-bg.jpg" class="w-full h-full object-cover opacity-30 mix-blend-lighten filter contrast-125 saturate-150" alt="Cosmic Background" />
        <div class="absolute inset-0 bg-gradient-to-t from-atlas-void via-atlas-void/50 to-transparent"></div>
        <div class="absolute inset-0 bg-gradient-to-r from-atlas-void via-transparent to-transparent"></div>
    </div>
    
    <!-- Cosmic Gradient Orb (The Black Hole Accretion Disk vibe) -->
    <div class="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-cosmic-gradient opacity-60 blur-[100px] pointer-events-none mix-blend-screen"></div>

    <!-- Navigation -->
    <nav class="relative z-50 flex justify-between items-center px-8 py-6 border-b border-white/5 backdrop-blur-sm">
      <div class="flex items-center gap-3 cursor-pointer" @click="$router.push('/')">
        <!-- Logo Icon (Abstract Spiral) -->
        <svg class="w-8 h-8 text-atlas-cyan animate-pulse" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="text-xl font-bold tracking-wider font-mono">@gravito/<span class="text-atlas-cyan">atlas</span></span>
      </div>
      <div class="hidden md:flex gap-8 text-sm font-medium text-gray-400">
        <router-link to="/" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">Home</router-link>
        <router-link to="/features" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">Features</router-link>
        <router-link to="/company" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">Company</router-link>
        <router-link to="/support" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">Support</router-link>
        <router-link to="/gravits" class="hover:text-atlas-cyan transition-colors" active-class="text-atlas-cyan">Gravits</router-link>
      </div>
      <div class="flex items-center gap-6">
        <button class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all transform hover:scale-105 active:scale-95">
          Download
        </button>
      </div>
    </nav>

    <!-- Main Content -->
    <div class="flex-grow flex flex-col">
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
    </div>

    <Footer />

    <!-- 3D Structural Effect (Simulated) -->
    <!-- Floating Orbit Elements -->
    <div class="absolute right-[-5%] top-[15%] w-[800px] h-[800px] perspective-1000 hidden lg:block opacity-60 pointer-events-none fixed">
        
        <!-- Orbital Rings -->
        <div class="absolute inset-0 border border-atlas-cyan/20 rounded-full w-[600px] h-[600px] top-[100px] left-[100px] animate-spin-slow"></div>
        <div class="absolute inset-0 border border-purple-500/20 rounded-full w-[800px] h-[800px] animate-spin-reverse-slower"></div>

        <!-- Floating Database Cubes -->
        <div class="absolute top-[30%] left-[40%] w-24 h-24 border border-atlas-cyan bg-atlas-cyan/5 backdrop-blur-sm shadow-[0_0_30px_rgba(0,240,255,0.2)] transform rotate-12 flex items-center justify-center text-sm font-bold animate-float-1">Postgres</div>
        
        <div class="absolute top-[60%] left-[20%] w-20 h-20 border border-blue-500 bg-blue-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(59,130,246,0.2)] transform -rotate-12 flex items-center justify-center text-sm font-bold animate-float-2">MySQL</div>

        <div class="absolute top-[50%] left-[70%] w-16 h-16 border border-purple-500 bg-purple-500/5 backdrop-blur-sm shadow-[0_0_30px_rgba(168,85,247,0.2)] transform rotate-45 flex items-center justify-center text-xs font-bold animate-float-3">SQLite</div>
        
        <!-- Connection Lines -->
        <svg class="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          <line x1="40%" y1="30%" x2="20%" y2="60%" stroke="#00f0ff" stroke-dasharray="4 4" />
          <line x1="40%" y1="30%" x2="70%" y2="50%" stroke="#00f0ff" stroke-dasharray="4 4" />
        </svg>
    </div>
  </div>
</template>

<style>
.perspective-1000 {
    perspective: 1000px;
}
@keyframes spin-slow {
    from { transform: rotate(0deg) rotateX(60deg); }
    to { transform: rotate(360deg) rotateX(60deg); }
}
@keyframes spin-reverse-slower {
    from { transform: rotate(360deg) rotateX(60deg); }
    to { transform: rotate(0deg) rotateX(60deg); }
}
.animate-spin-slow {
    animation: spin-slow 20s linear infinite;
}
.animate-spin-reverse-slower {
    animation: spin-reverse-slower 30s linear infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(12deg); }
  50% { transform: translateY(-20px) rotate(15deg); }
}
@keyframes float-rev {
  0%, 100% { transform: translateY(0) rotate(-12deg); }
  50% { transform: translateY(20px) rotate(-15deg); }
}

.animate-float-1 { animation: float 6s ease-in-out infinite; }
.animate-float-2 { animation: float-rev 7s ease-in-out infinite; }
.animate-float-3 { animation: float 5s ease-in-out infinite; }

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import Footer from './components/Footer.vue'
</script>
