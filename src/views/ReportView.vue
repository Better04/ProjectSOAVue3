<script setup>
import { ref, onMounted, nextTick, onBeforeUnmount, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import * as echarts from 'echarts';
import { marked } from 'marked';

// -------------------- 状态定义 --------------------
const route = useRoute();
const router = useRouter(); // 引入 router 用于返回操作
const username = route.params.username;

const loading = ref(true);
const downloading = ref(false); // 下载状态
const previewing = ref(false); // 新增：预览状态
const errorMsg = ref('');
const reportData = ref(null);
const renderedSummary = ref('');

let chartInstance = null;
const chartRef = ref(null);

// -------------------- 核心逻辑 --------------------

// 获取 AI 分析数据
const fetchAnalysis = async () => {
  loading.value = true;
  errorMsg.value = '';
  
  try {
    const res = await axios.get(`/api/ai/analyze/${username}`);
    
    if (!res.data || !res.data.data || !res.data.data.radar_scores) {
      throw new Error("返回数据格式不正确");
    }

    reportData.value = res.data;
    // 渲染中文摘要 (summary 字段)
    renderedSummary.value = marked.parse(res.data.data.summary);
    
    await nextTick();
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

// 返回上一页
const goBack = () => {
    router.back();
};

// 新增：在线预览简历 (全英文)
const previewResume = () => {
    if (!username) return;
    previewing.value = true;
    
    // 直接打开新窗口访问 PDF 预览链接
    // 后端需支持 ?mode=inline 参数来设置 Content-Disposition: inline
    const url = `/api/ai/resume/${username}?mode=inline`;
    window.open(url, '_blank');
    
    // 稍微延迟一下状态恢复，仅为了 UI 交互
    setTimeout(() => {
        previewing.value = false;
    }, 1000);
};

// 修改：下载简历 PDF (全英文)
const downloadResume = async () => {
    downloading.value = true;
    try {
        // 请求后端生成 PDF，带上 mode=attachment 强制下载
        const res = await axios.get(`/api/ai/resume/${username}?mode=attachment`, {
            responseType: 'blob' 
        });
        
        // 创建 Blob URL 并触发下载
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${username}_Resume_EN.pdf`); // 下载文件名设为英文
        document.body.appendChild(link);
        link.click();
        
        // 清理资源
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (err) {
        console.error(err);
        errorMsg.value = '简历生成失败，请检查后端日志或稍后重试';
    } finally {
        downloading.value = false;
    }
};

// -------------------- 图表逻辑 --------------------

const initRadarChart = (scores) => {
  if (!chartRef.value) return;
  if (chartInstance) chartInstance.dispose();
  
  chartInstance = echarts.init(chartRef.value);

  const option = {
    tooltip: { trigger: 'item' },
    radar: {
      radius: '65%',
      indicator: [
        { name: '代码质量', max: 100 },
        { name: '活跃度', max: 100 },
        { name: '文档规范', max: 100 },
        { name: '影响力', max: 100 },
        { name: '技术广度', max: 100 }
      ],
      axisName: {
        color: '#666',
        fontWeight: 'bold'
      },
      splitArea: {
        areaStyle: {
          color: ['#f8f9fa', '#ffffff'],
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 10
        }
      }
    },
    series: [{
      name: '能力评分',
      type: 'radar',
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24, 103, 192, 0.5)' },
          { offset: 1, color: 'rgba(24, 103, 192, 0.1)' }
        ])
      },
      lineStyle: { color: '#1867C0', width: 2 },
      itemStyle: { color: '#1867C0' },
      data: [{
          value: [scores.code_quality, scores.activity, scores.documentation, scores.influence, scores.tech_breadth],
          name: username
      }]
    }]
  };
  chartInstance.setOption(option);
};

const handleResize = () => { if (chartInstance) chartInstance.resize(); };

onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (username) fetchAnalysis(); else { errorMsg.value = '未指定用户。'; loading.value = false; }
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleResize);
    if (chartInstance) chartInstance.dispose();
});

// -------------------- 辅助函数 & 计算属性 --------------------

const getScoreColor = (score) => {
    if (score >= 90) return 'deep-purple-accent-3';
    if (score >= 80) return 'green-darken-1';
    if (score >= 60) return 'blue-darken-1';
    if (score >= 40) return 'orange-darken-1';
    return 'red-darken-1';
};

const getStatusConfig = (status) => {
    switch (status) {
        case 'Active': return { 
            color: 'teal-lighten-1', 
            textColor: 'teal-darken-5', 
            icon: 'mdi-fire', 
            text: '活跃开发' 
        };
        case 'Maintenance': return { 
            color: 'amber-lighten-1', 
            textColor: 'amber-darken-5', 
            icon: 'mdi-wrench', 
            text: '维护中' 
        };
        default: return { 
            color: 'grey-lighten-1', 
            textColor: 'grey-darken-5', 
            icon: 'mdi-archive', 
            text: '已归档/废弃' 
        };
    }
};

const getChineseKey = (key) => { 
    const map = { 'code_quality': '代码质量', 'activity': '活跃度', 'documentation': '文档规范', 'influence': '影响力', 'tech_breadth': '技术广度' }; 
    return map[key] || key; 
};

// -------------------- 分页与跳转逻辑 --------------------

const repoPage = ref(1);
const itemsPerPage = 9;

const paginatedRepos = computed(() => {
    if (!reportData.value || !reportData.value.data.repositories) return [];
    
    const start = (repoPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return reportData.value.data.repositories.slice(start, end);
});

const totalPages = computed(() => {
    if (!reportData.value || !reportData.value.data.repositories) return 0;
    return Math.ceil(reportData.value.data.repositories.length / itemsPerPage);
});

const getRepoUrl = (repoName) => {
    const user = reportData.value?.username || username;
    return `https://github.com/${user}/${repoName}`;
};

</script>

<template>
  <v-app class="bg-grey-lighten-4">
    <v-main>
      <v-container class="py-10" style="max-width: 1280px;">
        
        <v-overlay :model-value="loading" class="align-center justify-center" persistent>
          <v-card class="pa-5 text-center rounded-xl" elevation="3">
            <v-progress-circular indeterminate color="primary" size="64" class="mb-3"></v-progress-circular>
            <div class="text-subtitle-1 font-weight-bold text-grey-darken-2">
              AI 正在深度分析所有仓库及代码...
            </div>
            <div class="text-caption text-grey">这可能需要 30-60 秒，请稍候</div>
          </v-card>
        </v-overlay>

        <v-alert
          v-if="errorMsg"
          type="error"
          variant="tonal"
          title="分析失败"
          :text="errorMsg"
          class="mb-6 rounded-xl"
        >
            <template v-slot:append>
                <v-btn variant="outlined" color="error" @click="fetchAnalysis">重试</v-btn>
            </template>
        </v-alert>

        <div v-if="reportData && !loading" class="animate__animated animate__fadeIn">
          
          <v-card class="mb-6 rounded-xl border-none" elevation="2">
             <div class="banner-bg"></div>
            
            <v-card-text class="d-flex flex-column flex-md-row align-center pa-6 position-relative">
              
              <div class="d-flex flex-column flex-sm-row align-center flex-grow-1 gap-4 text-center text-sm-left">
                <v-avatar size="100" class="elevation-3 border-2 border-white">
                  <v-img :src="reportData.avatar_url" alt="Avatar"></v-img>
                </v-avatar>
                
                <div style="flex: 1">
                  <div class="text-h4 font-weight-black text-blue-grey-darken-4 mb-1">
                    {{ reportData.username }}
                  </div>
                  <v-chip color="primary" variant="flat" size="small" class="font-weight-bold mb-3">
                    GitHub 深度评估报告
                  </v-chip>
                  
                  <div class="d-flex flex-wrap justify-center justify-sm-start gap-2 mt-1">
                    <span class="text-subtitle-2 text-grey-darken-1 mr-2 pt-1">🛠️ 技术栈指纹:</span>
                    <v-chip 
                        v-for="tech in reportData.data.tech_stack" 
                        :key="tech"
                        size="small"
                        variant="tonal"
                        color="indigo"
                        class="font-weight-medium"
                    >
                        {{ tech }}
                    </v-chip>
                  </div>
                </div>
              </div>

              <div class="d-flex flex-column align-end ml-md-6 pl-md-6">
                
                <div class="d-flex gap-2 mb-2">
                    <v-btn 
                        prepend-icon="mdi-arrow-left" 
                        variant="text" 
                        color="grey-darken-2"
                        @click="goBack"
                    >
                        返回
                    </v-btn>
                    
                    <v-btn 
                        prepend-icon="mdi-eye-outline" 
                        color="info" 
                        variant="tonal"
                        :loading="previewing"
                        @click="previewResume"
                        elevation="0"
                    >
                        在线预览 (EN)
                    </v-btn>

                    <v-btn 
                        prepend-icon="mdi-download-outline" 
                        color="primary" 
                        variant="flat"
                        :loading="downloading"
                        @click="downloadResume"
                        elevation="2"
                    >
                        下载简介 PDF (EN)
                    </v-btn>
                </div>
                <div class="text-caption text-grey mb-4 text-right" style="max-width: 300px;">
                    * 简历将生成全英文版 PDF。如内容显示不全，请尝试重新生成 AI 报告。
                </div>

                <div class="d-flex flex-column align-center border-left-md pl-md-6" style="width: 100%;">
                    <v-progress-circular
                    :model-value="reportData.data.overall_score"
                    :color="getScoreColor(reportData.data.overall_score)"
                    size="100"
                    width="8"
                    class="text-h4 font-weight-black"
                    >
                    {{ reportData.data.overall_score }}
                    </v-progress-circular>
                    <div class="text-subtitle-1 font-weight-bold mt-2 text-grey-darken-2">综合评分</div>
                </div>

              </div>
            </v-card-text>
          </v-card>

          <v-row>
            <v-col cols="12" md="5" lg="4">
              <v-card class="h-100 rounded-xl d-flex flex-column" elevation="2">
                <v-card-title class="text-h6 font-weight-bold pa-4 pb-0 text-blue-grey-darken-3">
                  <v-icon icon="mdi-radar" color="primary" class="mr-2"></v-icon>
                  五维能力模型
                </v-card-title>
                
                <v-card-text class="flex-grow-1 d-flex align-center justify-center pa-0 position-relative">
                   <div ref="chartRef" class="chart-container"></div>
                </v-card-text>

                <v-divider></v-divider>
                
                <div class="d-flex justify-space-around pa-4 bg-grey-lighten-5">
                   <div v-for="(score, key) in reportData.data.radar_scores" :key="key" class="text-center">
                       <div class="text-caption text-grey-darken-1">{{ getChineseKey(key) }}</div>
                       <div class="text-subtitle-2 font-weight-black" :class="'text-' + getScoreColor(score)">
                           {{ score }}
                       </div>
                   </div>
                </div>
              </v-card>
            </v-col>

            <v-col cols="12" md="7" lg="8">
              <v-card class="h-100 rounded-xl" elevation="2">
                <v-card-title class="text-h6 font-weight-bold pa-4 text-blue-grey-darken-3 gradient-text-header">
                  <v-icon icon="mdi-robot" class="mr-2"></v-icon>
                  AI 深度评语
                </v-card-title>
                <v-divider></v-divider>
                <v-card-text class="pa-6">
                  <div class="markdown-body" v-html="renderedSummary"></div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <div class="text-h5 font-weight-bold mt-8 mb-4 text-blue-grey-darken-3 d-flex align-center">
             <v-icon icon="mdi-source-repository" class="mr-2" color="blue-grey"></v-icon>
             仓库全景 & 状态分析
          </div>

          <div v-if="reportData.data.repositories && reportData.data.repositories.length">
            <v-row>
                <v-col 
                    v-for="repo in paginatedRepos" 
                    :key="repo.name"
                    cols="12" sm="6" lg="4"
                >
                <v-card class="rounded-lg h-100 transition-swing" hover elevation="1" border>
                    <v-card-item>
                        <template v-slot:title>
                            <div class="d-flex justify-space-between align-start">
                                <a 
                                    :href="getRepoUrl(repo.name)" 
                                    target="_blank" 
                                    class="text-decoration-none repo-link"
                                >
                                    <span class="text-truncate font-weight-bold mr-2" style="max-width: 100%;">
                                        {{ repo.name }}
                                        <v-icon icon="mdi-open-in-new" size="x-small" class="ml-1 opacity-50"></v-icon>
                                    </span>
                                </a>
                                
                                <v-chip
                                    :color="getStatusConfig(repo.status).color"
                                    :text-color="getStatusConfig(repo.status).textColor"
                                    size="x-small"
                                    class="font-weight-bold flex-shrink-0"
                                    label
                                >
                                    {{ getStatusConfig(repo.status).text }}
                                </v-chip>
                            </div>
                        </template>
                    </v-card-item>

                    <v-card-text class="pt-0 text-body-2 text-grey-darken-2" style="line-height: 1.6;">
                    {{ repo.ai_summary }}
                    </v-card-text>
                </v-card>
                </v-col>
            </v-row>

            <div class="d-flex justify-center mt-6" v-if="totalPages > 1">
                <v-pagination
                    v-model="repoPage"
                    :length="totalPages"
                    :total-visible="5"
                    color="primary"
                    rounded="circle"
                ></v-pagination>
            </div>
          </div>
          
          <v-sheet v-else class="text-center pa-10 rounded-xl bg-transparent" border dashed>
              <div class="text-grey text-h6">暂无仓库数据</div>
          </v-sheet>

        </div>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
/* ---------------- 基础样式调整 ---------------- */
.banner-bg {
    position: absolute;
    top: 0; left: 0; right: 0; height: 100%;
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    opacity: 0.5;
    z-index: 0;
}
.border-2 { border: 2px solid white !important; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }

/* ---------------- 仓库链接样式 ---------------- */
.repo-link {
    color: #1565C0;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    max-width: 65%;
}
.repo-link:hover {
    color: #0D47A1;
    text-decoration: underline !important;
}

/* ---------------- 图表容器 ---------------- */
.chart-container {
    width: 100%;
    height: 350px;
}

/* ---------------- 炫彩标题 ---------------- */
.gradient-text-header {
    background: linear-gradient(45deg, #2c3e50, #3498db);
    -webkit-background-clip: text;
    background-clip: text;
}

/* ---------------- Markdown 美化 ---------------- */
.markdown-body {
    font-family: 'Roboto', sans-serif;
    line-height: 1.7;
    color: #424242;
}

.markdown-body :deep(h3) {
    font-size: 1.1rem;
    font-weight: 700;
    margin-top: 1.5rem;
    margin-bottom: 0.8rem;
    color: #1565C0;
    display: flex;
    align-items: center;
}
.markdown-body :deep(h3)::before {
    content: '';
    display: inline-block;
    width: 4px;
    height: 16px;
    background-color: #1565C0;
    margin-right: 8px;
    border-radius: 2px;
}

.markdown-body :ep(ul) {
    padding-left: 1.2rem;
    margin-bottom: 1rem;
}

.markdown-body :deep(li) {
    margin-bottom: 0.4rem;
}

.markdown-body :deep(strong) {
    color: #263238;
    background: rgba(0,0,0,0.05);
    padding: 0 4px;
    border-radius: 4px;
}

.markdown-body :deep(p) {
    margin-bottom: 1rem;
    text-align: justify;
}

/* ---------------- 响应式辅助 ---------------- */
.border-left-md {
    @media (min-width: 960px) {
        border-left: 1px solid rgba(0,0,0,0.12);
    }
}
</style>