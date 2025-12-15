<script setup>
import { ref, onMounted, nextTick } from 'vue';
import axios from 'axios';
import { marked } from 'marked';
import * as echarts from 'echarts'; // 🚨 确保安装: npm install echarts

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

// 详情弹窗相关
const currentReadme = ref('');
const currentRepoDetails = ref(null);
const currentRepoName = ref('');
const showReadmeModal = ref(false);
const showDetailsModal = ref(false);
const detailsLoading = ref(false);

// [任务4] 单仓库分析相关状态
const repoAnalysis = ref(null);
const analyzingRepo = ref(false);
const showRepoAnalysis = ref(false);

// 图表 DOM 引用
const gaugeChartRef = ref(null);
const radarChartRef = ref(null);
const barChartRef = ref(null);
let chartsInstance = []; // 存储图表实例以便销毁

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
        color: colors[name] || '#ededed'
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

    if (targetRepo) {
      await viewRepoDetails(targetRepo, targetOwner);
    }
  } catch (err) {
    console.error(err);
    if (err.response && err.response.status === 404) {
      errorMsg.value = '未找到该用户或仓库，请检查拼写。';
      userProfile.value = null;
      userRepos.value = [];
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

const closeReadme = () => {
  showReadmeModal.value = false;
  currentReadme.value = '';
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

const closeDetails = () => {
  showDetailsModal.value = false;
  currentRepoDetails.value = null;
};

// ----------------------------------------
// [核心修改] 触发 AI 单仓库深度分析 (图表版)
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
        
        // 数据回来后，等待 DOM 更新，然后渲染图表
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
    
    // 清理旧实例
    chartsInstance.forEach(c => c.dispose());
    chartsInstance = [];

    const data = repoAnalysis.value;

    // 1. 仪表盘 (综合评分)
    if (gaugeChartRef.value) {
        const gaugeChart = echarts.init(gaugeChartRef.value);
        gaugeChart.setOption({
            series: [{
                type: 'gauge',
                // [修改] 调整起始角度，让仪表盘更像一个半圆，腾出底部空间
                startAngle: 200, endAngle: -20,
                min: 0, max: 100,
                splitNumber: 5,
                itemStyle: { color: '#58D9F9' },
                progress: { show: true, width: 15 }, // [修改] 进度条变细
                pointer: { show: false },
                axisLine: { lineStyle: { width: 15 } }, // [修改] 轴线变细
                axisTick: { show: false },
                // [修改] 分割线变短变细，避免挡住文字
                splitLine: { length: 8, lineStyle: { width: 2, color: '#999' } },
                // [修改] 调整刻度标签的位置(distance)和字体大小
                axisLabel: { distance: 12, color: '#999', fontSize: 10 },
                // [修改] 调整中心大数字的位置(offsetCenter)和字体大小
                detail: {
                    valueAnimation: true,
                    fontSize: 36, // 稍微调小一点
                    fontWeight: 'bolder',
                    formatter: '{value}分',
                    color: 'auto',
                    offsetCenter: [0, '30%'] // [关键修改] 向下移动，避免和刻度重叠
                },
                data: [{ value: data.overall_score }]
            }]
        });
        chartsInstance.push(gaugeChart);
    }

    // 2. 雷达图 (五维能力)
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
                center: ['50%', '55%'], // 稍微下移一点
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
                    areaStyle: { color: 'rgba(128, 90, 213, 0.4)' }, // 紫色半透明
                    itemStyle: { color: '#805AD5' }
                }]
            }]
        });
        chartsInstance.push(radarChart);
    }

    // 3. 柱状图 (适用场景)
    if (barChartRef.value && data.scenarios) {
        const barChart = echarts.init(barChartRef.value);
        const scenarios = data.scenarios; // [{name: 'x', score: 90}, ...]
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

    // 窗口大小改变时重绘
    window.addEventListener('resize', () => chartsInstance.forEach(c => c.resize()));
};

</script>

<template>
  <div class="dev-container">
    <h1>GitHub 情报侦察</h1>
    
    <div class="search-box">
      <input 
        v-model="searchUsername" 
        @keyup.enter="handleSearch"
        type="text" 
        placeholder="输入用户名 或 仓库链接 (如: [https://github.com/flask/flask](https://github.com/flask/flask))" 
      />
      <button @click="handleSearch" :disabled="loading">
        {{ loading ? '侦察中...' : '开始分析' }}
      </button>
    </div>

    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

    <div v-if="userProfile" class="content-grid">
      <div class="profile-card">
        <img :src="userProfile.avatar_url" alt="Avatar" class="avatar"/>
        <h2>{{ userProfile.name || userProfile.username }}</h2>
        <p class="username">@{{ userProfile.username }}</p>
        <p class="bio" v-if="userProfile.bio">{{ userProfile.bio }}</p>
        <div class="stats">
          <div class="stat-item"><strong>{{ userProfile.public_repos }}</strong><span>仓库</span></div>
          <div class="stat-item"><strong>{{ userProfile.followers }}</strong><span>粉丝</span></div>
        </div>
        <div style="margin-top: 15px;">
          <router-link :to="{ name: 'report', params: { username: userProfile.username } }" class="report-btn">
            🚀 生成 AI 深度报告 (人物)
          </router-link>
        </div>
        <a :href="userProfile.html_url" target="_blank" class="github-link">前往 GitHub 主页</a>
      </div>

      <div class="repos-list">
        <h3>公开仓库 ({{ userRepos.length }})</h3>
        <div v-for="repo in userRepos" :key="repo.name" class="repo-item">
          <div class="repo-header">
            <span class="repo-name">{{ repo.name }}</span>
            <span class="repo-lang" v-if="repo.language">{{ repo.language }}</span>
            <span class="repo-stars">★ {{ repo.stars }}</span>
          </div>
          <p class="repo-desc">{{ repo.description }}</p>
          <div class="repo-actions">
            <small>更新于: {{ new Date(repo.updated_at).toLocaleDateString() }}</small>
            <div class="btn-group">
                <button @click="viewRepoDetails(repo.name)" class="stats-btn">📊 详细统计</button>
                <button @click="viewReadme(repo.name)" class="readme-btn">📄 查看文档</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showReadmeModal" class="modal-overlay" @click.self="closeReadme">
      <div class="modal-content readme-modal">
        <div class="modal-header">
          <h3>{{ currentRepoName }} - README.md</h3>
          <button @click="closeReadme">×</button>
        </div>
        <div class="modal-body">
            <div class="markdown-body" v-html="marked.parse(currentReadme)" style="padding: 10px;"></div>
        </div>
      </div>
    </div>

    <div v-if="showDetailsModal" class="modal-overlay" @click.self="closeDetails">
        <div class="modal-content stats-modal">
          <div class="modal-header">
            <h3>{{ currentRepoName }} - 深度情报</h3>
            <button @click="closeDetails">×</button>
          </div>
          <div class="modal-body">
            <div v-if="detailsLoading" class="loading-text">正在潜入 GitHub 数据库获取情报...</div>
            <div v-else-if="currentRepoDetails" class="stats-container">
                
                <div class="analysis-action-area" style="text-align: center; margin-bottom: 20px;">
                    <button @click="analyzeCurrentRepo" class="ai-analyze-btn" :disabled="analyzingRepo">
                        <span v-if="analyzingRepo">🧠 AI 正在绘图 (计算中)...</span>
                        <span v-else>🔍 AI 深度透视 (图表版)</span>
                    </button>
                </div>
                
                <div class="metrics-row">
                    <div class="metric-card"><span class="metric-val">{{ currentRepoDetails.forks_count }}</span><span class="metric-label">Forks</span></div>
                    <div class="metric-card"><span class="metric-val">{{ currentRepoDetails.open_issues_count }}</span><span class="metric-label">Open Issues</span></div>
                    <div class="metric-card">
                        <span class="metric-val" :class="{'high-activity': (currentRepoDetails.recent_commit_count_4weeks || 0) > 10}">
                            {{ currentRepoDetails.recent_commit_count_4weeks ?? '-' }}
                        </span>
                        <span class="metric-label">近4周提交数</span>
                    </div>
                </div>
                
                <div class="lang-section" v-if="repoLanguages && Object.keys(repoLanguages).length > 0">
                    <h4>语言构成</h4>
                    <div class="lang-bar">
                        <div v-for="lang in getLanguageStats(repoLanguages)" :key="lang.name" :style="{ width: lang.percent + '%', backgroundColor: lang.color }" class="lang-segment"></div>
                    </div>
                    <div class="lang-legend">
                        <div v-for="lang in getLanguageStats(repoLanguages)" :key="lang.name" class="legend-item">
                            <span class="legend-dot" :style="{ backgroundColor: lang.color }"></span><span class="legend-text">{{ lang.name }} {{ lang.percent }}%</span>
                        </div>
                    </div>
                </div>

                <div class="contributors-section">
                    <h4>核心贡献者 (Top 5)</h4>
                    <div class="contributors-list">
                        <div v-for="c in currentRepoDetails.contributors" :key="c.login" class="contributor-item">
                            <img :src="c.avatar_url" class="contributor-avatar" />
                            <a :href="c.html_url" target="_blank">{{ c.login }}</a>
                            <span class="contributions-count">{{ c.contributions }} commits</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

    <div v-if="showRepoAnalysis" class="modal-overlay" @click.self="showRepoAnalysis = false">
        <div class="modal-content analysis-modal-visual">
            <div class="modal-header">
                <h3>🤖 AI 仓库透视: {{ currentRepoName }}</h3>
                <button @click="showRepoAnalysis = false">×</button>
            </div>
            
            <div class="modal-body visual-body" v-if="repoAnalysis">
                <div class="visual-header">
                    <div class="summary-box">
                        <span class="quote-icon">❝</span>
                        {{ repoAnalysis.summary }}
                        <span class="quote-icon">❞</span>
                    </div>
                    <div class="keywords-box">
                        <span v-for="kw in repoAnalysis.keywords" :key="kw" class="keyword-tag">{{ kw }}</span>
                    </div>
                </div>

                <div class="charts-grid">
                    <div class="chart-card">
                        <h4>🌟 综合推荐指数</h4>
                        <div ref="gaugeChartRef" class="chart-box" style="height: 200px;"></div>
                    </div>

                    <div class="chart-card">
                        <h4>🛡️ 五维能力模型</h4>
                        <div ref="radarChartRef" class="chart-box" style="height: 250px;"></div>
                    </div>
                    
                    <div class="chart-card">
                        <h4>🎯 最佳适用场景</h4>
                        <div ref="barChartRef" class="chart-box" style="height: 200px;"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

  </div>
  <div class="animation-section">
    <h2>功能演示：GitHub 情报侦察</h2>
    <div ref="lottieContainer" class="lottie-container"></div>
  </div>
</template>

<style scoped>
/* 这里保留原有的基础样式，仅添加新图表相关的样式 */

/* ... (复制你原有的所有 .dev-container, .profile-card 等样式到这里，为了简洁我只列出新增的) ... */
.dev-container { max-width: 1000px; margin: 30px auto; padding: 0 20px; }
.search-box { display: flex; gap: 10px; margin-bottom: 20px; justify-content: center; }
.search-box input { padding: 10px; width: 450px; border: 1px solid #ccc; border-radius: 4px; }
.search-box button { padding: 10px 20px; background-color: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer; }
.search-box button:disabled { background-color: #95a5a6; }
.error-msg { color: red; text-align: center; margin-bottom: 20px; }
.content-grid { display: grid; grid-template-columns: 280px 1fr; gap: 30px; align-items: start; }
/* Profile Card */
.profile-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #ddd; }
.avatar { width: 120px; height: 120px; border-radius: 50%; margin-bottom: 10px; object-fit: cover; }
.username { color: #666; margin-bottom: 10px; }
.bio { margin-bottom: 15px; font-style: italic; color: #555; }
.stats { display: flex; justify-content: space-around; margin-bottom: 20px; }
.stat-item { display: flex; flex-direction: column; }
.github-link { display: inline-block; text-decoration: none; color: #42b983; border: 1px solid #42b983; padding: 5px 15px; border-radius: 20px; transition: 0.3s; }
.github-link:hover { background: #42b983; color: white; }
/* Repos List */
.repos-list h3 { margin-top: 0; border-bottom: 2px solid #eee; padding-bottom: 10px; }
.repo-item { border: 1px solid #eee; padding: 15px; margin-bottom: 15px; border-radius: 6px; background: white; transition: transform 0.2s; }
.repo-item:hover { transform: translateY(-2px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.repo-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.repo-name { font-weight: bold; font-size: 1.1em; color: #2c3e50; }
.repo-lang { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; color: #666; }
.repo-stars { color: #f1c40f; font-weight: bold; margin-left: auto; }
.repo-desc { color: #555; font-size: 0.9em; margin-bottom: 10px; line-height: 1.4; }
.repo-actions { display: flex; justify-content: space-between; align-items: center; color: #999; font-size: 0.85em; }
.btn-group { display: flex; gap: 10px; }
.readme-btn { background: #e0f2f1; color: #00897b; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.readme-btn:hover { background: #b2dfdb; }
.stats-btn { background: #e3f2fd; color: #1976d2; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }
.stats-btn:hover { background: #bbdefb; }
/* Modal Common */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
.modal-content { background: white; width: 80%; max-width: 800px; max-height: 80vh; border-radius: 8px; display: flex; flex-direction: column; }
.modal-header { padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
.modal-header button { background: none; border: none; font-size: 1.5em; cursor: pointer; }
.modal-body { padding: 20px; overflow-y: auto; background: #fdfdfd; }
.modal-body pre { white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace; font-size: 0.9em; color: #333; }
.loading-text { text-align: center; padding: 20px; color: #666; }
.stats-container { display: flex; flex-direction: column; gap: 20px; }
.metrics-row { display: flex; justify-content: space-around; background: #f5f5f5; padding: 15px; border-radius: 8px; }
.metric-card { display: flex; flex-direction: column; align-items: center; }
.metric-val { font-size: 1.5em; font-weight: bold; color: #2c3e50; }
.metric-label { font-size: 0.9em; color: #7f8c8d; }
.high-activity { color: #e74c3c; }
.contributors-section h4 { margin-top: 0; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px;}
.contributors-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
.contributor-item { display: flex; align-items: center; background: white; border: 1px solid #eee; padding: 8px; border-radius: 6px; }
.contributor-avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 10px; }
.contributor-item a { text-decoration: none; color: #333; font-weight: bold; margin-right: auto; font-size: 0.9em; }
.contributions-count { font-size: 0.8em; color: #999; }
.activity-alert { background: #fff3cd; color: #856404; padding: 10px; border-radius: 4px; font-size: 0.9em; }
.lang-section { margin-top: 20px; }
.lang-section h4 { margin-top: 0; margin-bottom: 10px; font-size: 0.95em; color: #586069; }
.lang-bar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; background-color: #eee; margin-bottom: 10px; }
.lang-segment { height: 100%; transition: width 0.5s ease; }
.lang-segment:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
.lang-segment:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
.lang-legend { display: flex; flex-wrap: wrap; gap: 15px; }
.legend-item { display: flex; align-items: center; font-size: 0.85em; color: #586069; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.legend-text { font-weight: 500; }
.report-btn { display: inline-block; background-color: #6c5ce7; color: white; padding: 8px 16px; border-radius: 4px; text-decoration: none; margin-bottom: 10px; font-weight: bold; }
.report-btn:hover { background-color: #5b4cc4; }
.animation-section { max-width: 1000px; margin: 50px auto 30px; padding: 20px; border-top: 2px solid #eee; text-align: center; }
.lottie-container { width: 100%; max-width: 400px; height: 400px; margin: 0 auto; }

/* -------------------------------------------
   [任务 4] 新增的图表弹窗样式
   ------------------------------------------- */
.analysis-modal-visual {
    width: 90%;
    max-width: 900px; /* 更宽，放图表 */
    background: #fdfdfd;
}
.visual-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 10px;
    border-bottom: 1px dashed #eee;
}
.summary-box {
    font-size: 1.1em;
    color: #455a64;
    font-style: italic;
    margin-bottom: 10px;
}
.quote-icon {
    font-size: 1.5em;
    color: #b0bec5;
    vertical-align: middle;
}
.keywords-box {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
}
.keyword-tag {
    background: #e3f2fd;
    color: #1565c0;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 0.85em;
    font-weight: bold;
}
.charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
}
.chart-card {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 8px;
    padding: 10px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}
.chart-card h4 {
    text-align: center;
    margin: 5px 0 10px 0;
    color: #546e7a;
    font-size: 0.95em;
}
.chart-box {
    width: 100%;
}
.ai-analyze-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white; border: none; padding: 12px 24px; border-radius: 50px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 15px rgba(0,0,0,0.2); transition: transform 0.2s, box-shadow 0.2s; width: 80%; margin-bottom: 5px;
}
.ai-analyze-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
.ai-analyze-btn:disabled { opacity: 0.7; cursor: wait; background: #999; }
</style>