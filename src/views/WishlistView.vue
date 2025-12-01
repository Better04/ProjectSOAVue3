<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

// ----------------------------------------
// State
// ----------------------------------------
const wishes = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const newWishUrl = ref('');
const newTargetPrice = ref('');
const addMessage = ref('');

// ----------------------------------------
// API Actions
// ----------------------------------------

// 获取心愿单列表
const fetchWishes = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        // 路由: GET /api/wishlist/
        const response = await axios.get('/api/wishlist/'); 
        wishes.value = response.data.data;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || '获取心愿单失败，请检查登录状态或网络。';
    } finally {
        loading.value = false;
    }
};

// 添加新心愿
const addNewWish = async () => {
    addMessage.value = '';
    errorMessage.value = '';
    if (!newWishUrl.value || !newTargetPrice.value) {
        addMessage.value = 'URL和期望价格不能为空。';
        return;
    }

    try {
        const response = await axios.post('/api/wishlist/', {
            url: newWishUrl.value,
            target_price: parseFloat(newTargetPrice.value),
        });

        addMessage.value = response.data.message || '心愿添加成功！';
        newWishUrl.value = '';
        newTargetPrice.value = '';
        
        // 重新加载列表以显示新添加的项
        await fetchWishes(); 

    } catch (error) {
        addMessage.value = error.response?.data?.message || '添加失败，请检查URL格式。';
    }
};

// 删除心愿
const deleteWish = async (wish_id) => {
    try {
        // 路由: DELETE /api/wishlist/<int:wish_id>
        await axios.delete(`/api/wishlist/${wish_id}`);
        
        // 客户端删除列表项
        wishes.value = wishes.value.filter(w => w.wish_id !== wish_id);
    } catch (error) {
        errorMessage.value = error.response?.data?.message || '删除失败。';
    }
};

// ----------------------------------------
// Lifecycle
// ----------------------------------------
onMounted(fetchWishes);
</script>

<template>
  <div class="wishlist-container">
    <h1>我的心愿单</h1>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div class="add-wish-form">
      <h3>添加新心愿</h3>
      <form @submit.prevent="addNewWish">
        <input 
          type="text" 
          v-model="newWishUrl" 
          placeholder="商品链接 (e.g., Steam URL)" 
          required
        />
        <input 
          type="number" 
          v-model="newTargetPrice" 
          placeholder="期望价格 (RMB)" 
          step="0.01" 
          required
        />
        <button type="submit">添加</button>
      </form>
      <p v-if="addMessage" :class="{'success-message': addMessage.includes('成功'), 'error-message': !addMessage.includes('成功')}">
        {{ addMessage }}
      </p>
    </div>
    
    <div v-if="loading">加载中...</div>
    <div v-else-if="wishes.length === 0">心愿单为空，快去添加商品吧！</div>
    
    <div v-else class="wish-list">
      <div v-for="wish in wishes" :key="wish.wish_id" class="wish-item">
        <div class="item-info">
            <img :src="wish.image_url" alt="商品图片" class="item-image" />
            <div>
                <h4>{{ wish.title }}</h4>
                <p>平台: {{ wish.platform.toUpperCase() }}</p>
                <p>原始链接: <a :href="wish.original_url" target="_blank">查看商品</a></p>
            </div>
        </div>
        
        <div class="price-info">
            <p>期望价格: <span class="target-price">¥{{ wish.target_price.toFixed(2) }}</span></p>
            
            <p>最新价格: 
                <span :class="{'price-low': wish.status === '低于目标', 'price-high': wish.status === '高于目标'}">
                    ¥{{ wish.latest_price !== null ? wish.latest_price.toFixed(2) : 'N/A' }}
                </span>
            </p>
            <p>状态: 
                <span :class="{'status-low': wish.status === '低于目标', 'status-high': wish.status === '高于目标'}">
                    {{ wish.status }}
                </span>
            </p>
        </div>
        
        <button @click="deleteWish(wish.wish_id)" class="delete-button">删除</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 简化样式 */
.wishlist-container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
.error-message { color: red; }
.success-message { color: green; }
.add-wish-form { margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
.add-wish-form input, .add-wish-form button { margin-right: 10px; padding: 10px; border: 1px solid #ccc; border-radius: 3px; }
.wish-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(450px, 1fr)); gap: 20px; }
.wish-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border: 1px solid #eee;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.item-info { display: flex; align-items: center; }
.item-image { width: 60px; height: 60px; object-fit: cover; margin-right: 15px; border-radius: 4px; }
.price-info p { margin: 5px 0; }
.target-price { font-weight: bold; color: #333; }
.price-low { color: #42b983; font-weight: bold; }
.price-high { color: #e67e22; }
.status-low { background-color: #e8f9f1; padding: 2px 5px; border-radius: 3px; color: #27ae60; }
.status-high { background-color: #fcece8; padding: 2px 5px; border-radius: 3px; color: #c0392b; }
.delete-button { background-color: #e74c3c; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; }
</style>