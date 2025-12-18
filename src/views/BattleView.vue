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

// 图表实例
let chartInstance = null
const chartRef = ref(null)

// --- 核心方法：发起对战 ---
const startBattle = async () => {
  if (!player1.value || !player2.value) {
    alert('请先输入两名选手的 GitHub ID！')
    return
  }

  loading.value = true
  errorMsg.value = ''
  battleResult.value = null

  try {
    // 调用后端接口 (注意：这里假设你的后端运行在 localhost:5000)
    // 如果你配置了 vite 代理，可以直接写 '/api/battle/analyze'
    const res = await axios.post('http://127.0.0.1:5000/api/battle/analyze', {
      player1: player1.value,
      player2: player2.value
    })

    if (res.data.success) {
      battleResult.value = res.data
      // 等待 DOM 更新后渲染图表
      await nextTick()
      renderChart(res.data.players)
    }
  } catch (err) {
    console.error(err)
    errorMsg.value = err.response?.data?.message || '对战请求失败，请检查后端服务！'
  } finally {
    loading.value = false
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
  
  // --- 👇 修改开始：给名字加上后缀，区分红蓝方 👇 ---
  const p1Name = `${p1.username} (红方)`
  const p2Name = `${p2.username} (蓝方)`
  // --- 👆 修改结束 👆 ---

  const getData = (p) => [
    p.github_data.repos,
    p.github_data.followers,
    p.github_data.stars,
    p.github_data.commits_weekly,
    p.internal_data.wishes_count,
    p.internal_data.score
  ]

  const option = {
    title: { text: '战力雷达对比', left: 'center' },
    tooltip: {},
    legend: {
      // --- 👇 修改这里：使用新名字 👇 ---
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
      data: [
        {
          value: getData(p1),
          // --- 👇 修改这里：使用新名字 👇 ---
          name: p1Name,
          areaStyle: { opacity: 0.3, color: '#ff4d4f' },
          itemStyle: { color: '#ff4d4f' }
        },
        {
          value: getData(p2),
          // --- 👇 修改这里：使用新名字 👇 ---
          name: p2Name,
          areaStyle: { opacity: 0.3, color: '#1890ff' },
          itemStyle: { color: '#1890ff' }
        }
      ]
    }]
  }

  chartInstance.setOption(option)
}

// 页面大小改变时重绘图表
window.addEventListener('resize', () => chartInstance && chartInstance.resize())
</script>

<template>
  <div class="battle-container">
    <h1>⚔️ 代码竞技场 (Code Arena) ⚔️</h1>
    
    <div class="input-zone">
      <div class="player-input red-side">
        <h3>🔴 红方选手</h3>
        <input v-model="player1" placeholder="输入 GitHub ID " />
      </div>
      
      <div class="vs-text">VS</div>
      
      <div class="player-input blue-side">
        <h3>🔵 蓝方选手</h3>
        <input v-model="player2" placeholder="输入 GitHub ID " />
      </div>
    </div>

    <div class="action-zone">
      <button @click="startBattle" :disabled="loading" class="battle-btn">
        {{ loading ? 'AI 正在分析战局...' : '开始对决 (FIGHT!)' }}
      </button>
    </div>

    <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>

    <div v-if="battleResult" class="result-zone">
      
      <div class="players-info">
        <div class="p-card red">
          <img :src="battleResult.players.player1.avatar" alt="p1" />
          <h3>{{ battleResult.players.player1.username }}</h3>
          <p class="tag" v-if="battleResult.players.player1.internal_data.is_member">🏅 平台会员</p>
          <p class="tag ghost" v-else>👻 野生路人</p>
        </div>

        <div class="chart-container" ref="chartRef"></div>

        <div class="p-card blue">
          <img :src="battleResult.players.player2.avatar" alt="p2" />
          <h3>{{ battleResult.players.player2.username }}</h3>
          <p class="tag" v-if="battleResult.players.player2.internal_data.is_member">🏅 平台会员</p>
          <p class="tag ghost" v-else>👻 野生路人</p>
        </div>
      </div>

      <div class="ai-commentary">
        <h3>🎤 AI 解说</h3>
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
}

/* 输入区样式 */
.input-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}
.player-input input {
  padding: 10px;
  border: 2px solid #ccc;
  border-radius: 8px;
  width: 200px;
  text-align: center;
}
.red-side h3 { color: #ff4d4f; }
.blue-side h3 { color: #1890ff; }
.vs-text {
  font-size: 40px;
  font-weight: bold;
  font-style: italic;
  color: #333;
}

/* 按钮样式 */
.battle-btn {
  padding: 15px 40px;
  font-size: 20px;
  background: linear-gradient(45deg, #ff4d4f, #1890ff);
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.2s;
  box-shadow: 0 4px 15px rgba(0,0,0,0.2);
}
.battle-btn:hover { transform: scale(1.05); }
.battle-btn:disabled { background: #ccc; cursor: not-allowed; }

/* 结果区样式 */
.result-zone { margin-top: 40px; animation: fadeIn 1s; }
.players-info {
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
}
.chart-container {
  width: 400px;
  height: 400px;
}
.p-card img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 4px solid;
}
.p-card.red img { border-color: #ff4d4f; }
.p-card.blue img { border-color: #1890ff; }

.tag {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}
.tag.ghost { background: #eee; color: #666; }

/* AI 解说样式 */
.ai-commentary {
  margin-top: 30px;
  background: #f9f9f9;
  padding: 20px;
  border-left: 5px solid #722ed1;
  text-align: left;
  border-radius: 8px;
}
.ai-commentary p {
  font-size: 16px;
  line-height: 1.6;
  white-space: pre-wrap;
}
.error-msg { color: red; margin-top: 20px; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>