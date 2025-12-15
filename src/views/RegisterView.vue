<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

// 表单数据
const username = ref('');
const email = ref('');
const password = ref('');

// 状态反馈
const successMessage = ref('');
const errorMessage = ref('');
const loading = ref(false); // 新增 loading 状态
const passwordVisible = ref(false); // 新增密码显示控制

const handleRegister = async () => {
  errorMessage.value = '';
  successMessage.value = '';
  loading.value = true;

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
    loading.value = false; // 失败时停止 loading，成功时跳转无需停止
  }
};
</script>

<template>
  <div class="page-background d-flex justify-center align-center">
    <v-card
      class="login-container d-flex"
      elevation="12"
      rounded="lg"
      width="100%"
      max-width="1000px"
      height="600px"
    >
      <div class="left-panel d-none d-md-flex flex-column justify-center align-center">
        <div class="pa-12 text-white">
          <div class="d-flex align-center mb-6">
            <v-icon 
              icon="mdi-account-plus" 
              size="48" 
              color="white"
            ></v-icon>
            <h1 class="text-h4 font-weight-bold ml-4">DevLife</h1>
          </div>
          <h2 class="text-h4 font-weight-bold mb-4">
            欢迎加入我们
          </h2>
          <p class="text-body-1 text-grey-lighten-2">
            注册账号，开启您的跨平台心愿管理之旅。追踪商品价格，达成心愿目标，让每一份期待都物有所值。
          </p>
        </div>
      </div>

      <div class="right-panel d-flex flex-column justify-center align-center">
        <div class="pa-6" style="width: 100%; max-width: 400px;">
          <div class="d-flex justify-space-between align-center mb-8">
            <h3 class="text-h5 font-weight-bold">注册新账号</h3>
            <router-link to="/login" class="text-body-2 link-style">已有账号？去登录</router-link>
          </div>
          
          <v-form @submit.prevent="handleRegister">
            
            <v-alert
              v-if="errorMessage"
              type="error"
              variant="tonal"
              density="compact"
              class="mb-4"
              closable
            >
              {{ errorMessage }}
            </v-alert>

            <v-alert
              v-if="successMessage"
              type="success"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ successMessage }}
            </v-alert>

            <v-text-field
              v-model="username"
              label="用户名"
              variant="underlined"
              prepend-inner-icon="mdi-account"
              class="mb-2"
              required
            ></v-text-field>
            
            <v-text-field
              v-model="email"
              label="邮箱"
              type="email"
              variant="underlined"
              prepend-inner-icon="mdi-email"
              class="mb-2"
              required
            ></v-text-field>

            <v-text-field
              v-model="password"
              label="密码"
              variant="underlined"
              :type="passwordVisible ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock"
              :append-inner-icon="passwordVisible ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
              @click:append-inner="passwordVisible = !passwordVisible"
              class="mb-6"
              required
            ></v-text-field>

            <v-btn
              block
              class="login-button text-body-1"
              size="large"
              rounded="lg"
              elevation="2"
              type="submit"
              :loading="loading"
            >
              立即注册
            </v-btn>

            <div class="text-center my-4 text-caption text-grey">
              注册即代表您同意我们的 <a href="#" class="link-style">服务条款</a> 和 <a href="#" class="link-style">隐私政策</a>
            </div>
          </v-form>
        </div>
      </div>
    </v-card>
  </div>
</template>

<style scoped>
/* 页面背景 - 确保填满容器 */
.page-background {
  /* 1. 定义一个多彩的、更大尺寸的渐变背景 */
  background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
  background-size: 400% 400%;
  
  /* 2. 应用下面定义的动画 */
  animation: gradient-animation 15s ease infinite;
  
  /* 确保占满父容器高度 */
  min-height: 100vh; 
  width: 100%;
}

/* 3. 定义动画的关键帧 */
@keyframes gradient-animation {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 统一的登录容器卡片，去除内部padding */
.login-container {
  padding: 0 !important;
  overflow: hidden; /* 确保子元素的圆角生效 */
  margin: 20px;
}

/* 左侧面板 */
.left-panel {
  flex: 1 1 50%; /* flex-grow, flex-shrink, flex-basis */
  background-color: #2c333c;

  /* 添加内阴影，模拟边缘虚化 */
  box-shadow: inset -15px 0 15px -15px rgba(0, 0, 0, 0.3), /* 左边缘 */
              inset 15px 0 15px -15px rgba(0, 0, 0, 0.3);  /* 右边缘 */
}

/* 右侧面板 */
.right-panel {
  flex: 1 1 50%;
  background-color: #ffffff;

  /* 添加内阴影，模拟边缘虚化 */
  box-shadow: inset -15px 0 15px -15px rgba(0, 0, 0, 0.15), /* 左边缘 */
              inset 15px 0 15px -15px rgba(0, 0, 0, 0.15); /* 右边缘 */
}

/* 登录/注册按钮样式 */
.login-button {
  background-color: #e67e22 !important; /* Gitee 橙色 */
  color: white !important;
  font-weight: bold;
}

.login-button:hover {
  background-color: #d35400 !important;
}

/* 链接通用样式 */
.link-style {
  color: #606266;
  text-decoration: none;
  font-weight: 500;
}

.link-style:hover {
  color: #e67e22;
  text-decoration: underline;
}

/* 在小屏幕上隐藏左侧面板，让右侧面板占满全部空间 */
@media (max-width: 960px) {
  .right-panel {
    flex-basis: 100%;
  }
}
</style>