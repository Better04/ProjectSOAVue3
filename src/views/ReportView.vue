<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import * as echarts from 'echarts';
import { marked } from 'marked';

const route = useRoute();
const username = route.params.username;

const loading = ref(true);
const errorMsg = ref('');
const reportData = ref(null);
const renderedSummary = ref('');

let chartInstance = null;
const chartRef = ref(null);

// ----------------------------------------
// 1. 获取 AI 分析数据
// ----------------------------------------
const fetchAnalysis = async () => {
  loading.value = true;
  errorMsg.value = '';
  
  try {
    const res = await axios.get(`/api/ai/analyze/${username}`);
    
    if (!res.data || !res.data.data || !res.data.data.radar_scores) {
      throw new Error("返回数据格式不正确");
    }

    reportData.value = res.data;
    // 使用 marked 解析 Markdown
    renderedSummary.value = marked.parse(res.data.data.summary);
    
    await nextTick();
    // 稍微延时确保布局稳定后再渲染图表
    setTimeout(() => {
        initRadarChart(res.data.data.radar_scores);
    }, 200);
    
  } catch (err) {
    console.error(err);
    errorMsg.value = err.response?.data?.message || '获取分析报告失败，请稍后重试。';
  } finally {
    loading.value = false;
  }
};

// ----------------------------------------
// 2. 绘制雷达图
// ----------------------------------------
const initRadarChart = (scores) => {
  if (!chartRef.value) return;
  if (chartInstance) chartInstance.dispose();
  
  chartInstance = echarts.init(chartRef.value);

  const option = {
    // title: { text: '五维能力模型', left: 'center', top: 10, textStyle: { color: '#888', fontSize: 14 } },
    tooltip: { trigger: 'item' },
    radar: {
      radius: '70%',
      center: ['50%', '50%'], // 居中
      indicator: [
        { name: '代码质量', max: 100 },
        { name: '活跃度', max: 100 },
        { name: '文档规范', max: 100 },
        { name: '影响力', max: 100 },
        { name: '技术广度', max: 100 }
      ],
      axisName: {
        color: '#555',
        fontSize: 13,
        fontWeight: 'bold',
        backgroundColor: '#f4f4f4',
        borderRadius: 4,
        padding: [3, 5]
      },
      splitArea: {
          areaStyle: {
              color: ['#ffffff', '#f9faff']
          }
      },
      axisLine: { lineStyle: { color: '#e0e6f1' } },
      splitLine: { lineStyle: { color: '#e0e6f1' } }
    },
    series: [{
      name: '能力评分',
      type: 'radar',
      symbol: 'circle',
      symbolSize: 8,
      itemStyle: { color: '#42b983', borderColor: '#fff', borderWidth: 2, shadowColor: 'rgba(66, 185, 131, 0.5)', shadowBlur: 10 },
      lineStyle: { width: 3, color: '#42b983' },
      areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(66, 185, 131, 0.6)' }, { offset: 1, color: 'rgba(66, 185, 131, 0.1)' }]) },
      data: [{
          value: [scores.code_quality, scores.activity, scores.documentation, scores.influence, scores.tech_breadth],
          name: username
      }]
    }]
  };
  chartInstance.setOption(option);
};

// 监听窗口大小变化
const handleResize = () => {
    if (chartInstance) chartInstance.resize();
};
onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (username) fetchAnalysis(); else { errorMsg.value = '未指定用户。'; loading.value = false; }
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (chartInstance) chartInstance.dispose();
});

// 辅助函数
const getScoreClass = (score) => { if (score >= 80) return 's'; if (score >= 60) return 'a'; if (score >= 40) return 'b'; return 'c'; };
const getScoreGrade = (score) => { if (score >= 80) return '卓越 (S)'; if (score >= 60) return '优秀 (A)'; if (score >= 40) return '良好 (B)'; return '待提高 (C)'; };
const getChineseKey = (key) => { const map = { 'code_quality': '代码质量', 'activity': '活跃度', 'documentation': '文档规范', 'influence': '影响力', 'tech_breadth': '技术广度' }; return map[key] || key; };
</script>

<template>
  <div class="report-container">
    <div v-if="loading" class="loading-state"><div class="spinner"></div><p>AI 正在进行深度分析...</p></div>
    <div v-else-if="errorMsg" class="error-state"><h3>分析失败</h3><p>{{ errorMsg }}</p><button @click="fetchAnalysis">重试</button></div>

    <div v-else class="dashboard-content">
      
      <div class="top-banner-card card">
          <div class="banner-left-section">
              <div class="profile-block">
                  <img :src="reportData.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'" class="avatar-big" alt="avatar">
                  <div class="profile-text">
                      <h1 class="username">{{ reportData.username || username }}</h1>
                      <span class="report-badge">GitHub 深度评估报告</span>
                  </div>
              </div>
              
              <div class="tech-stack-block">
                  <div class="tech-label">🛠️ 技术栈指纹:</div>
                  <div class="tech-tags-row">
                      <span v-for="tech in reportData.data.tech_stack" :key="tech" class="tech-tag-header">
                        {{ tech }}
                      </span>
                       <span v-if="!reportData.data.tech_stack || reportData.data.tech_stack.length === 0" class="no-tech">未检测到主要技术栈</span>
                  </div>
              </div>
          </div>

          <div class="banner-right-section score-box">
              <div class="score-circle-lg" :class="'score-' + getScoreClass(reportData.data.overall_score)">
                {{ reportData.data.overall_score }}
              </div>
              <div class="score-grade-lg">{{ getScoreGrade(reportData.data.overall_score) }}</div>
          </div>
      </div>

      <div class="main-content-grid">
          
          <div class="chart-panel card equal-height-item">
              <h3 class="panel-title">五维能力模型</h3>
              <div class="chart-container-wrapper">
                 <div ref="chartRef" class="radar-chart-fixed"></div>
              </div>
              <div class="chart-legend-row">
                  <div v-for="(score, key) in reportData.data.radar_scores" :key="key" class="legend-metric">
                      <span class="metric-label">{{ getChineseKey(key) }}</span>
                      <span class="metric-value" :class="'val-' + getScoreClass(score)">{{ score }}</span>
                  </div>
              </div>
          </div>

          <div class="analysis-panel card equal-height-item dazzling-card">
              <h3 class="panel-title dazzling-title">🤖 AI 深度评语</h3>
              <div class="markdown-body dazzling-content" v-html="renderedSummary"></div>
          </div>

      </div>

    </div>
  </div>
</template>

<style scoped>
/* ---------------- 全局容器 & 卡片基础 ---------------- */
.report-container {
  max-width: 1300px; margin: 0 auto; padding: 30px 20px;
  background-color: #f0f2f5; min-height: 100vh; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2c3e50;
}
.card {
  background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);
  border: 1px solid rgba(255,255,255,0.8); /* 轻微边框 */
}
.panel-title {
    margin: 0 0 20px 0; font-size: 1.25rem; font-weight: 700; color: #34495e;
    padding-bottom: 12px; border-bottom: 2px solid #f5f7fa;
}

/* ---------------- 区域 1：顶部综合信息栏 ---------------- */
.top-banner-card {
    display: flex; justify-content: space-between; align-items: center;
    padding: 25px 35px; margin-bottom: 25px;
    background: linear-gradient(to right, #ffffff, #fbfcfe);
}
.banner-left-section { display: flex; flex-direction: column; gap: 20px; flex: 1; }

/* 用户信息块 */
.profile-block { display: flex; align-items: center; gap: 20px; }
.avatar-big { 
    width: 72px; height: 72px; border-radius: 50%; border: 3px solid #fff; 
    box-shadow: 0 4px 12px rgba(66, 185, 131, 0.2); object-fit: cover;
}
.profile-text .username { margin: 0; font-size: 1.8rem; font-weight: 800; color: #2c3e50; line-height: 1.2; }
.report-badge {
    display: inline-block; background: #e3f2fd; color: #1565c0; font-size: 0.8rem;
    padding: 3px 10px; border-radius: 12px; margin-top: 5px; font-weight: 600;
}

/* 技术栈块 (横向排列) */
.tech-stack-block { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.tech-label { font-weight: 600; color: #7f8c8d; font-size: 0.95rem; }
.tech-tags-row { display: flex; flex-wrap: wrap; gap: 8px; }
.tech-tag-header {
    background: linear-gradient(135deg, #f5f7fa, #e4e7eb); color: #57606f;
    padding: 5px 14px; border-radius: 20px; font-size: 0.85rem; font-weight: 600;
    border: 1px solid #dce1e6; box-shadow: 0 2px 5px rgba(0,0,0,0.03);
}
.no-tech { color: #aaa; font-size: 0.9rem; font-style: italic; }

/* 右侧评分块 */
.score-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-left: 40px; border-left: 2px solid #f0f0f0; }
.score-circle-lg {
    width: 88px; height: 88px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 2.8rem; font-weight: 900; color: white;
    box-shadow: 0 6px 16px rgba(0,0,0,0.15); text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
}
.score-grade-lg { margin-top: 8px; font-size: 1.2rem; font-weight: 700; color: #2c3e50; }
/* 评分颜色梯度 */
.score-s { background: linear-gradient(135deg, #42b983, #249c68); }
.score-a { background: linear-gradient(135deg, #3498db, #1f78b4); }
.score-b { background: linear-gradient(135deg, #f1c40f, #d4ac0d); }
.score-c { background: linear-gradient(135deg, #e74c3c, #c0392b); }


/* ---------------- 区域 2：主体网格 (等高关键) ---------------- */
.main-content-grid {
    display: grid;
    /* 左侧固定宽度或比例，右侧自适应 */
    grid-template-columns: 42% 1fr; 
    gap: 25px;
    /* 关键属性：让网格项在行方向上拉伸至相同高度 */
    align-items: stretch; 
}
/* 确保卡片自身也占满高度 */
.equal-height-item {
    display: flex;
    flex-direction: column;
    height: 100%; /* 撑满 Grid 分配的高度 */
}


/* --- 左侧雷达图卡片调整 --- */
.chart-panel { padding: 25px; }
.chart-container-wrapper { flex: 1; /* 占据剩余空间 */ display: flex; align-items: center; justify-content: center; }
.radar-chart-fixed { width: 100%; height: 400px; /* 保持固定高度供 echarts 绘图 */ }

.chart-legend-row { 
    display: flex; justify-content: space-around; margin-top: 20px; 
    padding-top: 15px; border-top: 1px solid #f0f2f5; 
}
.legend-metric { display: flex; flex-direction: column; align-items: center; }
.metric-label { font-size: 0.85rem; color: #7f8c8d; margin-bottom: 4px; }
.metric-value { font-size: 1.2rem; font-weight: 800; }
.val-s, .val-a { color: #42b983; }
.val-b { color: #f1c40f; }
.val-c { color: #e74c3c; }


/* --- 右侧 AI 评语卡片 (炫彩美化) --- */
.dazzling-card {
    padding: 30px;
    position: relative;
    /* 炫彩边框效果 (使用伪元素实现渐变边框) */
    background: #fff;
    background-clip: padding-box;
    border: 2px solid transparent;
}
.dazzling-card::before {
    content: ''; position: absolute; top: -2px; bottom: -2px; left: -2px; right: -2px;
    background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); /* 比较清新的炫彩渐变 */
    z-index: -1; border-radius: 18px; /* 比卡片圆角大一点 */
}

/* 标题炫彩字 */
.dazzling-title {
    border-bottom: none; padding-bottom: 0;
    background: linear-gradient(to right, #30cfd0 0%, #330867 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    font-size: 1.5rem;
}

/* Markdown 内容美化 */
.dazzling-content {
    flex: 1; /* 撑满高度 */
    font-family: 'Georgia', 'Times New Roman', serif; /* 使用衬线体增加高级感，或者用更现代的无衬线体 */
    font-size: 1.05rem; line-height: 1.8; color: #444;
    padding: 10px;
    background: rgba(250, 250, 252, 0.5); /* 微妙的背景区分 */
    border-radius: 8px;
}
/* Markdown 内部样式穿透 */
.dazzling-content :deep(p) { margin-bottom: 1.2em; text-align: justify; }
.dazzling-content :deep(strong) { color: #2c3e50; font-weight: 700; }


/* ---------------- 响应式适配 ---------------- */
@media (max-width: 1024px) {
    .top-banner-card { flex-direction: column; align-items: flex-start; gap: 20px; }
    .score-box { border-left: none; border-top: 2px solid #f0f0f0; padding-left: 0; padding-top: 20px; width: 100%; align-items: flex-start; flex-direction: row; gap: 20px; }
    .main-content-grid { grid-template-columns: 1fr; /* 变为单列 */ }
    .radar-chart-fixed { height: 350px; }
}

/* 加载和错误状态 (省略详细样式，保持基础即可) */
.loading-state, .error-state { text-align: center; padding: 50px; }
.spinner { /* ...保持原有... */ width: 40px; height: 40px; border: 4px solid #eee; border-top-color: #42b983; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px;}
@keyframes spin { to { transform: rotate(360deg); } }
</style>