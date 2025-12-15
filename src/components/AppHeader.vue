<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';
import { computed } from 'vue';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
    await authStore.logout();
    router.push('/login');
};

// 获取用户首字母用于头像
const userInitial = computed(() => {
    return authStore.user?.username ? authStore.user.username.charAt(0).toUpperCase() : 'U';
});
</script>

<template>
  <v-app-bar color="#2c3e50" elevation="4" class="px-md-4">
    
    <div class="logo d-flex align-center">
      <router-link to="/" class="text-decoration-none logo-link">
        <span class="text-h5 font-weight-black text-white tracking-wide">DevLife</span>
      </router-link>
    </div>

    <v-spacer></v-spacer>

    <div class="d-flex align-center gap-container">
      
      <template v-if="authStore.isLoggedIn">
        
        <v-btn
          to="/devinfo"
          variant="text"
          class="nav-btn text-body-2 font-weight-bold mr-1"
          color="white"
          prepend-icon="mdi-github"
          rounded="lg"
        >
          GitHub分析
        </v-btn>

        <v-btn
          to="/wishlist"
          variant="text"
          class="nav-btn text-body-2 font-weight-bold mr-3"
          color="white"
          prepend-icon="mdi-gift-outline"
          rounded="lg"
        >
          心愿单
        </v-btn>

        <div class="vertical-divider mx-2"></div>

        <v-menu location="bottom end" transition="scale-transition" offset="10">
          <template v-slot:activator="{ props }">
            <div 
              v-bind="props" 
              class="user-pill d-flex align-center px-3 py-1 rounded-pill"
              v-ripple
            >
                <v-avatar color="#42b983" size="32" class="mr-2 elevation-2">
                    <span class="text-white text-subtitle-2 font-weight-bold">{{ userInitial }}</span>
                </v-avatar>
                <div class="d-flex flex-column mr-2" style="line-height: 1.1;">
                    <span class="text-caption text-grey-lighten-2" style="font-size: 0.65rem !important;">已登录</span>
                    <span class="text-caption font-weight-bold text-white">{{ authStore.user?.username }}</span>
                </div>
                <v-icon icon="mdi-chevron-down" size="small" color="grey-lighten-1"></v-icon>
            </div>
          </template>

          <v-list elevation="3" rounded="lg" density="compact" class="py-2 mt-1">
            <v-list-item @click="handleLogout" prepend-icon="mdi-logout-variant" base-color="error" class="px-4">
              <v-list-item-title class="font-weight-bold">退出登录</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>

      </template>

      <template v-else>
        <router-link to="/login" class="custom-link mr-4">登录</router-link>
        
        <v-btn
          to="/register"
          color="#42b983"
          variant="flat"
          class="text-white font-weight-bold"
          rounded="lg"
          size="small"
        >
          注册
        </v-btn>
      </template>
    </div>

  </v-app-bar>
</template>

<style scoped>
/* 文本颜色辅助类 */
.text-green {
    color: #42b983;
}

.tracking-wide {
    letter-spacing: 1px;
}

/* Logo 样式微调 */
.logo-link {
    transition: opacity 0.2s;
}
.logo-link:hover {
    opacity: 0.85;
}

/* 导航按钮交互效果 */
.nav-btn {
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
    opacity: 0.9;
}
/* 激活状态（当前路由）保持绿色高亮 */
.nav-btn.v-btn--active {
    color: #f7f8f8 !important;
    opacity: 1;
}

.nav-btn.v-btn--active :deep(.v-btn__overlay) {
    opacity: 0 !important; /* 关键：把遮罩透明度设为0 */
}

.nav-btn:hover {
    background-color: rgba(255, 255, 255, 0.08);
    opacity: 1;
}

/* 垂直分割线 */
.vertical-divider {
    width: 1px;
    height: 24px;
    background-color: rgba(255, 255, 255, 0.15);
}

/* 用户信息胶囊样式 (现在可以点击了) */
.user-pill {
    background-color: rgba(0, 0, 0, 0.2); /* 深色半透明背景 */
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    cursor: pointer;
    user-select: none;
}
.user-pill:hover {
    background-color: rgba(0, 0, 0, 0.4);
    border-color: rgba(66, 185, 131, 0.5); /* 悬停时边框变绿 */
}

/* 原生链接样式 (用于未登录时的登录链接) */
.custom-link {
    color: white;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: color 0.2s;
}
.custom-link:hover {
    color: #42b983;
}

/* 间距控制 */
.gap-container {
    gap: 8px;
}
</style>