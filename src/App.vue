<script setup>
import { RouterView , useRoute} from 'vue-router'
import AppHeader from '@/components/AppHeader.vue' // 导入头部组件
import AIChat from './components/AIChat.vue';

const route = useRoute();

const shouldShowHeader = () => {
    // 确保 route.name 存在再进行比较（可选，但在某些极端路由切换情况下更安全）
    if (!route.name) return true; 
    return route.name !== 'login' && route.name !== 'register';
};
</script>

<template>
  <v-app>
    
    <AppHeader v-if="shouldShowHeader()"/>
    
    <v-main>
      <RouterView />
    </v-main>

    <AIChat></AIChat>
    
  </v-app>
</template>

<style>
/* 基础样式 (可以保持不变或进行自定义) */
</style>