// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth' // 导入

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// --- 应用启动时初始化 Pinia 状态 ---
const authStore = useAuthStore()
// 在挂载应用前检查一次登录状态
authStore.checkLoginStatus().then(() => {
    app.mount('#app')
})