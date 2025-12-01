import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  // --- 新增配置：Vite Dev Server 代理 ---
  server: {
    proxy: {
      // 当请求路径以 /api 开头时
      '/api': {
        // 转发到 Flask 后端地址
        target: 'http://127.0.0.1:5000', 
        changeOrigin: true, // 改变源头以避免 CORS 问题
        // 配置是否允许代理请求发送 cookie/session
        ws: true,
        secure: false,
      }
    }
  }
})
