// import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth' // 导入

// --- 新增：导入 Vuetify 相关 ---
import 'vuetify/styles' // 引入基础样式
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css' // 引入图标


const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi', // 确保图标正常显示
  },
})

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// --- 应用启动时初始化 Pinia 状态 ---
const authStore = useAuthStore()
// 在挂载应用前检查一次登录状态
authStore.checkLoginStatus().then(() => {
    app.mount('#app')
})