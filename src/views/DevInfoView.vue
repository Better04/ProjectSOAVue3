<script setup>
import { ref, onMounted } from 'vue'; // [修复1] 补充导入 onMounted
import axios from 'axios';

// ----------------------------------------
// Lottie 动画逻辑
// ----------------------------------------
const lottieContainer = ref(null);

onMounted(async () => {
  try {
    // 动态导入 lottie-web
    const lottie = (await import('lottie-web')).default;

    // 获取 JSON 动画数据 (确保 searching-food.json 在 public 目录下)
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

// ----------------------------------------
// 辅助函数：解析 GitHub URL
// ----------------------------------------
const parseGithubUrl = (input) => {
  const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
  const match = input.match(regex);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
};

// ----------------------------------------
// 辅助函数：计算语言百分比和颜色
// ----------------------------------------
const getLanguageStats = (langs) => {
  if (!langs || Object.keys(langs).length === 0) return [];
  
  const total = Object.values(langs).reduce((a, b) => a + b, 0);
  const colors = {
    'Vue': '#41b883', 'JavaScript': '#f1e05a', 'TypeScript': '#2b7489',
    'HTML': '#e34c26', 'CSS': '#563d7c', 'Python': '#3572A5',
    'Java': '#b07219', 'Go': '#00ADD8', 'C++': '#f34b7d', 'C': '#555555'
  };
  
  return Object.entries(langs)
    .map(([name, bytes]) => {
      return {
        name,
        percent: ((bytes / total) * 100).toFixed(1),
        color: colors[name] || '#ededed'
      };
    })
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

// ----------------------------------------
// 动作: 查看文档
// ----------------------------------------
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

// ----------------------------------------
// 动作: 查看详细统计
// ----------------------------------------
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
</script>

<template>
  <div class="dev-container">
    <h1>GitHub 情报侦察</h1>
    
    <div class="search-box">
      <input 
        v-model="searchUsername" 
        @keyup.enter="handleSearch"
        type="text" 
        placeholder="输入用户名 或 仓库链接 (如: https://github.com/flask/flask)" 
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
          <div class="stat-item">
            <strong>{{ userProfile.public_repos }}</strong>
            <span>仓库</span>
          </div>
          <div class="stat-item">
            <strong>{{ userProfile.followers }}</strong>
            <span>粉丝</span>
          </div>
        </div>

        <div style="margin-top: 15px;">
          <router-link 
            :to="{ name: 'report', params: { username: userProfile.username } }" 
            class="report-btn"
          >
            🚀 生成 AI 深度报告
          </router-link>
        </div>

        <a :href="userProfile.html_url" target="_blank" class="github-link">前往 GitHub 主页</a>
      </div>

      <div class="repos-list">
        <h3>公开仓库 ({{ userRepos.length }})</h3>
        <div v-if="userRepos.length === 0">该用户没有公开仓库。</div>
        
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
          <pre>{{ currentReadme }}</pre>
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
                
                <div class="metrics-row">
                    <div class="metric-card">
                        <span class="metric-val">{{ currentRepoDetails.forks_count }}</span>
                        <span class="metric-label">Forks</span>
                    </div>
                    <div class="metric-card">
                        <span class="metric-val">{{ currentRepoDetails.open_issues_count }}</span>
                        <span class="metric-label">Open Issues</span>
                    </div>
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
                        <div 
                            v-for="lang in getLanguageStats(repoLanguages)" 
                            :key="lang.name"
                            :style="{ width: lang.percent + '%', backgroundColor: lang.color }"
                            class="lang-segment"
                            :title="lang.name + ': ' + lang.percent + '%'"
                        ></div>
                    </div>
                    <div class="lang-legend">
                        <div v-for="lang in getLanguageStats(repoLanguages)" :key="lang.name" class="legend-item">
                            <span class="legend-dot" :style="{ backgroundColor: lang.color }"></span>
                            <span class="legend-text">{{ lang.name }} {{ lang.percent }}%</span>
                        </div>
                    </div>
                </div>

                <div class="contributors-section">
                    <h4>核心贡献者 (Top 5)</h4>
                    <div class="contributors-list">
                        <div v-for="c in currentRepoDetails.contributors" :key="c.login" class="contributor-item">
                            <img 
                              :src="c.avatar_url || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'" 
                              class="contributor-avatar" 
                              alt="Avatar"
                            />
                            <a :href="c.html_url" target="_blank">{{ c.login }}</a>
                            <span class="contributions-count">{{ c.contributions }} commits</span>
                        </div>
                        <div v-if="!currentRepoDetails.contributors || currentRepoDetails.contributors.length === 0">
                            暂无贡献者数据
                        </div>
                    </div>
                </div>

                <div class="activity-alert" v-if="typeof currentRepoDetails.commit_activity === 'string'">
                    ⚠️ {{ currentRepoDetails.commit_activity }}
                </div>

            </div>
            <div v-else>
                数据获取失败，请重试。
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
/* Lottie 动画样式 */
.animation-section {
    max-width: 1000px; 
    margin: 50px auto 30px; 
    padding: 20px;
    border-top: 2px solid #eee;
    text-align: center;
}
.animation-section h2 {
    margin-bottom: 20px;
    color: #34495e;
}
.lottie-container {
    width: 100%; 
    max-width: 400px; 
    height: 400px;
    margin: 0 auto;
}

/* 原有样式 */
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

/* Stats Modal Specific */
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

/* Language Bar Styles */
.lang-section { margin-top: 20px; }
.lang-section h4 { margin-top: 0; margin-bottom: 10px; font-size: 0.95em; color: #586069; }

.lang-bar {
    display: flex;
    height: 10px;
    border-radius: 6px;
    overflow: hidden;
    background-color: #eee;
    margin-bottom: 10px;
}
.lang-segment { height: 100%; transition: width 0.5s ease; }
.lang-segment:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
.lang-segment:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }

.lang-legend { display: flex; flex-wrap: wrap; gap: 15px; }
.legend-item { display: flex; align-items: center; font-size: 0.85em; color: #586069; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.legend-text { font-weight: 500; }

.report-btn {
  display: inline-block;
  background-color: #6c5ce7;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  text-decoration: none;
  margin-bottom: 10px;
  font-weight: bold;
}
.report-btn:hover {
  background-color: #5b4cc4;
}
</style>