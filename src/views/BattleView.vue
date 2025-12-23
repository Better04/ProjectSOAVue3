<script setup>
import { ref, onMounted, nextTick } from 'vue'
import axios from 'axios'
import * as echarts from 'echarts'

// --- 状态数据 ---
const player1 = ref('')
const player2 = ref('')
const loading = ref(false)
const battleResult = ref(null)
const errorMsg = ref('')
const showBattleFlash = ref(false)
const analysisStage = ref('') // 'fetching', 'analyzing', 'complete'
const analysisProgress = ref(0)

// 图表实例
let chartInstance = null
const chartRef = ref(null)

// AI 分析阶段文本
const stageTexts = {
  fetching: '正在获取选手数据...',
  analyzing: 'AI 正在深度分析战局...',
  complete: '分析完成！'
}

// --- 核心方法：发起对战 ---
const startBattle = async () => {
  if (!player1.value || !player2.value) {
    alert('请先输入两名选手的 GitHub ID！')
    return
  }

  loading.value = true
  errorMsg.value = ''
  battleResult.value = null
  showBattleFlash.value = true
  analysisStage.value = 'fetching'
  analysisProgress.value = 0

  // 战斗闪光效果
  setTimeout(() => {
    showBattleFlash.value = false
  }, 500)

  // 模拟进度条
  const progressInterval = setInterval(() => {
    if (analysisProgress.value < 90) {
      analysisProgress.value += Math.random() * 15
    }
  }, 300)

  try {
    // 第一阶段：获取数据
    await new Promise(resolve => setTimeout(resolve, 800))
    analysisStage.value = 'analyzing'
    analysisProgress.value = 40

    const res = await axios.post('http://127.0.0.1:5000/api/battle/analyze', {
      player1: player1.value,
      player2: player2.value
    })

    if (res.data.success) {
      analysisProgress.value = 100
      analysisStage.value = 'complete'
      
      // 完成后短暂延迟，让用户看到完成状态
      await new Promise(resolve => setTimeout(resolve, 500))
      
      battleResult.value = res.data
      await nextTick()
      renderChart(res.data.players)
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = err.response?.data?.message || '对战请求失败，请检查后端服务！'
  } finally {
    clearInterval(progressInterval)
    loading.value = false
    analysisStage.value = ''
    analysisProgress.value = 0
  }
}

// --- 图表渲染逻辑 ---
const renderChart = (players) => {
  if (!chartRef.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  const p1 = players.player1
  const p2 = players.player2
  
  const p1Name = `${p1.username} (红方)`
  const p2Name = `${p2.username} (蓝方)`

  const getData = (p) => [
    p.github_data.repos,
    p.github_data.followers,
    p.github_data.stars,
    p.github_data.commits_weekly,
    p.internal_data.wishes_count,
    p.internal_data.score
  ]

  const option = {
    title: { 
      text: '战力雷达对比', 
      left: 'center',
      textStyle: {
        color: '#333',
        fontSize: 18,
        fontWeight: 'bold'
      }
    },
    tooltip: {},
    legend: {
      data: [p1Name, p2Name],
      bottom: 0
    },
    radar: {
      indicator: [
        { name: '仓库 (Repos)', max: Math.max(p1.github_data.repos, p2.github_data.repos) + 10 },
        { name: '粉丝 (Followers)', max: Math.max(p1.github_data.followers, p2.github_data.followers) + 10 },
        { name: '获赞 (Stars)', max: Math.max(p1.github_data.stars, p2.github_data.stars) + 10 },
        { name: '活跃 (Commits)', max: Math.max(p1.github_data.commits_weekly, p2.github_data.commits_weekly) + 5 },
        { name: '心愿 (Wishes)', max: Math.max(p1.internal_data.wishes_count, p2.internal_data.wishes_count) + 5 },
        { name: '积分 (Score)', max: Math.max(p1.internal_data.score, p2.internal_data.score) + 50 }
      ]
    },
    series: [{
      name: 'Ability',
      type: 'radar',
      animationDuration: 2000,
      animationEasing: 'elasticOut',
      data: [
        {
          value: getData(p1),
          name: p1Name,
          areaStyle: { opacity: 0.3, color: '#ff4d4f' },
          itemStyle: { color: '#ff4d4f' }
        },
        {
          value: getData(p2),
          name: p2Name,
          areaStyle: { opacity: 0.3, color: '#1890ff' },
          itemStyle: { color: '#1890ff' }
        }
      ]
    }]
  }

  chartInstance.setOption(option)
}

window.addEventListener('resize', () => chartInstance && chartInstance.resize())
</script>

<template>
  <div class="battle-container">
    <!-- 背景粒子效果 -->
    <div class="particles">
      <div class="particle" v-for="i in 20" :key="i" :style="{
        left: Math.random() * 100 + '%',
        animationDelay: Math.random() * 5 + 's',
        animationDuration: (3 + Math.random() * 4) + 's'
      }"></div>
    </div>

    <!-- 战斗闪光效果 -->
    <div class="battle-flash" :class="{ active: showBattleFlash }"></div>

    <!-- AI 分析全屏遮罩 -->
    <div v-if="loading" class="analysis-overlay">
      <div class="analysis-content">
        <div class="ai-brain">
          <div class="brain-wave" v-for="i in 3" :key="i"></div>
          <div class="brain-core">
            <span class="ai-icon">🤖</span>
          </div>
        </div>
        
        <h2 class="analysis-title">{{ stageTexts[analysisStage] }}</h2>
        
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: analysisProgress + '%' }"></div>
            <div class="progress-glow" :style="{ left: analysisProgress + '%' }"></div>
          </div>
          <div class="progress-text">{{ Math.round(analysisProgress) }}%</div>
        </div>

        <!-- 数据流动效果 -->
        <div class="data-streams">
          <div class="data-line" v-for="i in 5" :key="i"></div>
        </div>

        <!-- 分析状态指示器 -->
        <div class="status-indicators">
          <div class="indicator" :class="{ active: analysisStage === 'fetching' }">
            <span class="dot"></span>
            <span class="label">数据采集</span>
          </div>
          <div class="indicator" :class="{ active: analysisStage === 'analyzing' }">
            <span class="dot"></span>
            <span class="label">AI分析</span>
          </div>
          <div class="indicator" :class="{ active: analysisStage === 'complete' }">
            <span class="dot"></span>
            <span class="label">生成报告</span>
          </div>
        </div>
      </div>
    </div>

    <h1 class="main-title">
      <span class="title-glow">⚔️ 代码竞技场 ⚔️</span>
    </h1>
    
    <div class="input-zone">
      <div class="player-input red-side">
        <div class="input-glow red"></div>
        <h3>🔴 红方选手</h3>
        <input v-model="player1" placeholder="输入 GitHub ID" class="pokemon-input" />
      </div>
      
      <div class="vs-container">
        <div class="vs-text">VS</div>
        <div class="vs-lightning"></div>
      </div>
      
      <div class="player-input blue-side">
        <div class="input-glow blue"></div>
        <h3>🔵 蓝方选手</h3>
        <input v-model="player2" placeholder="输入 GitHub ID" class="pokemon-input" />
      </div>
    </div>

    <div class="action-zone">
      <button @click="startBattle" :disabled="loading" class="battle-btn">
        <span class="btn-text">{{ loading ? 'AI 正在分析战局...' : '开始对决 (FIGHT!)' }}</span>
        <div class="btn-shine"></div>
      </button>
    </div>

    <div v-if="errorMsg" class="error-msg shake">{{ errorMsg }}</div>

    <div v-if="battleResult" class="result-zone">
      
      <div class="players-info">
        <div class="p-card red slide-in-left">
          <div class="card-energy red"></div>
          <img :src="battleResult.players.player1.avatar" alt="p1" class="avatar-bounce" />
          <h3>{{ battleResult.players.player1.username }}</h3>
          <p class="rank-badge">{{ battleResult.players.player1.rank_emoji }} {{ battleResult.players.player1.rank }}</p>
          <p class="power-score">战力: {{ battleResult.players.player1.power_score }}</p>
          <p class="tag" v-if="battleResult.players.player1.internal_data.is_member">🏅 平台会员</p>
          <p class="tag ghost" v-else>👻 野生路人</p>
          <div class="strengths">
            <span class="strength-tag" v-for="s in battleResult.players.player1.strengths" :key="s">{{ s }}</span>
          </div>
          <div class="power-lines">
            <div class="power-line"></div>
            <div class="power-line"></div>
            <div class="power-line"></div>
          </div>
        </div>

        <div class="chart-container radar-expand" ref="chartRef"></div>

        <div class="p-card blue slide-in-right">
          <div class="card-energy blue"></div>
          <img :src="battleResult.players.player2.avatar" alt="p2" class="avatar-bounce" />
          <h3>{{ battleResult.players.player2.username }}</h3>
          <p class="rank-badge">{{ battleResult.players.player2.rank_emoji }} {{ battleResult.players.player2.rank }}</p>
          <p class="power-score">战力: {{ battleResult.players.player2.power_score }}</p>
          <p class="tag" v-if="battleResult.players.player2.internal_data.is_member">🏅 平台会员</p>
          <p class="tag ghost" v-else>👻 野生路人</p>
          <div class="strengths">
            <span class="strength-tag" v-for="s in battleResult.players.player2.strengths" :key="s">{{ s }}</span>
          </div>
          <div class="power-lines">
            <div class="power-line"></div>
            <div class="power-line"></div>
            <div class="power-line"></div>
          </div>
        </div>
      </div>

      <div class="ai-commentary fade-in-up">
        <h3>🎤 AI 解说</h3>
        <div class="commentary-border"></div>
        <p>{{ battleResult.commentary }}</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.battle-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
  font-family: 'Arial', sans-serif;
  position: relative;
  overflow: hidden;
}

/* ============ AI 分析遮罩层 ============ */
.analysis-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(30,30,60,0.98), rgba(60,30,90,0.98));
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: overlayFadeIn 0.3s ease-out;
}

@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.analysis-content {
  text-align: center;
  color: white;
  max-width: 600px;
  padding: 40px;
}

/* AI 大脑动画 */
.ai-brain {
  position: relative;
  width: 150px;
  height: 150px;
  margin: 0 auto 30px;
}

.brain-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 0 40px rgba(102,126,234,0.8);
  animation: brainPulse 2s ease-in-out infinite;
}

@keyframes brainPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.ai-icon {
  font-size: 50px;
  animation: iconSpin 3s linear infinite;
}

@keyframes iconSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.brain-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(102,126,234,0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: waveExpand 3s ease-out infinite;
}

.brain-wave:nth-child(2) {
  animation-delay: 1s;
}

.brain-wave:nth-child(3) {
  animation-delay: 2s;
}

@keyframes waveExpand {
  0% {
    width: 100%;
    height: 100%;
    opacity: 1;
  }
  100% {
    width: 200%;
    height: 200%;
    opacity: 0;
  }
}

.analysis-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
  text-shadow: 0 0 20px rgba(255,255,255,0.5);
  animation: titleGlow 2s ease-in-out infinite;
}

@keyframes titleGlow {
  0%, 100% { text-shadow: 0 0 20px rgba(255,255,255,0.5); }
  50% { text-shadow: 0 0 30px rgba(102,126,234,0.8); }
}

/* 进度条 */
.progress-container {
  margin-bottom: 40px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255,255,255,0.1);
  border-radius: 10px;
  overflow: hidden;
  position: relative;
  margin-bottom: 10px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2, #f093fb);
  border-radius: 10px;
  transition: width 0.3s ease;
  box-shadow: 0 0 20px rgba(102,126,234,0.8);
}

.progress-glow {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background: rgba(255,255,255,0.8);
  filter: blur(10px);
  transform: translateX(-50%);
  transition: left 0.3s ease;
}

.progress-text {
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

/* 数据流动效果 */
.data-streams {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  pointer-events: none;
  overflow: hidden;
}

.data-line {
  position: absolute;
  width: 2px;
  height: 100px;
  background: linear-gradient(to bottom, transparent, #667eea, transparent);
  left: 20%;
  animation: dataFlow 2s linear infinite;
}

.data-line:nth-child(2) {
  left: 40%;
  animation-delay: 0.5s;
}

.data-line:nth-child(3) {
  left: 60%;
  animation-delay: 1s;
}

.data-line:nth-child(4) {
  left: 80%;
  animation-delay: 1.5s;
}

.data-line:nth-child(5) {
  left: 50%;
  animation-delay: 0.75s;
}

@keyframes dataFlow {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  80% {
    opacity: 1;
  }
  to {
    transform: translateY(100vh);
    opacity: 0;
  }
}

/* 状态指示器 */
.status-indicators {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 40px;
}

.indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  opacity: 0.4;
  transition: all 0.3s;
}

.indicator.active {
  opacity: 1;
}

.indicator .dot {
  width: 12px;
  height: 12px;
  background: #667eea;
  border-radius: 50%;
  box-shadow: 0 0 10px #667eea;
}

.indicator.active .dot {
  animation: dotPulse 1s ease-in-out infinite;
}

@keyframes dotPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 10px #667eea; }
  50% { transform: scale(1.5); box-shadow: 0 0 20px #667eea; }
}

.indicator .label {
  font-size: 14px;
  color: rgba(255,255,255,0.8);
}

/* ============ 原有样式 ============ */
.particles {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: radial-gradient(circle, rgba(255,255,255,0.8), transparent);
  border-radius: 50%;
  animation: float-up linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(100vh) scale(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) scale(1);
    opacity: 0;
  }
}

.battle-flash {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(255,255,255,0.9), transparent 70%);
  opacity: 0;
  pointer-events: none;
  z-index: 9999;
  transition: opacity 0.1s;
}

.battle-flash.active {
  opacity: 1;
  animation: flash 0.5s ease-out;
}

@keyframes flash {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

.main-title {
  position: relative;
  z-index: 1;
  margin-bottom: 30px;
}

.title-glow {
  display: inline-block;
  font-size: 2.5em;
  font-weight: bold;
  background: linear-gradient(45deg, #ff4d4f, #ffa940, #1890ff, #722ed1);
  background-size: 300% 300%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradient-shift 3s ease infinite;
  text-shadow: 0 0 30px rgba(255,77,79,0.5);
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.input-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.player-input {
  position: relative;
  animation: float 3s ease-in-out infinite;
}

.player-input.red-side {
  animation-delay: 0s;
}

.player-input.blue-side {
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

.input-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150px;
  height: 150px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: -1;
  filter: blur(30px);
  opacity: 0.3;
  animation: pulse 2s ease-in-out infinite;
}

.input-glow.red {
  background: radial-gradient(circle, #ff4d4f, transparent);
}

.input-glow.blue {
  background: radial-gradient(circle, #1890ff, transparent);
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.5; }
}

.pokemon-input {
  padding: 10px;
  border: 2px solid #ccc;
  border-radius: 8px;
  width: 200px;
  text-align: center;
  transition: all 0.3s;
  background: rgba(255,255,255,0.9);
}

.pokemon-input:focus {
  outline: none;
  border-color: #722ed1;
  box-shadow: 0 0 20px rgba(114,46,209,0.5);
  transform: scale(1.05);
}

.red-side h3 { 
  color: #ff4d4f;
  text-shadow: 0 0 10px rgba(255,77,79,0.5);
}

.blue-side h3 { 
  color: #1890ff;
  text-shadow: 0 0 10px rgba(24,144,255,0.5);
}

.vs-container {
  position: relative;
}

.vs-text {
  font-size: 40px;
  font-weight: bold;
  font-style: italic;
  color: #333;
  position: relative;
  z-index: 2;
  animation: vs-shake 0.5s ease-in-out infinite alternate;
  text-shadow: 
    2px 2px 0 #ff4d4f,
    -2px -2px 0 #1890ff;
}

@keyframes vs-shake {
  0% { transform: rotate(-2deg) scale(1); }
  100% { transform: rotate(2deg) scale(1.05); }
}

.vs-lightning {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  transform: translate(-50%, -50%);
  background: 
    linear-gradient(45deg, transparent 40%, #ffd700 40%, #ffd700 60%, transparent 60%),
    linear-gradient(-45deg, transparent 40%, #ffd700 40%, #ffd700 60%, transparent 60%);
  opacity: 0;
  animation: lightning-flash 3s ease-in-out infinite;
}

@keyframes lightning-flash {
  0%, 90%, 100% { opacity: 0; }
  92%, 96% { opacity: 0.8; }
  94% { opacity: 0; }
}

.battle-btn {
  padding: 15px 40px;
  font-size: 20px;
  background: linear-gradient(45deg, #ff4d4f, #1890ff);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.btn-text {
  position: relative;
  z-index: 2;
}

.btn-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255,255,255,0.3) 50%,
    transparent 70%
  );
  transform: rotate(45deg);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

.battle-btn:hover { 
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(0,0,0,0.3);
}

.battle-btn:active {
  transform: scale(0.98);
}

.battle-btn:disabled { 
  background: #ccc; 
  cursor: not-allowed;
  transform: scale(1);
}

.result-zone { 
  margin-top: 40px;
  position: relative;
  z-index: 1;
}

.players-info {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
}

.slide-in-left {
  animation: slideInLeft 0.8s ease-out;
}

.slide-in-right {
  animation: slideInRight 0.8s ease-out;
}

@keyframes slideInLeft {
  from {
    transform: translateX(-200px) rotate(-10deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(200px) rotate(10deg);
    opacity: 0;
  }
  to {
    transform: translateX(0) rotate(0);
    opacity: 1;
  }
}

.p-card {
  position: relative;
  padding: 20px;
  transition: transform 0.3s;
}

.p-card:hover {
  transform: scale(1.05) rotate(2deg);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: scale(1.05) rotate(0deg); }
  25% { transform: scale(1.05) rotate(-2deg); }
  75% { transform: scale(1.05) rotate(2deg); }
}

.card-energy {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 10px;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.p-card:hover .card-energy {
  opacity: 1;
  animation: energy-pulse 1s ease-in-out infinite;
}

.card-energy.red {
  box-shadow: 0 0 30px rgba(255,77,79,0.6);
}

.card-energy.blue {
  box-shadow: 0 0 30px rgba(24,144,255,0.6);
}

@keyframes energy-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(255,77,79,0.4); }
  50% { box-shadow: 0 0 40px rgba(255,77,79,0.8); }
}

.avatar-bounce {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.p-card img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid;
  transition: all 0.3s;
}

.p-card:hover img {
  border-width: 6px;
  box-shadow: 0 0 30px currentColor;
}

.p-card.red img { border-color: #ff4d4f; }
.p-card.blue img { border-color: #1890ff; }

.rank-badge {
  font-size: 14px;
  font-weight: bold;
  margin: 8px 0 4px;
  color: #722ed1;
}

.power-score {
  font-size: 18px;
  font-weight: bold;
  color: #ffa940;
  margin: 4px 0 8px;
}

.strengths {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: center;
}

.strength-tag {
  display: inline-block;
  padding: 2px 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  animation: tagFloat 3s ease-in-out infinite;
}

.strength-tag:nth-child(2) {
  animation-delay: 0.5s;
}

.strength-tag:nth-child(3) {
  animation-delay: 1s;
}

@keyframes tagFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.power-lines {
  margin-top: 10px;
  display: flex;
  gap: 5px;
  justify-content: center;
}

.power-line {
  width: 40px;
  height: 4px;
  background: linear-gradient(90deg, transparent, #ffd700, transparent);
  animation: power-flow 1s ease-in-out infinite;
}

.power-line:nth-child(2) {
  animation-delay: 0.2s;
}

.power-line:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes power-flow {
  0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
  50% { opacity: 1; transform: scaleX(1); }
}

.chart-container {
  width: 400px;
  height: 400px;
  position: relative;
}

.radar-expand {
  animation: radarExpand 1s ease-out;
}

@keyframes radarExpand {
  from {
    transform: scale(0) rotate(180deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

.tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  display: inline-block;
  margin-top: 8px;
  animation: tag-glow 2s ease-in-out infinite;
}

@keyframes tag-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255,215,0,0.5); }
  50% { box-shadow: 0 0 15px rgba(255,215,0,0.8); }
}

.tag.ghost { 
  background: #eee; 
  color: #666;
  animation: none;
}

.ai-commentary {
  margin-top: 30px;
  background: rgba(249,249,249,0.95);
  padding: 20px;
  border-left: 5px solid #722ed1;
  text-align: left;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.fade-in-up {
  animation: fadeInUp 1s ease-out 0.5s both;
}

@keyframes fadeInUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.commentary-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  background: linear-gradient(90deg, #722ed1, #1890ff, #722ed1);
  background-size: 200% 100%;
  animation: border-flow 3s linear infinite;
}

@keyframes border-flow {
  to { background-position: 200% 0; }
}

.ai-commentary p {
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
  position: relative;
  z-index: 1;
}

.error-msg { 
  color: red; 
  margin-top: 20px;
  font-weight: bold;
}

.shake {
  animation: error-shake 0.5s ease-in-out;
}

@keyframes error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
</style>