import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import './style.css'

// 導入全域組件
import DataSortingGrid from './components/DataSortingGrid.vue'
import Features from './components/Features.vue'
import Footer from './components/Footer.vue'
import Installation from './components/Installation.vue'
import LiveConsole from './components/LiveConsole.vue'
import SpotlightCard from './components/SpotlightCard.vue'
import StaticLink from './components/StaticLink.vue'

const app = createApp(App)

// 註冊全域組件
app.component('DataSortingGrid', DataSortingGrid)
app.component('Features', Features)
app.component('Footer', Footer)
app.component('Installation', Installation)
app.component('LiveConsole', LiveConsole)
app.component('SpotlightCard', SpotlightCard)
app.component('StaticLink', StaticLink)

// 確保路由已正確初始化
router.isReady().then(() => {
  if (router.currentRoute.value.matched.length === 0) {
    const currentPath = window.location.pathname
    const cleanPath = currentPath.replace(/\/index\.html$/, '') || '/'
    if (cleanPath !== currentPath) {
      router.replace(cleanPath)
    }
  }
})

app.use(router).use(i18n).mount('#app')
