<template>
  <Layout>
    <div class="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div class="card shadow-xl border-none ring-1 ring-gray-100 relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 to-indigo-600" />
        
        <div class="text-center mb-10">
          <div class="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <div class="i-carbon-user-follow text-3xl text-cyan-600" />
          </div>
          <h1 class="text-3xl font-extrabold text-gray-900">{{ t('auth.join_community') }}</h1>
          <p class="text-gray-500 mt-2">{{ t('auth.start_journey') }}</p>
        </div>
        
        <form @submit.prevent="submit" class="space-y-5">
          <div>
            <label class="label">{{ t('auth.name') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <div class="i-carbon-user" />
              </div>
              <input
                v-model="form.name"
                type="text"
                class="input pl-10"
                placeholder="John Doe"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="label">{{ t('auth.email') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <div class="i-carbon-email" />
              </div>
              <input
                v-model="form.email"
                type="email"
                class="input pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
          
          <div>
            <label class="label">{{ t('auth.password') }}</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <div class="i-carbon-password" />
              </div>
              <input
                v-model="form.password"
                type="password"
                class="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          
          <div class="pt-2">
            <button type="submit" class="btn btn-primary w-full py-3 text-base shadow-indigo-200" :disabled="form.processing">
              <div v-if="form.processing" class="i-carbon-progress-bar animate-spin mr-2" />
              {{ t('auth.create_account') }}
            </button>
          </div>
        </form>
        
        <div class="mt-8 pt-8 border-t border-gray-100">
          <p class="text-center text-sm text-gray-600">
            {{ t('auth.has_account') }}
            <Link href="/login" class="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              {{ t('auth.sign_in_here') }}
            </Link>
          </p>
        </div>
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { Link, router } from '@inertiajs/vue3';
import Layout from '../../components/Layout.vue';
import { useI18n } from '../../composables/useI18n';

const { t } = useI18n();

const form = reactive({
  name: '',
  email: '',
  password: '',
  processing: false
});

const submit = () => {
  form.processing = true;
  router.post('/register', form, {
    onFinish: () => form.processing = false
  });
};
</script>
