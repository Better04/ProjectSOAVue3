<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

// ----------------------------------------
// State
// ----------------------------------------
const wishes = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const currentUser = ref(null); // 存储当前用户信息
const userTotalStars = ref(0); // 前端计算的用户总 Star 数

// 新增表单数据
const newWishUrl = ref('');
const newTargetPrice = ref('');
const newConditionType = ref(''); // 选中的解锁条件类型
const newTargetValue = ref('');   // 目标数值
const addMessage = ref('');

// 解锁条件的选项
const conditionOptions = [
    { label: '无 (直接解锁)', value: '' },
    { label: '本周代码提交次数 (Weekly Commits)', value: 'weekly_commits' },
    { label: 'GitHub 仓库获赞数 (Total Stars)', value: 'total_stars' }
];

// ----------------------------------------
// API Actions
// ----------------------------------------

// 1. 获取当前用户信息 (为了拿到用户名去查 GitHub 数据)
const fetchUserInfo = async () => {
    try {
        const res = await axios.get('/api/user/info');
        currentUser.value = res.data;
        // 拿到用户名后，顺便去查一下他的 GitHub 仓库数据，算一下总 Stars
        if (currentUser.value && currentUser.value.username) {
            fetchUserStars(currentUser.value.username);
        }
    } catch (error) {
        console.error("获取用户信息失败", error);
    }
};

// 2. [前端补位] 获取用户仓库并计算总 Stars (因为心愿列表API没返回当前进度)
const fetchUserStars = async (username) => {
    try {
        // 调用 devinfo 组的接口
        const res = await axios.get(`/api/devinfo/repos/${username}`);
        const repos = res.data.data || [];
        // 累加所有仓库的 stars
        const total = repos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
        userTotalStars.value = total;
    } catch (error) {
        console.error("获取Star数据失败", error);
    }
};

// 3. 获取心愿单列表
const fetchWishes = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        const response = await axios.get('/api/wishlist/'); 
        wishes.value = response.data.data;
    } catch (error) {
        errorMessage.value = error.response?.data?.message || '获取心愿单失败，请检查登录状态或网络。';
    } finally {
        loading.value = false;
    }
};

// 4. 添加新心愿 (支持解锁条件)
const addNewWish = async () => {
    addMessage.value = '';
    errorMessage.value = '';
    
    if (!newWishUrl.value || !newTargetPrice.value) {
        addMessage.value = 'URL和期望价格不能为空。';
        return;
    }

    try {
        // 构造请求体，包含新增的 condition 字段
        const payload = {
            url: newWishUrl.value,
            target_price: parseFloat(newTargetPrice.value),
            condition_type: newConditionType.value || null,
            target_value: newTargetValue.value ? parseInt(newTargetValue.value) : 0
        };

        const response = await axios.post('/api/wishlist/', payload);

        addMessage.value = response.data.message || '心愿添加成功！';
        
        // 重置表单
        newWishUrl.value = '';
        newTargetPrice.value = '';
        newConditionType.value = '';
        newTargetValue.value = '';
        
        await fetchWishes(); 

    } catch (error) {
        addMessage.value = error.response?.data?.message || '添加失败，请检查输入。';
    }
};

// 5. 删除心愿
const deleteWish = async (wish_id) => {
    if(!confirm('确定要删除这个心愿吗？')) return;
    try {
        await axios.delete(`/api/wishlist/${wish_id}`);
        wishes.value = wishes.value.filter(w => w.wish_id !== wish_id);
    } catch (error) {
        errorMessage.value = error.response?.data?.message || '删除失败。';
    }
};

// 6. [核心] 手动检查解锁状态
const checkUnlockStatus = async () => {
    try {
        const res = await axios.post('/api/wishlist/check-status');
        alert(res.data.message); // 弹出后端返回的提示，比如“恭喜解锁！”
        await fetchWishes();     // 刷新列表看最新状态
    } catch (error) {
        alert(error.response?.data?.message || '检查失败');
    }
};

// ----------------------------------------
// Helper Logic
// ----------------------------------------

// 计算进度条百分比
const getProgress = (wish) => {
    if (wish.is_unlocked) return 100;
    if (!wish.unlock_condition_type) return 100;

    let current = 0;
    const target = wish.unlock_target_value || 1;

    // 根据不同类型获取当前值
    if (wish.unlock_condition_type === 'total_stars') {
        current = userTotalStars.value; // 使用我们前端算出来的总 Star
    } else if (wish.unlock_condition_type === 'weekly_commits') {
        // 后端没返回这个数据，我们暂时没法准确显示“当前Commit数”
        // 所以这里返回 0，或者你可以做一个模拟
        current = 0; 
    }

    let percent = (current / target) * 100;
    return Math.min(100, Math.max(0, percent));
};

// 获取进度文本提示
const getProgressText = (wish) => {
    if (wish.is_unlocked) return '已解锁';
    
    if (wish.unlock_condition_type === 'total_stars') {
        return `当前 Stars: ${userTotalStars.value} / 目标: ${wish.unlock_target_value}`;
    }
    if (wish.unlock_condition_type === 'weekly_commits') {
        return `需本周提交代码 ${wish.unlock_target_value} 次 (请点击检查按钮刷新)`;
    }
    return '进行中';
};

// ----------------------------------------
// Lifecycle
// ----------------------------------------
onMounted(async () => {
    await fetchUserInfo(); // 先拿用户信息
    await fetchWishes();   // 再拿心愿单
});
</script>

<template>
  <div class="wishlist-container">
    <div class="header-section">
        <h1>我的心愿单 🎮</h1>
        <button @click="checkUnlockStatus" class="check-btn">🔄 检查我的成就</button>
    </div>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

    <div class="add-wish-form">
      <h3>✨ 添加新心愿</h3>
      <form @submit.prevent="addNewWish">
        <div class="form-row">
            <input 
              type="text" 
              v-model="newWishUrl" 
              placeholder="商品链接 (e.g., Steam URL)" 
              required
              class="input-large"
            />
            <input 
              type="number" 
              v-model="newTargetPrice" 
              placeholder="期望价格 (¥)" 
              step="0.01" 
              required
              class="input-small"
            />
        </div>
        
        <div class="form-row condition-row">
            <select v-model="newConditionType" class="select-condition">
                <option disabled value="">-- 选择解锁条件 (可选) --</option>
                <option v-for="opt in conditionOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                </option>
            </select>

            <input 
                v-if="newConditionType"
                type="number" 
                v-model="newTargetValue" 
                placeholder="目标数值 (如: 10)" 
                required
                class="input-small"
            />
        </div>

        <button type="submit" class="submit-btn">添加心愿</button>
      </form>
      <p v-if="addMessage" :class="{'success-message': addMessage.includes('成功'), 'error-message': !addMessage.includes('成功')}">
        {{ addMessage }}
      </p>
    </div>
    
    <div v-if="loading">加载中...</div>
    <div v-else-if="wishes.length === 0">心愿单为空，快去添加商品吧！</div>
    
    <div v-else class="wish-list">
      <div v-for="wish in wishes" :key="wish.wish_id" class="wish-item" :class="{ 'locked-item': !wish.is_unlocked }">
        
        <div v-if="!wish.is_unlocked" class="lock-badge">🔒 锁定中</div>

        <div class="item-main">
            <div class="item-info">
                <img :src="wish.image_url" alt="商品图片" class="item-image" />
                <div class="text-info">
                    <h4 class="item-title" :title="wish.title">{{ wish.title }}</h4>
                    <p class="platform-tag">{{ wish.platform.toUpperCase() }}</p>
                    <a :href="wish.original_url" target="_blank" class="link-text">原始链接</a>
                </div>
            </div>
            
            <div class="price-info">
                <div class="price-row">
                    <span>期望: ¥{{ wish.target_price.toFixed(2) }}</span>
                    <span :class="{'price-ok': wish.status === '低于目标', 'price-bad': wish.status === '高于目标'}">
                        现价: ¥{{ wish.latest_price !== null ? wish.latest_price.toFixed(2) : 'N/A' }}
                    </span>
                </div>
            </div>
        </div>

        <div v-if="wish.unlock_condition_type" class="progress-section">
            <div class="progress-info">
                <small>{{ getProgressText(wish) }}</small>
            </div>
            <div class="progress-bar-bg">
                <div 
                    class="progress-bar-fill" 
                    :style="{ width: getProgress(wish) + '%', backgroundColor: wish.is_unlocked ? '#42b983' : '#f1c40f' }"
                ></div>
            </div>
        </div>
        
        <div class="action-row">
            <button @click="deleteWish(wish.wish_id)" class="delete-button">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wishlist-container { max-width: 1000px; margin: 30px auto; padding: 0 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
.header-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.check-btn { background-color: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold; }
.check-btn:hover { background-color: #2980b9; }

/* 表单样式 */
.add-wish-form { margin-bottom: 30px; padding: 25px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #f9f9f9; }
.form-row { display: flex; gap: 10px; margin-bottom: 15px; }
.input-large { flex: 2; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.input-small { flex: 1; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.select-condition { flex: 2; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.submit-btn { width: 100%; padding: 12px; background-color: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
.submit-btn:hover { background-color: #1a252f; }

/* 列表样式 */
.wish-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
.wish-item {
    border: 1px solid #eee;
    border-radius: 10px;
    padding: 15px;
    background: white;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
    transition: transform 0.2s;
}
.wish-item:hover { transform: translateY(-2px); box-shadow: 0 6px 12px rgba(0,0,0,0.1); }

/* 锁定样式 */
.locked-item { background-color: #fcfcfc; border-color: #ddd; }
.locked-item .item-image { filter: grayscale(80%); }
.lock-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    z-index: 2;
}

.item-main { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
.item-info { display: flex; align-items: flex-start; }
.item-image { width: 70px; height: 70px; object-fit: cover; border-radius: 6px; margin-right: 12px; }
.text-info { overflow: hidden; }
.item-title { margin: 0 0 5px 0; font-size: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.platform-tag { font-size: 12px; color: #7f8c8d; margin: 0; display: inline-block; background: #eee; padding: 2px 6px; border-radius: 4px; }
.link-text { font-size: 12px; color: #3498db; text-decoration: none; margin-left: 5px; }

.price-info { font-size: 14px; background: #f8f9fa; padding: 8px; border-radius: 4px; }
.price-row { display: flex; justify-content: space-between; }
.price-ok { color: #27ae60; font-weight: bold; }
.price-bad { color: #e74c3c; }

/* 进度条样式 */
.progress-section { margin-bottom: 10px; }
.progress-info { display: flex; justify-content: space-between; font-size: 12px; color: #666; margin-bottom: 4px; }
.progress-bar-bg { width: 100%; height: 8px; background-color: #ecf0f1; border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; transition: width 0.5s ease; }

.action-row { text-align: right; }
.delete-button { background: none; border: none; color: #95a5a6; cursor: pointer; font-size: 12px; text-decoration: underline; }
.delete-button:hover { color: #e74c3c; }

.error-message { color: #e74c3c; background: #fadbd8; padding: 10px; border-radius: 4px; }
.success-message { color: #27ae60; background: #d5f5e3; padding: 10px; border-radius: 4px; }
</style>