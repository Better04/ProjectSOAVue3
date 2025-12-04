<script setup>
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue' // 导入头部组件
import AIChat from './components/AIChat.vue';
</script>

<template>
  <AppHeader />
  <main>
    <RouterView />
  </main>

  <AIChat></AIChat>
</template>

<style>
/* 基础样式 (可以保持不变或进行自定义) */
</style>