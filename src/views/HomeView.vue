<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

// 登录后重定向
if (authStore.isLoggedIn) {
  router.push('/wishlist');
}
</script>

<template>
  <div class="home">
    <h1>欢迎来到跨平台心愿单聚合器！</h1>
    <p>我们帮助您追踪 Steam, 京东, 淘宝等平台上您心仪商品的价格，并在达到期望值时通知您。</p>
    
    <div v-if="!authStore.isLoggedIn" class="action-buttons">
      <router-link to="/login" class="button primary">立即登录</router-link>
      <router-link to="/register" class="button secondary">快速注册</router-link>
    </div>
    <div v-else>
      <p>您已登录，请前往您的心愿单进行管理。</p>
      <router-link to="/wishlist" class="button primary">查看心愿单</router-link>
    </div>
  </div>
</template>

<style scoped>
.home { text-align: center; padding: 50px; }
.action-buttons { margin-top: 20px; }
.button {
  display: inline-block;
  padding: 10px 20px;
  margin: 0 10px;
  text-decoration: none;
  border-radius: 5px;
  transition: background-color 0.3s;
}
.primary {
  background-color: #42b983;
  color: white;
}
.secondary {
  background-color: #ccc;
  color: #333;
}
</style>