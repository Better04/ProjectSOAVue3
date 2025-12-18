<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import { marked } from 'marked';
import * as echarts from 'echarts';
import { useDisplay } from 'vuetify';

// ----------------------------------------
// Lottie 动画逻辑
// ----------------------------------------
const lottieContainer = ref(null);

onMounted(async () => {
  try {
    const lottie = (await import('lottie-web')).default;
    const animationData = await fetch('/searching-food.json').then(res => res.json());
    if (lottieContainer.value) {
      lottie.loadAnimation({
        container: lottieContainer.value,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData
      });
    }
  } catch (e) {
    console.error("Lottie 动画加载失败:", e);
  }
});

// ----------------------------------------
// 状态定义
// ----------------------------------------
const searchUsername = ref('');
const loading = ref(false);
const errorMsg = ref('');

// 数据存储
const repoLanguages = ref({});
const userProfile = ref(null);
const userRepos = ref([]);

// 视图控制
const showResultDialog = ref(false); // [新] 控制结果浮层显示

// 详情弹窗相关
const currentReadme = ref('');
const currentRepoDetails = ref(null);
const currentRepoName = ref('');
const showReadmeModal = ref(false);
const showDetailsModal = ref(false);
const detailsLoading = ref(false);

// 单仓库分析相关状态
const repoAnalysis = ref(null);
const analyzingRepo = ref(false);
const showRepoAnalysis = ref(false);

// 图表 DOM 引用
const gaugeChartRef = ref(null);
const radarChartRef = ref(null);
const barChartRef = ref(null);
let chartsInstance = []; 

// ----------------------------------------
// [修改] 推荐列表 (10个用户, 纯列表形式)
// ----------------------------------------
const recommendedList = ref([
    { name: 'yyx990803', label: 'Evan You', desc: 'Vue.js & Vite 作者', avatar: 'https://avatars.githubusercontent.com/u/499550?v=4' },
    { name: 'antfu', label: 'Anthony Fu', desc: 'Vue 核心成员, Vitest, Unocss', avatar: 'https://avatars.githubusercontent.com/u/11247099?v=4' },
    { name: 'torvalds', label: 'Linus Torvalds', desc: 'Linux & Git 之父', avatar: 'https://avatars.githubusercontent.com/u/1024025?v=4' },
    { name: 'gaearon', label: 'Dan Abramov', desc: 'Redux 作者, React 核心团队', avatar: 'https://avatars.githubusercontent.com/u/810438?v=4' },
    { name: 'sindresorhus', label: 'Sindre Sorhus', desc: '全职开源开发者, 1000+ npm 包', avatar: 'https://avatars.githubusercontent.com/u/170270?v=4' },
    { name: 'tj', label: 'TJ Holowaychuk', desc: 'Express, Koa, Commander 作者', avatar: 'https://avatars.githubusercontent.com/u/25254?v=4' },
    { name: 'Rich-Harris', label: 'Rich Harris', desc: 'Svelte 框架作者', avatar: 'https://avatars.githubusercontent.com/u/1162160?v=4' },
    { name: 'posva', label: 'Eduardo San Martin Morote', desc: 'Vue Router & Pinia 作者', avatar: 'https://avatars.githubusercontent.com/u/664177?v=4' },
    { name: 'addyosmani', label: 'Addy Osmani', desc: 'Google Chrome 工程负责人', avatar: 'https://avatars.githubusercontent.com/u/110953?v=4' },
    { name: 'sdras', label: 'Sarah Drasner', desc: 'Google 工程总监, Vue 核心成员', avatar: 'https://avatars.githubusercontent.com/u/2281088?v=4' }
]);

const quickAnalyze = (targetName) => {
    searchUsername.value = targetName;
    handleSearch();
};

// ----------------------------------------
// 辅助函数
// ----------------------------------------
const parseGithubUrl = (input) => {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = input.match(regex);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
};

const getLanguageStats = (langs) => {
  if (!langs || Object.keys(langs).length === 0) return [];
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  const colors = {
    'Vue': '#41b883', 'JavaScript': '#f1e05a', 'TypeScript': '#2b7489',
    'HTML': '#e34c26', 'CSS': '#563d7c', 'Python': '#3572A5',
    'Java': '#b07219', 'Go': '#00ADD8', 'C++': '#f34b7d', 'C': '#555555'
  };
  return Object.entries(langs)
    .map(([name, bytes]) => ({
        name,
        percent: ((bytes / total) * 100).toFixed(1),
        color: colors[name] || '#9e9e9e'
      }))
    .sort((a, b) => b.percent - a.percent);
};

// ----------------------------------------
// 动作: 搜索
// ----------------------------------------
const handleSearch = async () => {
  if (!searchUsername.value) return;
  loading.value = true;
  errorMsg.value = '';
  // userProfile.value = null; // 不再清空，改为弹窗覆盖
  
  let targetOwner = searchUsername.value;
  let targetRepo = null;

  const urlInfo = parseGithubUrl(searchUsername.value);
  if (urlInfo) {
    targetOwner = urlInfo.owner;
    targetRepo = urlInfo.repo;
    searchUsername.value = targetOwner; 
  }

  try {
    const profileRes = await axios.get(`/api/devinfo/profile/${targetOwner}`);
    userProfile.value = profileRes.data.data;
    
    const reposRes = await axios.get(`/api/devinfo/repos/${targetOwner}`);
    userRepos.value = reposRes.data.data;

    // 成功获取数据后，打开浮动层
    showResultDialog.value = true;

    if (targetRepo) {
      // 这里的 viewRepoDetails 会打开二级弹窗，Vuetify 支持弹窗叠加
      await viewRepoDetails(targetRepo, targetOwner);
    }
  } catch (err) {
    console.error(err);
    if (err.response && err.response.status === 404) {
      errorMsg.value = '未找到该用户或仓库，请检查拼写。';
    } else {
      errorMsg.value = '网络请求失败，请稍后重试。';
    }
  } finally {
    loading.value = false;
  }
};

const viewReadme = async (repoName) => {
  if (!userProfile.value) return;
  const owner = userProfile.value.username;
  currentRepoName.value = repoName;
  currentReadme.value = '正在加载文档...';
  showReadmeModal.value = true;
  try {
    const res = await axios.get(`/api/devinfo/readme/${owner}/${repoName}`);
    currentReadme.value = res.data.data;
  } catch (err) {
    currentReadme.value = '无法获取该项目的 README 文档。';
  }
};

const viewRepoDetails = async (repoName, specificOwner = null) => {
  const owner = specificOwner || (userProfile.value ? userProfile.value.username : null);
  if (!owner) return;

  currentRepoName.value = repoName;
  showDetailsModal.value = true;
  detailsLoading.value = true;
  currentRepoDetails.value = null;
  repoLanguages.value = {};

  try {
    const [detailsRes, langsRes] = await Promise.all([
      axios.get(`/api/devinfo/details/${owner}/${repoName}`),
      axios.get(`/api/devinfo/languages/${owner}/${repoName}`)
    ]);
    currentRepoDetails.value = detailsRes.data.data;
    repoLanguages.value = langsRes.data.data;
  } catch (err) {
    console.error(err);
  } finally {
    detailsLoading.value = false;
  }
};

// ----------------------------------------
// [核心] 触发 AI 单仓库深度分析
// ----------------------------------------
const analyzeCurrentRepo = async () => {
    if (!currentRepoName.value || !userProfile.value) return;
    
    analyzingRepo.value = true;
    repoAnalysis.value = null;
    
    const owner = userProfile.value.username;
    const repo = currentRepoName.value;

    try {
        const res = await axios.get(`/api/ai/analyze/repo/${owner}/${repo}`);
        repoAnalysis.value = res.data.data;
        showRepoAnalysis.value = true;
        
        await nextTick();
        initRepoCharts();
        
    } catch (e) {
        alert("分析失败: " + (e.response?.data?.message || e.message));
    } finally {
        analyzingRepo.value = false;
    }
};

const initRepoCharts = () => {
    if (!repoAnalysis.value) return;
    
    chartsInstance.forEach(c => c.dispose());
    chartsInstance = [];

    const data = repoAnalysis.value;

    // 1. 仪表盘
    if (gaugeChartRef.value) {
        const gaugeChart = echarts.init(gaugeChartRef.value);
        gaugeChart.setOption({
            series: [{
                type: 'gauge',
                startAngle: 200, endAngle: -20,
                min: 0, max: 100,
                splitNumber: 5,
                itemStyle: { color: '#58D9F9' },
                progress: { show: true, width: 15 },
                pointer: { show: false },
                axisLine: { lineStyle: { width: 15 } },
                axisTick: { show: false },
                splitLine: { length: 8, lineStyle: { width: 2, color: '#999' } },
                axisLabel: { distance: 12, color: '#999', fontSize: 10 },
                detail: {
                    valueAnimation: true,
                    fontSize: 36,
                    fontWeight: 'bolder',
                    formatter: '{value}分',
                    color: 'auto',
                    offsetCenter: [0, '30%']
                },
                data: [{ value: data.overall_score }]
            }]
        });
        chartsInstance.push(gaugeChart);
    }

    // 2. 雷达图
    if (radarChartRef.value && data.radar_data) {
        const radarChart = echarts.init(radarChartRef.value);
        const radarData = data.radar_data;
        radarChart.setOption({
            radar: {
                indicator: [
                    { name: '功能完备', max: 100 },
                    { name: '代码规范', max: 100 },
                    { name: '文档质量', max: 100 },
                    { name: '社区热度', max: 100 },
                    { name: '创新价值', max: 100 }
                ],
                radius: '65%',
                center: ['50%', '55%'],
            },
            series: [{
                name: '能力评估',
                type: 'radar',
                data: [{
                    value: [
                        radarData.functionality, 
                        radarData.code_quality, 
                        radarData.documentation,
                        radarData.influence,
                        radarData.innovation
                    ],
                    name: currentRepoName.value,
                    areaStyle: { color: 'rgba(128, 90, 213, 0.4)' },
                    itemStyle: { color: '#805AD5' }
                }]
            }]
        });
        chartsInstance.push(radarChart);
    }

    // 3. 柱状图
    if (barChartRef.value && data.scenarios) {
        const barChart = echarts.init(barChartRef.value);
        const scenarios = data.scenarios;
        barChart.setOption({
            grid: { top: 10, bottom: 20, left: 100, right: 40 },
            xAxis: { 
                type: 'value', 
                max: 100,
                splitLine: { show: false }
            },
            yAxis: { 
                type: 'category', 
                data: scenarios.map(s => s.name),
                axisLabel: { interval: 0 },
                axisTick: { show: false },
                axisLine: { show: false }
            },
            series: [{
                type: 'bar',
                data: scenarios.map(s => s.score),
                label: { show: true, position: 'right' },
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
                        { offset: 0, color: '#83bff6' },
                        { offset: 1, color: '#188df0' }
                    ]),
                    borderRadius: [0, 10, 10, 0]
                },
                barWidth: 20
            }]
        });
        chartsInstance.push(barChart);
    }

    window.addEventListener('resize', () => chartsInstance.forEach(c => c.resize()));
};

const isRepoActive = (dateString) => {
  if (!dateString) return false;
  const updateDate = new Date(dateString);
  const currentDate = new Date();
  const diffTime = Math.abs(currentDate - updateDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays <= 180; 
};
</script>

<template>
  <v-container fluid class="fill-height align-start pa-0 bg-surface-light" style="min-height: 100vh;">
    
    <div class="hero-section w-100 py-8 px-4 px-md-16 bg-white border-b-sm">
      <v-container style="max-width: 1400px;">
        <v-row align="center" justify="space-between">
          <v-col cols="12" md="6" class="pr-md-10">
            <div class="animate__animated animate__fadeInLeft">
              <v-chip color="secondary" variant="flat" size="small" class="mb-4 font-weight-bold">
                GITHUB INTELLIGENCE
              </v-chip>
              <h1 class="text-h3 font-weight-black text-primary mb-4" style="line-height: 1.2;">
                GitHub 情报侦察<br/>深度分析
              </h1>
              <p class="text-h6 text-grey-darken-1 mb-8" style="line-height: 1.6;">
                输入 GitHub 用户名或仓库链接，一键获取开发者画像、代码质量分析及 AI 深度评估。让数据说话，发现开源世界的价值。
              </p>
              
              <div class="search-area d-flex align-center gap-2" style="max-width: 500px;">
                <v-text-field
                  v-model="searchUsername"
                  label="输入用户名 或 仓库链接"
                  placeholder="例如: vuejs/core 或 antfu"
                  variant="outlined"
                  rounded="lg"
                  density="comfortable"
                  hide-details
                  prepend-inner-icon="mdi-github"
                  bg-color="grey-lighten-5"
                  color="primary"
                  @keyup.enter="handleSearch"
                ></v-text-field>
                <v-btn
                  color="primary"
                  size="large"
                  height="48"
                  rounded="lg"
                  :loading="loading"
                  @click="handleSearch"
                  elevation="2"
                >
                  开始侦察
                </v-btn>
              </div>
              <div v-if="errorMsg" class="text-error mt-2 font-weight-bold">{{ errorMsg }}</div>
            </div>
          </v-col>

          <v-col cols="12" md="6" class="position-relative d-flex justify-center justify-md-end">
             <div ref="lottieContainer" style="width: 100%; max-width: 450px; height: 350px;"></div>
             <div class="decorative-circle bg-secondary"></div>
          </v-col>
        </v-row>
      </v-container>
    </div>

    <v-container style="max-width: 1400px;" class="py-8">
        
        <v-overlay :model-value="loading" class="align-center justify-center" persistent>
            <v-card class="pa-5 text-center rounded-xl" elevation="3">
              <v-progress-circular indeterminate color="primary" size="64" class="mb-3"></v-progress-circular>
              <div class="text-subtitle-1 font-weight-bold text-grey-darken-2">
                正在连接 GitHub 数据中枢...
              </div>
            </v-card>
        </v-overlay>

        <div class="animate__animated animate__fadeInUp">
            <div class="d-flex align-center mb-6">
                <v-icon icon="mdi-account-search-outline" color="grey-darken-2" class="mr-2"></v-icon>
                <h3 class="text-h6 font-weight-bold text-grey-darken-2">热门搜索推荐</h3>
            </div>

            <v-row>
                <v-col cols="12" md="6">
                    <v-list class="bg-transparent" lines="two">
                        <v-list-item
                            v-for="(item, index) in recommendedList.slice(0, 5)"
                            :key="index"
                            :prepend-avatar="item.avatar"
                            class="mb-2 rounded-lg list-item-hover"
                            @click="quickAnalyze(item.name)"
                            link
                        >
                            <v-list-item-title class="font-weight-bold text-primary">
                                {{ item.label }}
                                <span class="text-caption text-grey ml-2">@{{ item.name }}</span>
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-caption text-grey-darken-1 mt-1">
                                {{ item.desc }}
                            </v-list-item-subtitle>
                            <template v-slot:append>
                                <v-icon icon="mdi-magnify" size="small" color="grey-lighten-1"></v-icon>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-col>
                <v-col cols="12" md="6">
                    <v-list class="bg-transparent" lines="two">
                        <v-list-item
                            v-for="(item, index) in recommendedList.slice(5, 10)"
                            :key="index"
                            :prepend-avatar="item.avatar"
                            class="mb-2 rounded-lg list-item-hover"
                            @click="quickAnalyze(item.name)"
                            link
                        >
                            <v-list-item-title class="font-weight-bold text-primary">
                                {{ item.label }}
                                <span class="text-caption text-grey ml-2">@{{ item.name }}</span>
                            </v-list-item-title>
                            <v-list-item-subtitle class="text-caption text-grey-darken-1 mt-1">
                                {{ item.desc }}
                            </v-list-item-subtitle>
                            <template v-slot:append>
                                <v-icon icon="mdi-magnify" size="small" color="grey-lighten-1"></v-icon>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-col>
            </v-row>
        </div>
    </v-container>

    <v-dialog 
        v-model="showResultDialog" 
        fullscreen 
        transition="dialog-bottom-transition"
        scrollable
    >
        <v-card class="bg-grey-lighten-5">
            <v-toolbar color="primary" density="comfortable">
                <v-btn icon="mdi-arrow-left" @click="showResultDialog = false"></v-btn>
                <v-toolbar-title class="font-weight-bold">
                    GitHub 侦察报告：{{ userProfile?.username }}
                </v-toolbar-title>
                <v-spacer></v-spacer>
                <v-btn icon="mdi-close" @click="showResultDialog = false"></v-btn>
            </v-toolbar>

            <v-card-text class="pa-4 pa-md-8">
                <v-container style="max-width: 1400px;" class="pa-0">
                    <div v-if="userProfile" class="animate__animated animate__fadeIn">
                        <v-row>
                            <v-col cols="12" md="4" lg="3">
                                <v-card class="rounded-xl profile-card sticky-card" elevation="3" border>
                                    <div class="bg-white pt-8 pb-4 px-4 text-center rounded-xl position-relative">
                                        <v-avatar size="120" class="elevation-4 mb-4">
                                            <v-img :src="userProfile.avatar_url" alt="Avatar"></v-img>
                                        </v-avatar>
                                        <div class="text-h5 font-weight-black text-grey-darken-4 mb-1">
                                            {{ userProfile.name || userProfile.username }}
                                        </div>
                                        <div class="text-subtitle-1 text-primary font-weight-bold">@{{ userProfile.username }}</div>
                                    </div>

                                    <v-card-text class="text-center pt-0 pb-6">
                                        <p class="text-body-2 text-grey-darken-1 mb-6 px-4" v-if="userProfile.bio">
                                            {{ userProfile.bio }}
                                        </p>

                                        <div class="d-flex justify-space-around py-4 bg-grey-lighten-4 rounded-lg mb-6 mx-2">
                                            <div>
                                                <div class="text-h6 font-weight-black text-grey-darken-3">{{ userProfile.public_repos }}</div>
                                                <div class="text-caption font-weight-bold text-grey">仓库</div>
                                            </div>
                                            <div>
                                                <div class="text-h6 font-weight-black text-grey-darken-3">{{ userProfile.followers }}</div>
                                                <div class="text-caption font-weight-bold text-grey">粉丝</div>
                                            </div>
                                        </div>

                                        <div class="d-flex flex-column gap-3 px-2">
                                            <v-btn
                                                :to="{ name: 'report', params: { username: userProfile.username } }"
                                                block
                                                color="primary"
                                                variant="flat"
                                                size="large"
                                                rounded="lg"
                                                prepend-icon="mdi-brain"
                                            >
                                                生成 AI 深度报告
                                            </v-btn>
                                            
                                            <v-btn
                                                :href="userProfile.html_url"
                                                target="_blank"
                                                block
                                                variant="outlined"
                                                color="grey-darken-1"
                                                size="large"
                                                rounded="lg"
                                                prepend-icon="mdi-github"
                                            >
                                                GitHub 主页
                                            </v-btn>
                                        </div>
                                    </v-card-text>
                                </v-card>
                            </v-col>

                            <v-col cols="12" md="8" lg="9">
                                <div class="d-flex align-center justify-space-between mb-6 mt-4 mt-md-0">
                                    <h2 class="text-h5 font-weight-bold text-grey-darken-3">
                                        <v-icon icon="mdi-source-branch" class="mr-2" color="primary"></v-icon>
                                        公开仓库 ({{ userRepos.length }})
                                    </h2>
                                </div>

                                <v-row>
                                    <v-col 
                                        v-for="repo in userRepos" 
                                        :key="repo.name" 
                                        cols="12" lg="6" xl="4"
                                    >
                                        <v-card class="rounded-xl h-100 repo-card bg-white" elevation="1" border>
                                            <v-card-item>
                                                <div class="d-flex justify-space-between align-start mb-2">
                                                    <div class="d-flex align-center text-h6 font-weight-bold text-grey-darken-3 text-truncate pr-2" style="max-width: 85%;">
                                                        <span class="text-truncate mr-2">{{ repo.name }}</span>
                                                        
                                                        <v-chip
                                                            v-if="isRepoActive(repo.updated_at)"
                                                            color="success"
                                                            variant="flat"
                                                            size="x-small"
                                                            label
                                                            class="font-weight-bold px-1"
                                                            style="height: 20px;"
                                                        >
                                                            Active
                                                        </v-chip>
                                                        <v-chip
                                                            v-else
                                                            color="grey-lighten-1"
                                                            variant="outlined"
                                                            size="x-small"
                                                            label
                                                            class="px-1"
                                                            style="height: 20px; font-size: 10px;"
                                                        >
                                                            Archived
                                                        </v-chip>
                                                    </div>

                                                    <v-chip size="x-small" color="amber-darken-2" variant="tonal" prepend-icon="mdi-star" class="font-weight-bold shrink-0">
                                                        {{ repo.stars }}
                                                    </v-chip>
                                                </div>
                                                <div class="d-flex align-center mb-3">
                                                    <v-chip 
                                                        v-if="repo.language" 
                                                        size="x-small" 
                                                        class="mr-2 font-weight-bold"
                                                        color="blue-grey-lighten-4"
                                                        text-color="blue-grey-darken-2"
                                                        variant="flat"
                                                    >
                                                        {{ repo.language }}
                                                    </v-chip>
                                                    <span class="text-caption text-grey">
                                                        {{ new Date(repo.updated_at).toLocaleDateString() }}
                                                    </span>
                                                </div>
                                                <p class="text-body-2 text-grey-darken-1 line-clamp-2" style="height: 40px;">
                                                    {{ repo.description || '暂无描述' }}
                                                </p>
                                            </v-card-item>

                                            <v-divider></v-divider>

                                            <v-card-actions class="pa-4">
                                                <v-btn 
                                                    variant="tonal" 
                                                    color="primary" 
                                                    size="small" 
                                                    class="flex-grow-1 font-weight-bold"
                                                    prepend-icon="mdi-chart-line"
                                                    @click="viewRepoDetails(repo.name)"
                                                >
                                                    详细情报
                                                </v-btn>
                                                <v-btn 
                                                    variant="text" 
                                                    color="grey-darken-1" 
                                                    size="small"
                                                    icon="mdi-file-document-outline"
                                                    @click="viewReadme(repo.name)"
                                                    v-tooltip:top="'README'"
                                                ></v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </v-col>
                                </v-row>
                            </v-col>
                        </v-row>
                    </div>
                </v-container>
            </v-card-text>
        </v-card>
    </v-dialog>

    <v-dialog v-model="showReadmeModal" max-width="900" scrollable>
      <v-card class="rounded-xl">
        <v-toolbar color="surface" density="compact" class="border-b">
          <v-toolbar-title class="text-subtitle-1 font-weight-bold">
            <v-icon icon="mdi-file-document" class="mr-2" color="primary"></v-icon>
            {{ currentRepoName }} - README.md
          </v-toolbar-title>
          <v-btn icon="mdi-close" variant="text" @click="showReadmeModal = false"></v-btn>
        </v-toolbar>
        <v-card-text class="pa-6" style="min-height: 400px; max-height: 70vh;">
            <div class="markdown-body" v-html="marked.parse(currentReadme)"></div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDetailsModal" max-width="800" scrollable style="z-index: 2500;">
      <v-card class="rounded-xl">
        <v-toolbar color="primary" class="px-2">
          <v-toolbar-title class="font-weight-bold">
             {{ currentRepoName }} - 深度情报
          </v-toolbar-title>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsModal = false"></v-btn>
        </v-toolbar>

        <v-card-text class="pa-0 bg-grey-lighten-5" style="max-height: 80vh;">
            <div v-if="detailsLoading" class="d-flex flex-column align-center justify-center pa-12">
                <v-progress-circular indeterminate color="primary" size="64" class="mb-4"></v-progress-circular>
                <div class="text-grey-darken-1">正在潜入 GitHub 数据库获取情报...</div>
            </div>

            <div v-else-if="currentRepoDetails" class="pa-6">
                <v-card class="mb-6 rounded-lg bg-gradient-primary" elevation="4">
                    <v-card-text class="d-flex align-center justify-space-between">
                        <div>
                            <div class="text-h6 font-weight-bold text-white">AI 智能分析</div>
                            <div class="text-caption text-white opacity-80">基于大模型的代码质量与应用场景评估</div>
                        </div>
                        <v-btn 
                            color="white" 
                            variant="flat" 
                            class="text-primary font-weight-bold"
                            rounded="pill"
                            prepend-icon="mdi-auto-fix"
                            :loading="analyzingRepo"
                            @click="analyzeCurrentRepo"
                        >
                            {{ analyzingRepo ? '深度计算中...' : '生成透视报告' }}
                        </v-btn>
                    </v-card-text>
                </v-card>

                <v-row class="mb-2">
                    <v-col cols="4">
                        <v-card class="text-center py-4 rounded-lg" border flat>
                            <div class="text-h5 font-weight-bold text-grey-darken-3">{{ currentRepoDetails.forks_count }}</div>
                            <div class="text-caption text-grey">Forks</div>
                        </v-card>
                    </v-col>
                    <v-col cols="4">
                        <v-card class="text-center py-4 rounded-lg" border flat>
                            <div class="text-h5 font-weight-bold text-grey-darken-3">{{ currentRepoDetails.open_issues_count }}</div>
                            <div class="text-caption text-grey">Open Issues</div>
                        </v-card>
                    </v-col>
                    <v-col cols="4">
                        <v-card class="text-center py-4 rounded-lg" border flat>
                            <div class="text-h5 font-weight-bold" :class="(currentRepoDetails.recent_commit_count_4weeks || 0) > 10 ? 'text-error' : 'text-grey-darken-3'">
                                {{ currentRepoDetails.recent_commit_count_4weeks ?? '-' }}
                            </div>
                            <div class="text-caption text-grey">近4周提交</div>
                        </v-card>
                    </v-col>
                </v-row>

                <v-card class="mb-6 rounded-lg pa-4" border flat>
                    <div class="text-subtitle-1 font-weight-bold mb-3 text-grey-darken-3">语言构成</div>
                    <div class="d-flex rounded-pill overflow-hidden mb-3" style="height: 12px;">
                        <div v-for="lang in getLanguageStats(repoLanguages)" :key="lang.name" 
                             :style="{ width: lang.percent + '%', backgroundColor: lang.color }"></div>
                    </div>
                    <div class="d-flex flex-wrap gap-3">
                        <div v-for="lang in getLanguageStats(repoLanguages)" :key="lang.name" class="d-flex align-center">
                            <v-icon icon="mdi-circle" size="x-small" :color="lang.color" class="mr-1"></v-icon>
                            <span class="text-caption font-weight-medium">{{ lang.name }} {{ lang.percent }}%</span>
                        </div>
                    </div>
                </v-card>

                <v-card class="rounded-lg pa-4" border flat>
                    <div class="text-subtitle-1 font-weight-bold mb-3 text-grey-darken-3">核心贡献者 (Top 5)</div>
                    <v-list density="compact" class="bg-transparent pa-0">
                        <v-list-item v-for="c in currentRepoDetails.contributors" :key="c.login" class="px-0">
                            <template v-slot:prepend>
                                <v-avatar size="36" class="mr-3">
                                    <v-img :src="c.avatar_url"></v-img>
                                </v-avatar>
                            </template>
                            <v-list-item-title class="font-weight-bold">
                                <a :href="c.html_url" target="_blank" class="text-decoration-none text-high-emphasis">
                                    {{ c.login }}
                                </a>
                            </v-list-item-title>
                            <template v-slot:append>
                                <v-chip size="small" variant="tonal" color="success">{{ c.contributions }} commits</v-chip>
                            </template>
                        </v-list-item>
                    </v-list>
                </v-card>
            </div>
        </v-card-text>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRepoAnalysis" max-width="900" style="z-index: 2600;">
        <v-card class="rounded-xl">
            <v-card-title class="d-flex justify-space-between align-center py-4 px-6 bg-surface-light border-b">
                <span class="text-h6 font-weight-bold text-primary">
                    <v-icon icon="mdi-robot-outline" class="mr-2"></v-icon>
                    AI 仓库透视: {{ currentRepoName }}
                </span>
                <v-btn icon="mdi-close" variant="text" size="small" @click="showRepoAnalysis = false"></v-btn>
            </v-card-title>
            
            <v-card-text class="pa-6" v-if="repoAnalysis">
                <div class="bg-blue-grey-lighten-5 pa-4 rounded-lg mb-6 border-dashed">
                    <v-icon icon="mdi-format-quote-open" color="grey" class="mb-2"></v-icon>
                    <span class="text-body-1 text-grey-darken-3 font-italic">{{ repoAnalysis.summary }}</span>
                    <v-icon icon="mdi-format-quote-close" color="grey" class="ml-1"></v-icon>
                    
                    <div class="mt-3 d-flex flex-wrap gap-2">
                        <v-chip v-for="kw in repoAnalysis.keywords" :key="kw" 
                                color="primary" variant="tonal" size="small" class="font-weight-bold">
                            {{ kw }}
                        </v-chip>
                    </div>
                </div>

                <v-row>
                    <v-col cols="12" md="4">
                        <v-card class="fill-height rounded-lg" border flat>
                            <v-card-title class="text-subtitle-2 text-center text-grey-darken-2">🌟 综合推荐指数</v-card-title>
                            <div ref="gaugeChartRef" style="width: 100%; height: 250px;"></div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card class="fill-height rounded-lg" border flat>
                            <v-card-title class="text-subtitle-2 text-center text-grey-darken-2">🛡️ 五维能力模型</v-card-title>
                            <div ref="radarChartRef" style="width: 100%; height: 250px;"></div>
                        </v-card>
                    </v-col>
                    <v-col cols="12" md="4">
                        <v-card class="fill-height rounded-lg" border flat>
                            <v-card-title class="text-subtitle-2 text-center text-grey-darken-2">🎯 最佳适用场景</v-card-title>
                            <div ref="barChartRef" style="width: 100%; height: 250px;"></div>
                        </v-card>
                    </v-col>
                </v-row>
            </v-card-text>
        </v-card>
    </v-dialog>

  </v-container>
</template>

<style scoped>
/* ---------------- 基础辅助类 ---------------- */
.gap-2 { gap: 8px; }
.gap-3 { gap: 12px; }
.border-b-sm { border-bottom: 1px solid rgba(0,0,0,0.05); }
.line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* ---------------- 装饰性元素 ---------------- */
.decorative-circle {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  opacity: 0.1;
  z-index: 0;
}

/* ---------------- 卡片特效 ---------------- */
.repo-card {
    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.repo-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.08) !important;
}

/* ---------------- 列表交互特效 ---------------- */
.list-item-hover {
    transition: background-color 0.2s;
    border: 1px solid transparent;
}
.list-item-hover:hover {
    background-color: #f5f5f5 !important;
    border-color: #e0e0e0;
}

/* ---------------- Sticky Profile ---------------- */
.sticky-card {
    position: sticky;
    top: 20px; 
}

/* ---------------- Markdown 美化 ---------------- */
.markdown-body {
    font-family: 'Roboto', sans-serif;
    line-height: 1.6;
    color: #424242;
}
.markdown-body :deep(h1), .markdown-body :deep(h2) {
    border-bottom: 1px solid #eaecef;
    padding-bottom: .3em;
    margin-bottom: 16px;
}
.markdown-body :deep(pre) {
    background-color: #f6f8fa;
    border-radius: 6px;
    padding: 16px;
    overflow: auto;
}

/* ---------------- 自定义渐变背景 ---------------- */
.bg-gradient-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
</style>