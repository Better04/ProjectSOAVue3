<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { useDisplay } from 'vuetify';

// ----------------------------------------
// State & Logic (保持核心业务逻辑不变)
// ----------------------------------------
const wishes = ref([]);
const loading = ref(true);
const errorMessage = ref(''); 
const currentUser = ref(null);
const userTotalStars = ref(0);

// 表单相关
const newWishUrl = ref('');
const newTargetPrice = ref('');
const newConditionType = ref('');
const newTargetValue = ref('');
const addMessage = ref('');
const showAddDialog = ref(false);

// ----------------------------------------
// [NEW] 全局提示与确认框状态
// ----------------------------------------
// 1. Snackbar (Toast提示) 状态
const snackbar = ref({
  show: false,
  text: '',
  color: 'primary',
  icon: 'mdi-information'
});

// 2. 删除确认框状态
const deleteDialog = ref(false);
const wishToDeleteId = ref(null);
const deleteLoading = ref(false);

// 辅助函数：显示提示
const showToast = (text, type = 'success') => {
  const config = {
    success: { color: 'success', icon: 'mdi-check-circle' },
    error: { color: 'error', icon: 'mdi-alert-circle' },
    info: { color: 'primary', icon: 'mdi-information' }
  };
  const theme = config[type] || config.info;
  
  snackbar.value = {
    show: true,
    text: text,
    color: theme.color,
    icon: theme.icon
  };
};

const conditionOptions = [
    { title: '无 (直接解锁)', value: '' },
    { title: '本周代码提交次数 (Weekly Commits)', value: 'weekly_commits' },
    { title: 'GitHub 仓库获赞数 (Total Stars)', value: 'total_stars' }
];

// 响应式布局工具
const { name } = useDisplay();

// ----------------------------------------
// 分页/轮播逻辑
// ----------------------------------------
const currentPage = ref(0);
const itemsPerPage = computed(() => {
    switch (name.value) {
        case 'xs': return 1;
        case 'sm': return 2;
        default: return 3;
    }
});
const totalPages = computed(() => Math.ceil(wishes.value.length / itemsPerPage.value));
const visibleWishes = computed(() => {
    const start = currentPage.value * itemsPerPage.value;
    const end = start + itemsPerPage.value;
    return wishes.value.slice(start, end);
});
const nextPage = () => {
    if (currentPage.value < totalPages.value - 1) currentPage.value++;
};
const prevPage = () => {
    if (currentPage.value > 0) currentPage.value--;
};
watch([wishes, itemsPerPage], () => {
    if (currentPage.value >= totalPages.value) {
        currentPage.value = Math.max(0, totalPages.value - 1);
    }
});

// ----------------------------------------
// API Actions
// ----------------------------------------

const fetchUserInfo = async () => {
    try {
        const res = await axios.get('/api/user/info');
        currentUser.value = res.data;
        if (currentUser.value?.username) {
            fetchUserStars(currentUser.value.username);
        }
    } catch (error) {
        console.error("获取用户信息失败", error);
    }
};

const fetchUserStars = async (username) => {
    try {
        const res = await axios.get(`/api/devinfo/repos/${username}`);
        const repos = res.data.data || [];
        userTotalStars.value = repos.reduce((sum, repo) => sum + (repo.stars || 0), 0);
    } catch (error) {
        console.error("获取Star数据失败", error);
    }
};

const fetchWishes = async () => {
    loading.value = true;
    errorMessage.value = '';
    try {
        const response = await axios.get('/api/wishlist/'); 
        wishes.value = response.data.data || [];
    } catch (error) {
        errorMessage.value = error.response?.data?.message || '获取心愿单失败，请检查登录状态或网络。';
    } finally {
        loading.value = false;
    }
};

const addNewWish = async () => {
    addMessage.value = '';
    
    if (!newWishUrl.value || !newTargetPrice.value) {
        addMessage.value = 'URL和期望价格不能为空。';
        return;
    }

    try {
        const payload = {
            url: newWishUrl.value,
            target_price: parseFloat(newTargetPrice.value),
            condition_type: newConditionType.value || null,
            target_value: newTargetValue.value ? parseInt(newTargetValue.value) : 0
        };

        await axios.post('/api/wishlist/', payload);

        newWishUrl.value = '';
        newTargetPrice.value = '';
        newConditionType.value = '';
        newTargetValue.value = '';
        showAddDialog.value = false;
        
        showToast('新愿望已添加！为了目标冲刺吧！', 'success');
        
        await fetchWishes(); 

    } catch (error) {
        addMessage.value = error.response?.data?.message || '添加失败，请检查输入。';
    }
};

const openDeleteConfirm = (wish_id) => {
    wishToDeleteId.value = wish_id;
    deleteDialog.value = true;
};

const confirmDelete = async () => {
    if (!wishToDeleteId.value) return;
    
    deleteLoading.value = true;
    try {
        await axios.delete(`/api/wishlist/${wishToDeleteId.value}`);
        wishes.value = wishes.value.filter(w => w.wish_id !== wishToDeleteId.value);
        
        deleteDialog.value = false;
        showToast('心愿已删除', 'success');
    } catch (error) {
        deleteDialog.value = false;
        showToast(error.response?.data?.message || '删除失败', 'error');
    } finally {
        deleteLoading.value = false;
        wishToDeleteId.value = null;
    }
};

const checkUnlockStatus = async () => {
    showToast('正在同步 GitHub 数据...', 'info');
    try {
        const res = await axios.post('/api/wishlist/check-status');
        showToast(res.data.message || '状态同步完成！', 'success');
        await fetchWishes();
    } catch (error) {
        showToast(error.response?.data?.message || '检查失败', 'error');
    }
};

// ----------------------------------------
// Helper Logic
// ----------------------------------------

const getProgress = (wish) => {
    if (wish.is_unlocked) return 100;
    if (!wish.unlock_condition_type) return 100;

    let current = 0;
    const target = wish.unlock_target_value || 1;

    if (wish.unlock_condition_type === 'total_stars') {
        current = userTotalStars.value;
    }

    let percent = (current / target) * 100;
    return Math.min(100, Math.max(0, percent));
};

const getProgressText = (wish) => {
    if (wish.is_unlocked) return '已解锁';
    if (wish.unlock_condition_type === 'total_stars') {
        return `当前: ${userTotalStars.value} Stars / 目标: ${wish.unlock_target_value}`;
    }
    if (wish.unlock_condition_type === 'weekly_commits') {
        return `需本周提交 ${wish.unlock_target_value} 次`;
    }
    return '进行中';
};

onMounted(async () => {
    await fetchUserInfo();
    await fetchWishes();
});
</script>

<template>
  <v-container fluid class="fill-height align-start pa-0 bg-surface-light">
    
    <div class="hero-section w-100 py-2 px-4 px-md-16 bg-white">
      <v-container style="max-width: 1400px;">
        <v-row align="center" justify="space-between">
          <v-col cols="12" md="6" class="pr-md-10">
            <div class="animate__animated animate__fadeInLeft">
              <v-chip color="secondary" variant="flat" size="small" class="mb-4 font-weight-bold">
                WISHwithCODE
              </v-chip>
              <h1 class="text-h3 font-weight-black text-primary mb-4" style="line-height: 1.2;">
                让心愿与代码<br/>一同成长
              </h1>
              <p class="text-h6 text-grey-darken-1 mb-8" style="line-height: 1.6;">
                这是属于开发者的专属心愿单。设定目标，追踪代码贡献，当你的技术影响力（Stars/Commits）达成成就时，奖励自己心仪已久的礼物。
              </p>
              
              <div class="d-flex flex-wrap gap-4">
                <v-dialog v-model="showAddDialog" max-width="600">
                  <template v-slot:activator="{ props }">
                    <v-btn
                      v-bind="props"
                      color="primary"
                      size="x-large"
                      elevation="4"
                      rounded="lg"
                      prepend-icon="mdi-plus-circle"
                    >
                      添加新心愿
                    </v-btn>
                  </template>
                  
                  <v-card class="rounded-xl">
                    <v-card-title class="text-h5 pa-6 pb-0 font-weight-bold">添加心愿清单</v-card-title>
                    <v-card-text class="pa-6">
                      <v-form @submit.prevent="addNewWish">
                        <v-text-field
                          v-model="newWishUrl"
                          label="商品链接 (支持 Steam/京东/淘宝)"
                          prepend-inner-icon="mdi-link-variant"
                          variant="outlined"
                          color="primary"
                          class="mb-3"
                        ></v-text-field>
                        
                        <v-text-field
                          v-model="newTargetPrice"
                          label="期望价格 (¥)"
                          type="number"
                          prefix="¥"
                          step="0.01"
                          prepend-inner-icon="mdi-currency-usd"
                          variant="outlined"
                          color="primary"
                          class="mb-3"
                        ></v-text-field>

                        <v-select
                          v-model="newConditionType"
                          :items="conditionOptions"
                          label="解锁挑战 (可选)"
                          prepend-inner-icon="mdi-trophy-outline"
                          variant="outlined"
                          color="primary"
                          class="mb-3"
                        ></v-select>

                        <v-expand-transition>
                          <div v-if="newConditionType">
                            <v-text-field
                              v-model="newTargetValue"
                              label="挑战目标数值"
                              type="number"
                              prepend-inner-icon="mdi-flag-checkered"
                              variant="outlined"
                              color="secondary"
                              hint="例如：达到 100 个 Star 后自动解锁"
                              persistent-hint
                            ></v-text-field>
                          </div>
                        </v-expand-transition>

                        <v-alert v-if="addMessage" type="warning" variant="tonal" class="mt-4" icon="mdi-alert">
                          {{ addMessage }}
                        </v-alert>
                      </v-form>
                    </v-card-text>
                    <v-card-actions class="pa-6 pt-0 justify-end">
                      <v-btn variant="text" size="large" @click="showAddDialog = false">取消</v-btn>
                      <v-btn color="primary" variant="flat" size="large" @click="addNewWish">确认添加</v-btn>
                    </v-card-actions>
                  </v-card>
                </v-dialog>

                <v-btn
                  variant="outlined"
                  size="x-large"
                  rounded="lg"
                  color="grey-darken-3"
                  prepend-icon="mdi-refresh"
                  @click="checkUnlockStatus"
                >
                  刷新成就状态
                </v-btn>
              </div>
            </div>
          </v-col>

          <v-col cols="12" md="6" class="position-relative">
            <v-card
              elevation="20"
              rounded="xl"
              class="hero-image-card animate__animated animate__fadeInRight"
              max-height="300"
            >
              <v-img
                src="/img/back.jpg" 
                cover
                height="100%"
                min-height="400"
                class="align-end"
              >
                <template v-slot:placeholder>
                  <div class="d-flex align-center justify-center fill-height bg-grey-lighten-4">
                    <v-progress-circular indeterminate color="grey-lighten-2"></v-progress-circular>
                  </div>
                </template>
              </v-img>
            </v-card>
            <div class="decorative-circle bg-secondary"></div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <v-container style="max-width: 1400px;" class="py-12">
      <div class="d-flex align-center justify-space-between mb-8">
        <div>
          <h2 class="text-h4 font-weight-bold text-grey-darken-3">我的清单</h2>
          <div class="text-subtitle-1 text-grey">
            当前共有 {{ wishes.length }} 个心愿 · 
            <span class="text-primary font-weight-bold">{{ wishes.filter(w => w.is_unlocked).length }}</span> 个已解锁
          </div>
        </div>
        
        <div class="d-flex gap-2" v-if="wishes.length > 0">
          <v-btn 
            icon="mdi-chevron-left" 
            variant="tonal" 
            :disabled="currentPage === 0"
            @click="prevPage"
          ></v-btn>
          <v-btn 
            icon="mdi-chevron-right" 
            variant="tonal"
            :disabled="currentPage >= totalPages - 1"
            @click="nextPage"
          ></v-btn>
        </div>
      </div>

      <v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-6">{{ errorMessage }}</v-alert>

      <div v-if="loading" class="d-flex justify-center pa-12">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
      </div>

      <v-sheet v-else-if="wishes.length === 0" class="text-center pa-12 rounded-xl border bg-white">
        <v-icon icon="mdi-gift-open-outline" size="80" color="grey-lighten-2" class="mb-4"></v-icon>
        <h3 class="text-h6 text-grey">暂时没有心愿，快去添加吧！</h3>
      </v-sheet>

      <v-window v-else v-model="currentPage" class="wish-window overflow-visible">
        <v-window-item
          v-for="n in totalPages"
          :key="n"
          :value="n - 1"
          class="pa-2"
        >
          <v-row>
            <v-col
              v-for="wish in visibleWishes"
              :key="wish.wish_id"
              cols="12"
              sm="6"
              md="4"
            >
              <v-card
                class="wish-card h-60 rounded-xl"
                elevation="3"
                border
              >
                <div class="position-relative">
                  <v-img
                    :src="wish.image_url"
                    height="120"
                    cover
                    class="align-start justify-end pa-2"
                  >
                    <v-chip
                      v-if="!wish.is_unlocked"
                      color="grey-darken-4"
                      prepend-icon="mdi-lock"
                      variant="flat"
                      size="small"
                      class="font-weight-bold"
                    >
                      锁定中
                    </v-chip>
                    <v-chip
                      v-else
                      color="success"
                      prepend-icon="mdi-lock-open-check"
                      variant="flat"
                      size="small"
                      class="font-weight-bold"
                    >
                      可购买
                    </v-chip>
                  </v-img>
                  
                  <div class="platform-badge bg-surface elevation-2">
                    <span class="text-caption font-weight-black">{{ wish.platform }}</span>
                  </div>
                </div>

                <v-card-item class="pt-5">
                  <v-card-title class="text-h6 font-weight-bold text-truncate mb-1">
                    {{ wish.title }}
                  </v-card-title>
                  <v-card-subtitle>
                    <div class="d-flex align-center justify-space-between mt-1">
                      <div>
                        <span class="text-caption text-grey mr-2">期望</span>
                        <span class="text-body-1 font-weight-bold">¥{{ wish.target_price.toFixed(2) }}</span>
                      </div>
                      <div class="text-right">
                        <span class="text-caption text-grey mr-2">当前</span>
                        <span 
                          class="text-h6 font-weight-black"
                          :class="wish.status === '低于目标' ? 'text-green-darken-1' : 'text-red-darken-1'"
                        >
                          {{ wish.latest_price ? `¥${wish.latest_price.toFixed(2)}` : '???' }}
                        </span>
                      </div>
                    </div>
                  </v-card-subtitle>
                </v-card-item>

                <v-divider class="mx-4"></v-divider>

                <v-card-text class="py-3">
                  <div v-if="wish.unlock_condition_type">
                    <div class="d-flex justify-space-between text-caption mb-1 text-medium-emphasis">
                      <span>解锁进度</span>
                      <span>{{ Math.round(getProgress(wish)) }}%</span>
                    </div>
                    <v-progress-linear
                      :model-value="getProgress(wish)"
                      :color="wish.is_unlocked ? 'success' : 'amber-darken-2'"
                      height="8"
                      rounded
                      striped
                    ></v-progress-linear>
                    <div class="text-caption text-grey mt-2 d-flex align-center">
                      <v-icon icon="mdi-target" size="x-small" class="mr-1"></v-icon>
                      {{ getProgressText(wish) }}
                    </div>
                  </div>
                  <div v-else class="text-caption text-success d-flex align-center py-2">
                    <v-icon icon="mdi-check-decagram" size="small" class="mr-2"></v-icon>
                    无条件限制，随时奖励自己！
                  </div>
                </v-card-text>

                <v-card-actions class="pa-4 pt-0 d-flex align-center">
                  <v-btn
                    class="flex-grow-1 rounded-lg"
                    :variant="wish.is_unlocked ? 'flat' : 'outlined'"
                    :color="wish.is_unlocked ? 'primary' : 'grey'"
                    :href="wish.original_url"
                    target="_blank"
                    prepend-icon="mdi-cart-outline"
                  >
                    {{ wish.is_unlocked ? '立即购买' : '查看详情' }}
                  </v-btn>
                  
                  <v-btn
                    icon="mdi-trash-can-outline"
                    variant="tonal"
                    color="orange"
                    class="ml-2 rounded-lg"
                    @click.stop="openDeleteConfirm(wish.wish_id)" 
                  ></v-btn>
                </v-card-actions>
              </v-card>
            </v-col>
          </v-row>
        </v-window-item>
      </v-window>
    </v-container>

    <v-dialog v-model="deleteDialog" max-width="400">
      <v-card class="rounded-xl pa-2 text-center">
        <v-card-text class="pt-6">
          <v-avatar color="red-lighten-5" size="80" class="mb-4">
            <v-icon icon="mdi-alert-circle-outline" size="48" color="error"></v-icon>
          </v-avatar>
          <h3 class="text-h6 font-weight-bold mb-2">确定要删除吗？</h3>
          <p class="text-body-2 text-grey">
            删除后无法恢复，该心愿的进度也将被清空。
          </p>
        </v-card-text>
        <v-card-actions class="justify-center pb-6 px-6 gap-2">
          <v-btn 
            variant="outlined" 
            class="flex-grow-1 rounded-lg" 
            size="large"
            :disabled="deleteLoading"
            @click="deleteDialog = false"
          >
            再想想
          </v-btn>
          <v-btn 
            color="error" 
            variant="flat" 
            class="flex-grow-1 rounded-lg" 
            size="large"
            :loading="deleteLoading"
            @click="confirmDelete"
          >
            确认删除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      location="top"
      rounded="pill"
      :timeout="3000"
      elevation="6"
    >
      <div class="d-flex align-center">
        <v-icon :icon="snackbar.icon" class="mr-2"></v-icon>
        <span class="font-weight-medium">{{ snackbar.text }}</span>
      </div>
      <template v-slot:actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          @click="snackbar.show = false"
        ></v-btn>
      </template>
    </v-snackbar>

  </v-container>
</template>

<style scoped>
/* 保持原有样式不变 */
.hero-image-card {
  transform: rotate(-2deg);
  transition: transform 0.3s ease;
  border: 4px solid white;
}
.hero-image-card:hover {
  transform: rotate(0deg) scale(1.02);
}

.decorative-circle {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.1;
  z-index: -1;
}

.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }

/* 平台标签样式 */
.platform-badge {
  position: absolute;
  bottom: 0;
  left: 16px;
  transform: translateY(50%);
  padding: 4px 12px;
  border-radius: 20px;
  border: 1px solid rgba(0,0,0,0.05);
}

/* 卡片悬浮效果 */
.wish-card {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.wish-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 14px 28px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.12) !important;
}

/* 解决 v-window 的 overflow 问题 */
.wish-window {
  overflow: visible !important;
}
:deep(.v-window__container) {
  overflow: visible !important;
}
</style>