<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

const username = ref('');
const password = ref('');
const errorMessage = ref('');

const handleLogin = async () => {
  errorMessage.value = '';
  const result = await authStore.login(username.value, password.value);
  
  if (result === true) {
    router.push('/wishlist'); // 登录成功，跳转到心愿单页面
  } else {
    errorMessage.value = result; // 显示错误信息
  }
};
</script>

<template>
  <div class="login-container">
    <h2>用户登录</h2>
    <form @submit.prevent="handleLogin">
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      
      <div>
        <label for="username">用户名:</label>
        <input type="text" id="username" v-model="username" required />
      </div>
      
      <div>
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      
      <button type="submit">登录</button>
    </form>
    <router-link to="/register">还没有账号？去注册</router-link>
  </div>
</template>

<style scoped>
/* 简化样式 */
.login-container { max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; }
.error-message { color: red; margin-bottom: 10px; }
div { margin-bottom: 15px; }
label { display: block; margin-bottom: 5px; }
input { width: 100%; padding: 8px; box-sizing: border-box; }
</style>