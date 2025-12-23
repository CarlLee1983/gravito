import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/features', name: 'Features', component: () => import('../views/Features.vue') },
    { path: '/company', name: 'Company', component: () => import('../views/Company.vue') },
    { path: '/support', name: 'Support', component: () => import('../views/Support.vue') },
    { path: '/gravits', name: 'Gravits', component: () => import('../views/Gravits.vue') },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
})

export default router
