import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'Home', component: Home },
    { path: '/features', name: 'Features', component: () => import('../views/Features.vue') },
    { path: '/docs/:id', name: 'Docs', component: () => import('../views/Docs.vue') },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0, behavior: 'smooth' }
    }
  },
})

router.afterEach((to) => {
  const baseTitle = 'Gravito Atlas'
  if (to.name === 'Docs' && to.params.id) {
    const docName = (to.params.id as string).charAt(0).toUpperCase() + (to.params.id as string).slice(1)
    document.title = `${docName} | ${baseTitle}`
  } else if (to.name && to.name !== 'Home') {
    document.title = `${to.name.toString()} | ${baseTitle}`
  } else {
    document.title = baseTitle + ' - Structuring Chaos'
  }
})

export default router
