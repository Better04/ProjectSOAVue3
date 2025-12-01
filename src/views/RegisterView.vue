<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

const username = ref('');
const email = ref('');
const password = ref('');
const successMessage = ref('');
const errorMessage = ref('');

const handleRegister = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  try {
    // 路由：POST /api/user/register
    await axios.post('/api/user/register', {
      username: username.value,
      email: email.value,
      password: password.value,
    });
    
    successMessage.value = '注册成功！正在跳转到登录页面...';
    // 注册成功后自动跳转到登录页
    setTimeout(() => {
      router.push('/login');
    }, 2000);
    
  } catch (error) {
    errorMessage.value = error.response?.data?.message || '注册失败，请重试';
  }
};
</script>

<template>
  <div class="register-container">
    <h2>用户注册</h2>
    <form @submit.prevent="handleRegister">
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>

      <div>
        <label for="reg-username">用户名:</label>
        <input type="text" id="reg-username" v-model="username" required />
      </div>
      
      <div>
        <label for="reg-email">邮箱:</label>
        <input type="email" id="reg-email" v-model="email" required />
      </div>
      
      <div>
        <label for="reg-password">密码:</label>
        <input type="password" id="reg-password" v-model="password" required />
      </div>
      
      <button type="submit">注册</button>
    </form>
    <router-link to="/login">已有账号？去登录</router-link>
  </div>
</template>

<style scoped>
/* 简化样式 */
.register-container { max-width: 400px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; }
.error-message { color: red; margin-bottom: 10px; }
.success-message { color: green; margin-bottom: 10px; }
</style>