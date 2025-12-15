<script setup>
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const handleLogout = async () => {
    await authStore.logout();
    router.push('/login');
};
</script>

<template>
    <header class="main-header">
        <div class="logo">
            <router-link to="/"> DevLife 开发者</router-link>
        </div>
        <nav class="nav-links">
            <router-link to="/devinfo">GitHub分析</router-link>

            <template v-if="authStore.isLoggedIn">
                <span class="welcome-text">欢迎, {{ authStore.user?.username }}</span>
                <router-link to="/wishlist">心愿单</router-link>
                <a @click.prevent="handleLogout" href="#" class="logout-link">登出</a>
            </template>
            <template v-else>
                <router-link to="/login">登录</router-link>
                <router-link to="/register">注册</router-link>
            </template>
        </nav>
    </header>
</template>

<style scoped>
.main-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px 30px;
    background-color: #2c3e50;
    color: white;
}
.logo a {
    color: white;
    text-decoration: none;
    font-size: 1.5em;
    font-weight: bold;
}
.nav-links a, .logout-link {
    color: white;
    text-decoration: none;
    margin-left: 20px;
    cursor: pointer;
    transition: color 0.3s;
}
.nav-links a:hover, .logout-link:hover {
    color: #42b983;
}
/* 给 router-link-active 添加样式，让当前选中的菜单高亮 */
.nav-links a.router-link-active {
    color: #42b983;
    font-weight: bold;
}
.welcome-text {
    margin-right: 20px;
    color: #42b983;
}
</style>