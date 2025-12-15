<script setup>

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const router = useRouter();

// 表单数据
const username = ref('');
const password = ref('');
const errorMessage = ref('');

// UI 状态控制
const passwordVisible = ref(false);
const rememberMe = ref(false);
const loading = ref(false);

const handleLogin = async () => {
  errorMessage.value = '';
  loading.value = true;
  
  // 调用原有的 store 登录逻辑
  const result = await authStore.login(username.value, password.value);
  
  loading.value = false;
  
  if (result === true) {
    router.push('/wishlist'); // 登录成功，跳转到心愿单页面
  } else {
    errorMessage.value = result; // 显示错误信息
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
              icon="mdi-account-edit" 
              size="48" 
              color="white"
            ></v-icon>
            <h1 class="text-h4 font-weight-bold ml-4">DevLife</h1>
          </div>
          <h2 class="text-h4 font-weight-bold mb-4">
            开发者心愿管理平台
          </h2>
          <p class="text-body-1 text-grey-lighten-2">
            不少创新始于产品，因为用户“需要”而外部用户却不能忽视。其实一个好的研发交流，可以让用户快速的了解软件的迭代计划，实实在在地提升效率。
          </p>
        </div>
      </div>

      <div class="right-panel d-flex flex-column justify-center align-center">
        <div class="pa-6" style="width: 100%; max-width: 400px;">
          <div class="d-flex justify-space-between align-center mb-8">
            <h3 class="text-h5 font-weight-bold">登录</h3>
            <router-link to="/register" class="text-body-2 link-style">没有账号？点击注册</router-link>
          </div>
          
          <v-form @submit.prevent="handleLogin">
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

            <v-text-field
              v-model="username"
              label="用户名"
              variant="underlined"
              prepend-inner-icon="mdi-account"
              class="mb-4"
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
              required
            ></v-text-field>

            <div class="d-flex justify-space-between align-center my-4">
              <v-checkbox 
                v-model="rememberMe" 
                density="compact" 
                label="记住我" 
                hide-details
                color="orange-darken-3"
              ></v-checkbox>
              <a href="#" class="text-body-2 link-style">无法登录？</a>
            </div>

            <v-btn
              block
              class="login-button text-body-1"
              size="large"
              rounded="lg"
              elevation="2"
              type="submit"
              :loading="loading"
            >
              登录
            </v-btn>

            <div class="text-center my-4">
              <a href="#" class="text-body-2 link-style">忘记密码？</a>
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
  
  /* 确保占满父容器高度，视情况可调整为 100vh 或 100% */
  min-height: 100vh; /* 减去头部高度，防止出现滚动条 */
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
  margin: 20px; /* 增加一点外边距防止贴边 */
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

/* 登录按钮样式 */
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