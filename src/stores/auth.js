import { defineStore } from 'pinia'
import axios from 'axios'

// 配置 axios，允许跨域请求携带 Cookie/Session
axios.defaults.withCredentials = true 

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null, // 存储用户信息 {id, username}
    isLoggedIn: false,
    loading: false,
  }),
  actions: {
    // ----------------------------------------
    // 动作 1: 检查登录状态 (在应用启动时调用)
    // ----------------------------------------
    async checkLoginStatus() {
      this.loading = true;
      try {
        // 路由：GET /api/user/info
        const response = await axios.get('/api/user/info');
        
        // 状态码 200 表示已登录
        if (response.status === 200 && response.data.user_id) {
          this.user = { 
            id: response.data.user_id, 
            username: response.data.username 
          };
          this.isLoggedIn = true;
        } else {
          this.user = null;
          this.isLoggedIn = false;
        }
      } catch (error) {
        // 401 Unauthorized 意味着未登录
        this.user = null;
        this.isLoggedIn = false;
      } finally {
        this.loading = false;
      }
    },

    // ----------------------------------------
    // 动作 2: 执行登录
    // ----------------------------------------
    async login(username, password) {
      try {
        // 路由：POST /api/user/login
        const response = await axios.post('/api/user/login', { username, password });
        
        if (response.status === 200) {
          // 登录成功，更新状态
          this.user = { username: response.data.username };
          this.isLoggedIn = true;
          // 登录成功后，立即调用一次 checkLoginStatus 来获取完整的用户ID
          await this.checkLoginStatus(); 
          return true;
        }
      } catch (error) {
        // 返回后端错误信息
        return error.response?.data?.message || '登录失败，请检查网络';
      }
    },

    // ----------------------------------------
    // 动作 3: 执行登出
    // ----------------------------------------
    async logout() {
      try {
        await axios.post('/api/user/logout'); // 路由：POST /api/user/logout
      } finally {
        this.user = null;
        this.isLoggedIn = false;
      }
    }
  }
})