import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue' // 导入
import RegisterView from '../views/RegisterView.vue' // 导入
// 假设你创建了一个 WishlistView.vue 文件
import WishlistView from '../views/WishlistView.vue' 
import { useAuthStore } from '@/stores/auth'
// 1. 导入新页面
import DevInfoView from '../views/DevInfoView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/wishlist',
      name: 'wishlist',
      component: WishlistView,
      meta: { requiresAuth: true } // 只有登录后才能访问
    },
    // 2. 添加新路由 (注意：这个页面我不强制要求登录，因为只是查GitHub公开信息)
    {
      path: '/devinfo',
      name: 'devinfo',
      component: DevInfoView
    }
  ]
})

// 导航守卫：用于路由权限控制
router.beforeEach(async (to, from) => {
  const authStore = useAuthStore();
  
  // 确保在每次导航前检查登录状态（只有在未加载时检查）
  if (!authStore.isLoggedIn && !authStore.loading) {
     await authStore.checkLoginStatus();
  }
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 如果需要认证但用户未登录，重定向到登录页
    return { name: 'login' };
  }
  
  if ((to.name === 'login' || to.name === 'register') && authStore.isLoggedIn) {
    // 如果已登录，访问登录/注册页，则重定向到心愿单
    return { name: 'wishlist' };
  }
})

export default router