<script setup lang="ts">
import { useForm } from '@inertiajs/vue3'

const form = useForm({
  email: 'admin@gravito.dev',
  password: 'admin123',
})

const submit = () => {
  form.post('/login', {
    onSuccess: () => {
      // Inertia handles redirect
    },
  })
}
</script>

<template>
    <div class="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6 relative overflow-hidden">
        <!-- Animated Background Elements -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none">
            <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
            <div class="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style="animation-delay: 2s;"></div>
            <div class="absolute inset-0 opacity-[0.03]" style="background-image: radial-gradient(#fff 1px, transparent 1px); background-size: 40px 40px;"></div>
        </div>

        <div class="w-full max-w-md relative">
            <!-- Logo area -->
            <div class="flex flex-col items-center mb-8">
                <div class="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 group transform transition-transform hover:rotate-12">
                    <ShieldCheck class="w-10 h-10 text-white" />
                </div>
                <h1 class="text-3xl font-bold tracking-tight text-white">Gravito <span class="text-blue-500">Terminal</span></h1>
                <p class="text-slate-400 mt-2">Access authorized personnel only.</p>
            </div>

            <!-- Login Card -->
            <div class="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
                <!-- Glitch effect line -->
                <div class="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                
                <form @submit.prevent="submit" class="space-y-6">
                    <div>
                        <label class="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                        <div class="relative group/input">
                            <Mail class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-blue-500 transition-colors" />
                            <input 
                                v-model="form.email"
                                type="email" 
                                required
                                class="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                        <p v-if="form.errors.email" class="mt-2 text-sm text-red-400">{{ form.errors.email }}</p>
                    </div>

                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <label class="block text-sm font-medium text-slate-400">Security Passkey</label>
                            <a href="#" class="text-xs text-blue-500 hover:text-blue-400 transition-colors">Emergency Reset?</a>
                        </div>
                        <div class="relative group/input">
                            <Lock class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within/input:text-blue-500 transition-colors" />
                            <input 
                                v-model="form.password"
                                type="password" 
                                required
                                class="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div class="flex items-center">
                        <input type="checkbox" class="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500/50 focus:ring-offset-slate-900" id="remember">
                        <label for="remember" class="ml-2 text-sm text-slate-400">Stay linked for 30 cycles</label>
                    </div>

                    <button 
                        type="submit"
                        :disabled="form.processing"
                        class="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 group/btn transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        <span v-if="form.processing">Decrypting...</span>
                        <span v-else>Initialize Link</span>
                        <ArrowRight class="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                    </button>
                </form>

                <!-- Decorative corner accents -->
                <div class="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500/20 rounded-tr-3xl pointer-events-none"></div>
                <div class="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500/20 rounded-bl-3xl pointer-events-none"></div>
            </div>

            <!-- Footer links -->
            <div class="mt-8 text-center space-x-6">
                <Link href="/" class="text-sm text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1">
                    <ArrowRight class="w-4 h-4 rotate-180" /> Back to Matrix
                </Link>
                <div class="inline-block w-1 h-1 bg-slate-800 rounded-full"></div>
                <span class="text-xs font-mono text-slate-600 uppercase tracking-widest">Gravito Nexus V1.0</span>
            </div>
            
            <!-- Quick diagnostic bar -->
            <div class="mt-12 flex items-center justify-center gap-6 text-slate-700">
                <div class="flex items-center gap-2">
                    <Gauge class="w-4 h-4" />
                    <span class="text-[10px] font-mono">LATENCY: 12ms</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-1.5 h-1.5 bg-green-500/40 rounded-full animate-ping"></div>
                    <span class="text-[10px] font-mono text-green-500/60">CORE ONLINE</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@keyframes pulse {
    0%, 100% { opacity: 0.1; }
    50% { opacity: 0.15; }
}
</style>
