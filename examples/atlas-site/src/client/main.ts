import { createApp } from 'vue'
import App from './App.vue'
import i18n from './i18n'
import router from './router'
import './style.css'

// 確保路由已正確初始化
router.isReady().then(() => {
  // 如果路由沒有匹配到任何組件，可能是因為 URL 路徑問題
  // HTML 中的腳本應該已經處理了 /index.html 的重定向
  // 這裡只是作為備用檢查
  if (router.currentRoute.value.matched.length === 0) {
    const currentPath = window.location.pathname
    // 嘗試匹配當前路徑（去除可能的 /index.html）
    const cleanPath = currentPath.replace(/\/index\.html$/, '') || '/'
    if (cleanPath !== currentPath) {
      router.replace(cleanPath)
    }
  }
})

createApp(App).use(router).use(i18n).mount('#app')
