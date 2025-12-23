<script setup>
import { ref, onMounted, nextTick } from "vue";
import axios from "axios";
import * as echarts from "echarts";

// --- 状态数据 ---
const player1 = ref("");
const player2 = ref("");
const loading = ref(false);
const battleResult = ref(null);
const errorMsg = ref("");
const showBattleFlash = ref(false);
const analysisStage = ref(""); // 'fetching', 'analyzing', 'complete'
const analysisProgress = ref(0);

// --- 投掷动画相关数据 ---
const flyingItems = ref([]);
let animationTimer = null;
const attributes = [
  { label: "仓库", icon: "📦" },
  { label: "粉丝", icon: "👥" },
  { label: "获赞", icon: "⭐" },
  { label: "活跃", icon: "🔥" },
  { label: "心愿", icon: "🌠" },
  { label: "积分", icon: "💎" },
];

// 在你的 ref 定义区域添加以下数据
const topCoders = ref([
  { name: "torvalds", avatar: "https://github.com/torvalds.png", rankTitle: "代码之神", rankClass: "god", score: 9999, winRate: 98 },
  { name: "yyx990803", avatar: "https://github.com/yyx990803.png", rankTitle: "架构大师", rankClass: "master", score: 8850, winRate: 92 },
  { name: "gaearon", avatar: "https://github.com/gaearon.png", rankTitle: "架构大师", rankClass: "master", score: 8720, winRate: 89 },
  { name: "tj", avatar: "https://github.com/tj.png", rankTitle: "全栈专家", rankClass: "pro", score: 8560, winRate: 95 },
  { name: "ant-fu", avatar: "https://github.com/antfu.png", rankTitle: "开源劳模", rankClass: "pro", score: 8400, winRate: 91 },
  { name: "ry", avatar: "https://github.com/ry.png", rankTitle: "内核专家", rankClass: "pro", score: 8300, winRate: 88 },
  { name: "DHH", avatar: "https://github.com/dhh.png", rankTitle: "优雅大师", rankClass: "master", score: 8150, winRate: 85 },
  { name: "addyosmani", avatar: "https://github.com/addyosmani.png", rankTitle: "性能专家", rankClass: "pro", score: 7900, winRate: 87 },
  { name: "wesbos", avatar: "https://github.com/wesbos.png", rankTitle: "教育先行者", rankClass: "pro", score: 7600, winRate: 84 },
  { name: "kentcdodds", avatar: "https://github.com/kentcdodds.png", rankTitle: "测试专家", rankClass: "pro", score: 7450, winRate: 82 }
]);

// 图表实例
let chartInstance = null;
const chartRef = ref(null);

// AI 分析阶段文本
const stageTexts = {
  fetching: "正在获取选手数据...",
  analyzing: "AI 正在深度分析战局...",
  complete: "分析完成！",
};

const redIsHit = ref(false);
const blueIsHit = ref(false);
// --- 动画逻辑：投掷属性 ---
const throwAttribute = (side) => {
  const attr = attributes[Math.floor(Math.random() * attributes.length)];
  const id = Date.now() + Math.random();

  // 随机抛物线高度
  const offset = Math.floor(Math.random() * 60) - 30;

  flyingItems.value.push({
    id,
    side, // 'red' (左) 或 'blue' (右)
    offset,
    ...attr,
  });

  // 命中逻辑：1秒左右接触
  setTimeout(() => {
    if (side === "red") {
      blueIsHit.value = true;
      setTimeout(() => (blueIsHit.value = false), 150);
    } else {
      redIsHit.value = true;
      setTimeout(() => (redIsHit.value = false), 150);
    }
  }, 1000);

  // 移除元素
  setTimeout(() => {
    flyingItems.value = flyingItems.value.filter((item) => item.id !== id);
  }, 1200);
};

// --- 核心方法：发起对战 ---
const startBattle = async () => {
  if (!player1.value || !player2.value) {
    alert("请先输入两名选手的 GitHub ID！");
    return;
  }

  loading.value = true;
  errorMsg.value = "";
  battleResult.value = null;
  showBattleFlash.value = true;
  analysisStage.value = "fetching";
  analysisProgress.value = 0;

  // --- 新增：自动投掷武器动画定时器 ---
  const weaponTimer = setInterval(() => {
    // 随机让左边或右边扔
    throwAttribute(Math.random() > 0.5 ? "red" : "blue");
  }, 600); // 每600ms扔一个属性

  // 战斗闪光效果
  setTimeout(() => {
    showBattleFlash.value = false;
  }, 500);

  // 模拟进度条
  const progressInterval = setInterval(() => {
    if (analysisProgress.value < 90) {
      analysisProgress.value += Math.random() * 15;
    }
  }, 300);

  try {
    // 第一阶段：获取数据
    await new Promise((resolve) => setTimeout(resolve, 800));
    analysisStage.value = "analyzing";
    analysisProgress.value = 40;

    const res = await axios.post("http://127.0.0.1:5000/api/battle/analyze", {
      player1: player1.value,
      player2: player2.value,
    });

    if (res.data.success) {
      analysisProgress.value = 100;
      analysisStage.value = "complete";

      // 完成后短暂延迟，让用户看到完成状态
      await new Promise((resolve) => setTimeout(resolve, 500));

      battleResult.value = res.data;
      await nextTick();
      renderChart(res.data.players);
    }
  } catch (err) {
    console.error(err);
    errorMsg.value =
      err.response?.data?.message || "对战请求失败，请检查后端服务！";
  } finally {
    // --- 重要：清理定时器 ---
    clearInterval(progressInterval);
    clearInterval(weaponTimer); // 清理投掷定时器
    loading.value = false;
    analysisStage.value = "";
    analysisProgress.value = 0;
  }
};

// --- 图表渲染逻辑 ---
const renderChart = (players) => {
  if (!chartRef.value) return;

  if (chartInstance) {
    chartInstance.dispose();
  }

  chartInstance = echarts.init(chartRef.value);

  const p1 = players.player1;
  const p2 = players.player2;

  const p1Name = `${p1.username} (红方)`;
  const p2Name = `${p2.username} (蓝方)`;

  const getData = (p) => [
    p.github_data.repos,
    p.github_data.followers,
    p.github_data.stars,
    p.github_data.commits_weekly,
    p.internal_data.wishes_count,
    p.internal_data.score,
  ];

  const option = {
    title: {
      text: "战力雷达对比",
      left: "center",
      textStyle: {
        color: "#333",
        fontSize: 18,
        fontWeight: "bold",
      },
    },
    tooltip: {},
    legend: {
      data: [p1Name, p2Name],
      bottom: 0,
    },
    radar: {
      indicator: [
        {
          name: "仓库 (Repos)",
          max: Math.max(p1.github_data.repos, p2.github_data.repos) + 10,
        },
        {
          name: "粉丝 (Followers)",
          max:
            Math.max(p1.github_data.followers, p2.github_data.followers) + 10,
        },
        {
          name: "获赞 (Stars)",
          max: Math.max(p1.github_data.stars, p2.github_data.stars) + 10,
        },
        {
          name: "活跃 (Commits)",
          max:
            Math.max(
              p1.github_data.commits_weekly,
              p2.github_data.commits_weekly
            ) + 5,
        },
        {
          name: "心愿 (Wishes)",
          max:
            Math.max(
              p1.internal_data.wishes_count,
              p2.internal_data.wishes_count
            ) + 5,
        },
        {
          name: "积分 (Score)",
          max: Math.max(p1.internal_data.score, p2.internal_data.score) + 50,
        },
      ],
    },
    series: [
      {
        name: "Ability",
        type: "radar",
        animationDuration: 2000,
        animationEasing: "elasticOut",
        data: [
          {
            value: getData(p1),
            name: p1Name,
            areaStyle: { opacity: 0.3, color: "#ff4d4f" },
            itemStyle: { color: "#ff4d4f" },
          },
          {
            value: getData(p2),
            name: p2Name,
            areaStyle: { opacity: 0.3, color: "#1890ff" },
            itemStyle: { color: "#1890ff" },
          },
        ],
      },
    ],
  };

  chartInstance.setOption(option);
};

window.addEventListener(
  "resize",
  () => chartInstance && chartInstance.resize()
);
</script>

<template>
  <div class="battle-container">
    <!-- 背景粒子效果 -->
    <div class="particles">
      <div
        class="particle"
        v-for="i in 20"
        :key="i"
        :style="{
        left: Math.random() * 100 + '%',
        animationDelay: Math.random() * 5 + 's',
        animationDuration: (3 + Math.random() * 4) + 's'
      }"
      ></div>
    </div>

    <!-- 战斗闪光效果 -->
    <div
      class="battle-flash"
      :class="{ active: showBattleFlash }"
    ></div>
    
    <!-- AI 分析全屏遮罩 -->
    <div
      v-if="loading"
      class="analysis-overlay pixel-battle-theme"
    >
      <div class="pixel-stage">

        <div class="battle-ground">
          <div
            class="pixel-unit opponent-side"
            :class="{ 'is-hit': blueIsHit }"
          >
            <div class="pixel-status-bar opponent-bar">
              <div class="p-header">
                <span class="p-name">{{ player2 || 'UNKNOWN' }}</span>
                <span class="p-lv">Lv.99</span>
              </div>
              <div class="p-hp-container">
                <span class="p-hp-label">HP</span>
                <div class="p-hp-track">
                  <div
                    class="p-hp-fill"
                    :style="{ width: (100 - analysisProgress) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="pixel-sprite-wrap">
              <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/1.gif"
                class="pixel-avatar"
              />
              <div class="pixel-base"></div>
            </div>
          </div>

          <div class="trajectory-layer">
            <div
              v-for="item in flyingItems"
              :key="item.id"
              :class="['flying-weapon', item.side === 'red' ? 'throw-right' : 'throw-left']"
              :style="{ top: (50 + item.offset) + '%' }"
            >
              <div class="weapon-content">
                <span class="w-icon">{{ item.icon }}</span>
                <span class="w-label">{{ item.label }}</span>
              </div>
            </div>
          </div>

          <div
            class="pixel-unit player-side"
            :class="{ 'is-hit': redIsHit }"
          >
            <div class="pixel-sprite-wrap">
              <img
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/back/4.gif"
                class="pixel-avatar player-back"
              />
              <div class="pixel-base"></div>
            </div>
            <div class="pixel-status-bar player-bar">
              <div class="p-header">
                <span class="p-name">{{ player1 || 'YOU' }}</span>
                <span class="p-lv">Lv.99</span>
              </div>
              <div class="p-hp-container">
                <span class="p-hp-label">HP</span>
                <div class="p-hp-track">
                  <div
                    class="p-hp-fill"
                    :style="{ width: (analysisProgress) + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="pixel-message-box">
          <div class="message-content">
            <span class="pixel-cursor"></span>
            {{ stageTexts[analysisStage] }}...
          </div>
          <div class="message-percent">{{ Math.round(analysisProgress) }}%</div>
        </div>

        <h2 class="analysis-title">{{ stageTexts[analysisStage] }}</h2>

        <div class="progress-container">
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: analysisProgress + '%' }"
            ></div>
            <div
              class="progress-glow"
              :style="{ left: analysisProgress + '%' }"
            ></div>
          </div>
          <div class="progress-text">{{ Math.round(analysisProgress) }}%</div>
        </div>

        <!-- 数据流动效果 -->
        <div class="data-streams">
          <div
            class="data-line"
            v-for="i in 5"
            :key="i"
          ></div>
        </div>

        <!-- 分析状态指示器 -->
        <div class="status-indicators">
          <div
            class="indicator"
            :class="{ active: analysisStage === 'fetching' }"
          >
            <span class="dot"></span>
            <span class="label">数据采集</span>
          </div>
          <div
            class="indicator"
            :class="{ active: analysisStage === 'analyzing' }"
          >
            <span class="dot"></span>
            <span class="label">AI分析</span>
          </div>
          <div
            class="indicator"
            :class="{ active: analysisStage === 'complete' }"
          >
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
        <input
          v-model="player1"
          placeholder="输入 GitHub ID"
          class="pokemon-input"
        />
      </div>

      <div class="vs-container">
        <div class="vs-text">VS</div>
        <div class="vs-lightning"></div>
      </div>

      <div class="player-input blue-side">
        <div class="input-glow blue"></div>
        <h3>🔵 蓝方选手</h3>
        <input
          v-model="player2"
          placeholder="输入 GitHub ID"
          class="pokemon-input"
        />
      </div>
    </div>

    <div class="action-zone">
      <button
        @click="startBattle"
        :disabled="loading"
        class="battle-btn"
      >
        <span class="btn-text">{{ loading ? 'AI 正在分析战局...' : '开始对决 (FIGHT!)' }}</span>
        <div class="btn-shine"></div>
      </button>
    </div>

    <div
      v-if="errorMsg"
      class="error-msg shake"
    >{{ errorMsg }}</div>

    <div
      v-if="battleResult"
      class="result-zone"
    >

      <div class="players-info">
        <div class="p-card red slide-in-left">
          <div class="card-energy red"></div>
          <img
            :src="battleResult.players.player1.avatar"
            alt="p1"
            class="avatar-bounce"
          />
          <h3>{{ battleResult.players.player1.username }}</h3>
          <p class="rank-badge">{{ battleResult.players.player1.rank_emoji }} {{ battleResult.players.player1.rank }}</p>
          <p class="power-score">战力: {{ battleResult.players.player1.power_score }}</p>
          <p
            class="tag"
            v-if="battleResult.players.player1.internal_data.is_member"
          >🏅 平台会员</p>
          <p
            class="tag ghost"
            v-else
          >👻 野生路人</p>
          <div class="strengths">
            <span
              class="strength-tag"
              v-for="s in battleResult.players.player1.strengths"
              :key="s"
            >{{ s }}</span>
          </div>
          <div class="power-lines">
            <div class="power-line"></div>
            <div class="power-line"></div>
            <div class="power-line"></div>
          </div>
        </div>

        <div
          class="chart-container radar-expand"
          ref="chartRef"
        ></div>

        <div class="p-card blue slide-in-right">
          <div class="card-energy blue"></div>
          <img
            :src="battleResult.players.player2.avatar"
            alt="p2"
            class="avatar-bounce"
          />
          <h3>{{ battleResult.players.player2.username }}</h3>
          <p class="rank-badge">{{ battleResult.players.player2.rank_emoji }} {{ battleResult.players.player2.rank }}</p>
          <p class="power-score">战力: {{ battleResult.players.player2.power_score }}</p>
          <p
            class="tag"
            v-if="battleResult.players.player2.internal_data.is_member"
          >🏅 平台会员</p>
          <p
            class="tag ghost"
            v-else
          >👻 野生路人</p>
          <div class="strengths">
            <span
              class="strength-tag"
              v-for="s in battleResult.players.player2.strengths"
              :key="s"
            >{{ s }}</span>
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

        <div class="arena-footer-rankings">
      <div class="ranking-inner-container">
        <div class="ranking-header">
          <h3 class="ranking-title">🏆 全球战力荣誉殿堂 (Global Hall of Fame)</h3>
          <div class="ranking-stats">总计对决: 45,902 | 活跃选手: 1,240</div>
        </div>

        <div class="ranking-table-wrapper">
          <table class="full-width-table">
            <thead>
              <tr>
                <th>排名</th>
                <th>选手 (CODER)</th>
                <th>阶位</th>
                <th>战力 (POWER)</th>
                <th>胜率</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(coder, index) in topCoders" :key="index">
                <td class="rank-id">{{ index + 1 }}</td>
                <td class="coder-cell">
                  <img :src="coder.avatar" class="table-avatar">
                  <span class="coder-name">{{ coder.name }}</span>
                </td>
                <td><span :class="['class-tag', coder.rankClass]">{{ coder.rankTitle }}</span></td>
                <td class="power-val">{{ coder.score }}</td>
                <td class="rate-cell">
                  <div class="rate-bar-bg"><div class="rate-bar-fill" :style="{ width: coder.winRate + '%' }"></div></div>
                  <span class="rate-num">{{ coder.winRate }}%</span>
                </td>
                <td class="status-online">● Online</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap");

.battle-container {
  width: 100%;
  max-width: none; /* 解除之前的 1000px 限制 */
  margin: 0;
  padding: 0;
  text-align: center;
  position: relative;
  /* 解决太白：增加一个非常淡的底纹背景 */
  background-color: #ffffff;
  background-image: radial-gradient(#f0f0f0 1px, transparent 1px);
  background-size: 30px 30px;
}

/* 包装层：让对战内容依然保持在中间 1000px */
.main-content-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* ============ AI 分析遮罩层 ============ */
.analysis-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 60, 0.98),
    rgba(60, 30, 90, 0.98)
  );
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  justify-content: center;
  align-items: center;
  animation: overlayFadeIn 0.3s ease-out;
}

@keyframes overlayFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
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
  box-shadow: 0 0 40px rgba(102, 126, 234, 0.8);
  animation: brainPulse 2s ease-in-out infinite;
}

@keyframes brainPulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

.ai-icon {
  font-size: 50px;
  animation: iconSpin 3s linear infinite;
}

@keyframes iconSpin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.brain-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(102, 126, 234, 0.5);
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
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  animation: titleGlow 2s ease-in-out infinite;
}

@keyframes titleGlow {
  0%,
  100% {
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  }
  50% {
    text-shadow: 0 0 30px rgba(102, 126, 234, 0.8);
  }
}

/* 进度条 */
.progress-container {
  margin-bottom: 40px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
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
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.8);
}

.progress-glow {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
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
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 10px #667eea;
  }
  50% {
    transform: scale(1.5);
    box-shadow: 0 0 20px #667eea;
  }
}

.indicator .label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
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
  background: radial-gradient(circle, rgba(255, 255, 255, 0.8), transparent);
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
  background: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.9),
    transparent 70%
  );
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
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
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
  /* 这里的渐变颜色现在是固定的 */
  background: linear-gradient(45deg, #ff4d4f, #ffa940, #1890ff, #722ed1);
  background-size: 100% 100%; /* 将背景尺寸设为 100% 填满 */
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  /* 1. 删除下面这一行动画引用 */
  /* animation: gradient-shift 3s ease infinite; */
  
  /* 2. 保留发光效果（如果需要也可以调整颜色） */
  text-shadow: 0 0 20px rgba(255, 77, 79, 0.3);
}

@keyframes gradient-shift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.input-zone {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 100px;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
}

.player-input {
  position: relative;
}

.player-input.red-side {
  animation-delay: 0s;
}

.player-input.blue-side {
  animation-delay: 1.5s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
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
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.5;
  }
}

.pokemon-input {
  padding: 10px;
  border: 2px solid #ccc;
  border-radius: 8px;
  width: 200px;
  text-align: center;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.9);
}

.pokemon-input:focus {
  outline: none;
  border-color: #722ed1;
  box-shadow: 0 0 20px rgba(114, 46, 209, 0.5);
  transform: scale(1.05);
}

.red-side h3 {
  color: #ff4d4f;
  text-shadow: 0 0 10px rgba(255, 77, 79, 0.5);
}

.blue-side h3 {
  color: #1890ff;
  text-shadow: 0 0 10px rgba(24, 144, 255, 0.5);
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
  text-shadow: 2px 2px 0 #ff4d4f, -2px -2px 0 #1890ff;
}

@keyframes vs-shake {
  0% {
    transform: rotate(-2deg) scale(1);
  }
  100% {
    transform: rotate(2deg) scale(1.05);
  }
}

.vs-lightning {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  transform: translate(-50%, -50%);
  background: linear-gradient(
      45deg,
      transparent 40%,
      #ffd700 40%,
      #ffd700 60%,
      transparent 60%
    ),
    linear-gradient(
      -45deg,
      transparent 40%,
      #ffd700 40%,
      #ffd700 60%,
      transparent 60%
    );
  opacity: 0;
  animation: lightning-flash 3s ease-in-out infinite;
}

@keyframes lightning-flash {
  0%,
  90%,
  100% {
    opacity: 0;
  }
  92%,
  96% {
    opacity: 0.8;
  }
  94% {
    opacity: 0;
  }
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
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
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
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%
  );
  transform: rotate(45deg);
  animation: shine 3s ease-in-out infinite;
}

@keyframes shine {
  0% {
    transform: translateX(-100%) translateY(-100%) rotate(45deg);
  }
  100% {
    transform: translateX(100%) translateY(100%) rotate(45deg);
  }
}

.battle-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.3);
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
  0%,
  100% {
    transform: scale(1.05) rotate(0deg);
  }
  25% {
    transform: scale(1.05) rotate(-2deg);
  }
  75% {
    transform: scale(1.05) rotate(2deg);
  }
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
  box-shadow: 0 0 30px rgba(255, 77, 79, 0.6);
}

.card-energy.blue {
  box-shadow: 0 0 30px rgba(24, 144, 255, 0.6);
}

@keyframes energy-pulse {
  0%,
  100% {
    box-shadow: 0 0 20px rgba(255, 77, 79, 0.4);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 77, 79, 0.8);
  }
}

.avatar-bounce {
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
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

.p-card.red img {
  border-color: #ff4d4f;
}
.p-card.blue img {
  border-color: #1890ff;
}

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
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
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
  0%,
  100% {
    opacity: 0.3;
    transform: scaleX(0.8);
  }
  50% {
    opacity: 1;
    transform: scaleX(1);
  }
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
  0%,
  100% {
    box-shadow: 0 0 5px rgba(255, 215, 0, 0.5);
  }
  50% {
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
  }
}

.tag.ghost {
  background: #eee;
  color: #666;
  animation: none;
}

.ai-commentary {
  margin-top: 30px;
  background: rgba(249, 249, 249, 0.95);
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
  to {
    background-position: 200% 0;
  }
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
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
}

/* 修改或新增部分样式 */
.combat-stage {
  margin: 20px 0; /* 给舞台一点间距 */
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20px;
  padding: 10px;
}

.hero-body {
  font-size: 50px; /* 调整小人大小 */
  filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
}

.hero-name {
  color: white;
  font-size: 14px;
  margin-top: 5px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.red-text {
  color: #ff4d4f;
  text-shadow: 0 0 5px #ff4d4f;
}
.blue-text {
  color: #1890ff;
  text-shadow: 0 0 5px #1890ff;
}

/* 确保武器标签可读 */
.weapon-label {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.9);
  color: #333;
  padding: 0 6px;
  border-radius: 10px;
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

/* 宝可梦对战场景 */
.pokemon-battle-scene {
  width: 100vw;
  height: 100vh;
  max-width: none !important;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at center, #4a4a8a 0%, #1a1a2e 100%);
}

.battle-arena {
  width: 90%;
  max-width: 1200px;
  height: 60vh;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  perspective: 1000px;
}

/* 角色单元 */
.battle-unit {
  position: relative;
  width: 300px;
  transition: transform 0.2s;
}

/* 状态框 - 经典斜角样式 */
.status-box {
  background: #f8f8f8;
  border: 4px solid #333;
  border-radius: 0 20px 0 20px;
  padding: 15px;
  color: #333;
  text-align: left;
  box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
}

.trainer-name {
  font-weight: bold;
  font-size: 20px;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.hp-bar-container {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #333;
  padding: 4px 8px;
  border-radius: 10px;
}

.hp-label {
  color: #ffcb05;
  font-weight: bold;
  font-size: 12px;
}
.hp-bar {
  flex: 1;
  height: 10px;
  background: #555;
  border-radius: 5px;
  overflow: hidden;
}

.hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #51ff00, #9dff00);
  transition: width 0.3s ease;
}

/* 角色与平台 */
.character-sprite {
  font-size: 120px;
  filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.2));
  z-index: 5;
  position: relative;
}

.platform {
  width: 250px;
  height: 60px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  margin-top: -40px;
  transform: rotateX(60deg);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

/* 受击震动效果 */
.is-hit {
  animation: hit-shake 0.2s ease-in-out infinite;
}

@keyframes hit-shake {
  0% {
    transform: translateX(0);
    filter: brightness(1.5) contrast(1.5);
  }
  25% {
    transform: translateX(-10px);
  }
  75% {
    transform: translateX(10px);
  }
  100% {
    transform: translateX(0);
    filter: brightness(1);
  }
}

/* 武器飞行轨道优化 */
.trajectory-zone {
  flex: 1;
  position: relative;
  height: 100%;
}

.weapon-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: white;
  padding: 5px 12px;
  border: 3px solid #333;
  border-radius: 15px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.2);
}

.fly-to-blue {
  left: 0;
  bottom: 30%;
  animation: move-to-blue 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

.fly-to-red {
  right: 0;
  top: 30%;
  animation: move-to-red 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes move-to-blue {
  0% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(300px, -150px) scale(1.2) rotate(180deg);
  }
  100% {
    transform: translate(600px, -50px) scale(0.8) rotate(360deg);
    opacity: 0;
  }
}

@keyframes move-to-red {
  0% {
    transform: translate(0, 0) scale(1) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(-300px, 150px) scale(1.2) rotate(-180deg);
  }
  100% {
    transform: translate(-600px, 50px) scale(0.8) rotate(-360deg);
    opacity: 0;
  }
}

/* 底部对话框 */
.pokemon-dialog {
  width: 90%;
  max-width: 1000px;
  height: 120px;
  background: #f8f8f8;
  border: 6px double #333;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
  box-sizing: border-box;
}

.dialog-text {
  font-size: 28px;
  color: #333;
  font-weight: bold;
  font-family: "Courier New", Courier, monospace;
}

.dialog-progress {
  font-size: 24px;
  color: #777;
  font-family: "Courier New", monospace;
}

.typing-cursor {
  animation: blink 0.8s infinite;
  color: #ff4d4f;
  margin-right: 10px;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

.pixel-battle-theme {
  --p-black: #000000;
  --p-white: #ffffff;
  --p-green: #51ff00;
  --p-yellow: #faff00;
  --p-bg: #2d2a4a;

  background: var(--p-bg);
  font-family: "Press Start 2P", cursive; /* 使用像素字体 */
  image-rendering: pixelated;
  z-index: 99999;
}

.pixel-stage {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-image: linear-gradient(
      rgba(255, 255, 255, 0.05) 1px,
      transparent 1px
    ),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
}

/* 布局：对角线分立 */
.battle-ground {
  width: 90%;
  max-width: 1100px;
  height: 70vh;
  position: relative;
}

.pixel-unit {
  position: absolute;
  display: flex;
  flex-direction: column;
  transition: all 0.2s steps(4);
}

/* 敌方在右上 */
.opponent-side {
  top: 5%;
  right: 5%;
  align-items: flex-end;
}

/* 我方在左下 */
.player-side {
  bottom: 10%;
  left: 5%;
  align-items: flex-start;
}

/* 像素状态栏 */
.pixel-status-bar {
  background: #f0f0d8; /* 复古掌机屏幕色 */
  border: 4px solid var(--p-black);
  padding: 10px;
  width: 280px;
  box-shadow: 6px 6px 0px rgba(0, 0, 0, 0.3);
  margin-bottom: 15px;
}

.opponent-bar {
  border-radius: 0 0 0 15px;
}
.player-bar {
  border-radius: 15px 0 0 0;
}

.p-name {
  color: #333;
  font-size: 14px;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.p-hp-container {
  display: flex;
  align-items: center;
  background: #444;
  padding: 3px;
  border: 2px solid #000;
}

.p-hp-label {
  color: var(--p-yellow);
  font-size: 10px;
  margin-right: 5px;
}

.p-hp-track {
  flex: 1;
  height: 10px;
  background: #222;
  position: relative;
}

.p-hp-fill {
  height: 100%;
  background: var(--p-green);
  transition: width 0.5s steps(10);
}

.p-exp-row {
  height: 4px;
  background: #444;
  margin-top: 5px;
}

.p-exp-fill {
  height: 100%;
  background: #0091ff;
}

/* 角色与地台 */
.pixel-avatar {
  font-size: 200px;
  filter: drop-shadow(5px 5px 0px rgba(0, 0, 0, 0.25));
  animation: pixel-float 1.5s steps(2) infinite alternate;
}

.player-back {
  transform: scale(2);
} /* 我方靠近镜头，稍大 */

.w-icon {
  font-size: 28px;
  transform: scale(1.1);
}

.pixel-base {
  width: 220px;
  height: 40px;
  background: #6a8d6a; /* 草地绿 */
  border-radius: 50%;
  border: 4px solid #333;
  margin-top: -30px;
  transform: rotateX(60deg);
}

/* 轨道与投掷 */
.pixel-trajectory {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pixel-item-box {
  background: white;
  border: 3px solid #000;
  padding: 5px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 4px 4px 0 #000;
}

.p-text {
  font-size: 10px;
  color: #000;
  font-family: "Press Start 2P";
}

/* 对角线抛物线动画 */
.path-to-blue {
  position: absolute;
  left: 20%;
  bottom: 30%;
  animation: diagonal-up 1s steps(12) forwards;
}

.path-to-red {
  position: absolute;
  right: 20%;
  top: 30%;
  animation: diagonal-down 1s steps(12) forwards;
}

@keyframes diagonal-up {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(250px, -150px) rotate(180deg);
  }
  100% {
    transform: translate(500px, -300px) rotate(360deg);
    opacity: 0;
  }
}

@keyframes diagonal-down {
  0% {
    transform: translate(0, 0) rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: translate(-250px, 150px) rotate(-180deg);
  }
  100% {
    transform: translate(-500px, 300px) rotate(-360deg);
    opacity: 0;
  }
}

/* 底部消息框 */
.pixel-message-box {
  width: 90%;
  max-width: 900px;
  height: 110px;
  background: #333;
  border: 6px solid #f8f8f8;
  outline: 6px solid #333; /* 经典双层边框 */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 40px;
}

.message-content {
  color: white;
  font-size: 16px;
  display: flex;
  align-items: center;
  line-height: 1.5;
}

.pixel-cursor {
  width: 0;
  height: 0;
  border-left: 12px solid transparent;
  border-right: 12px solid transparent;
  border-top: 18px solid var(--p-green);
  margin-right: 20px;
  animation: cursor-bounce 0.6s steps(2) infinite;
}

.message-percent {
  color: #888;
  font-size: 14px;
}

/* 受击闪烁 */
.is-hit {
  animation: pixel-shake 0.3s steps(2) infinite;
}

@keyframes pixel-shake {
  0% {
    transform: translate(4px, 4px);
    filter: brightness(2);
  }
  50% {
    transform: translate(-4px, -4px);
    opacity: 0.5;
  }
  100% {
    transform: translate(0);
    filter: brightness(1);
  }
}

@keyframes pixel-float {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-10px);
  }
}

@keyframes cursor-bounce {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(8px);
  }
}

/* --- 布局与舞台 --- */
.battle-ground {
  position: relative;
  width: 100%;
  height: 60vh;
  background: radial-gradient(
    circle at center,
    #5a8d5a 0%,
    #2d2a4a 70%
  ); /* 模拟草地中心 */
  border: 8px solid #333;
  overflow: hidden;
}

/* --- 属性武器动画 --- */
.trajectory-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}

.flying-weapon {
  position: absolute;
  padding: 6px 12px;
  background: white;
  border: 3px solid #000;
  border-radius: 20px;
  display: flex;
  align-items: center;
  gap: 5px;
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
}

.weapon-content {
  display: flex;
  align-items: center;
  font-family: "Press Start 2P", cursive;
  font-size: 10px;
}

/* 向右扔 (我方 -> 敌方) */
.throw-right {
  left: 20%;
  animation: arc-right 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* 向左扔 (敌方 -> 我方) */
.throw-left {
  right: 20%;
  animation: arc-left 1.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes arc-right {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    transform: translate(500px, -200px) scale(0.8);
    opacity: 0;
  }
}

@keyframes arc-left {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  20% {
    opacity: 1;
    transform: scale(1.2);
  }
  100% {
    transform: translate(-500px, 200px) scale(0.8);
    opacity: 0;
  }
}

/* --- 状态栏美化 --- */
.p-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.p-lv {
  color: #f3a712;
  font-size: 10px;
}

.p-hp-track {
  border: 2px solid #000;
  background: #555;
}

.p-hp-fill {
  transition: width 0.3s steps(10); /* 像素级掉血感 */
}

/* --- 受击闪烁 --- */
.is-hit {
  animation: hit-flash 0.15s ease-in-out infinite;
}

@keyframes hit-flash {
  0% {
    filter: brightness(1);
    transform: translateX(0);
  }
  50% {
    filter: brightness(3) contrast(2);
    transform: translateX(10px);
  }
  100% {
    filter: brightness(1);
    transform: translateX(-10px);
  }
}

/* --- 地台 --- */
.pixel-base {
  width: 200px;
  height: 40px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  margin: -20px auto 0;
  transform: rotateX(60deg);
  border: 2px dashed rgba(255, 255, 255, 0.3);
}

/* 1️⃣ 如果是 img */
:deep(img.pixel-avatar),
:deep(.pixel-avatar img) {
  width: 160px !important;
  height: auto !important;
  image-rendering: pixelated;
}

/* 2️⃣ 如果是 span / div（emoji 或字符） */
:deep(.pixel-avatar) {
  font-size: 160px !important;
  line-height: 1;
}

/* 3️⃣ 如果是背景图 */
:deep(.pixel-avatar) {
  background-size: contain !important;
}

/* emoji / 文字 */
:deep(.w-icon) {
  font-size: 32px !important;
}

/* 如果是 img */
:deep(.w-icon img) {
  width: 32px !important;
  height: 32px !important;
}

/* 整个卡片一起放大（兜底） */
:deep(.w-item) {
  transform: scale(1.15);
}

/* --- 全屏荣誉殿堂 --- */
.arena-footer-rankings {
  width: 100%; /* 占据整个屏幕宽度 */
  background: #f6f8fa; /* GitHub 风格的浅灰色背景 */
  border-top: 1px solid #d0d7de;
  padding: 60px 0;
  margin-top: 40px;
}

.ranking-inner-container {
  max-width: 1100px; /* 内容依然保持合适的阅读宽度 */
  margin: 0 auto;
  padding: 0 20px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  border-bottom: 2px solid #24292f;
  padding-bottom: 10px;
}

.ranking-title {
  font-size: 22px;
  margin: 0;
  color: #24292f;
}

.ranking-stats {
  font-size: 13px;
  color: #57606a;
  font-family: monospace;
}

/* 表格专业化 */
.ranking-table-wrapper {
  background: white;
  border: 1px solid #d0d7de;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.full-width-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.full-width-table th {
  background: #f6f8fa;
  padding: 15px;
  font-size: 12px;
  color: #57606a;
}

.full-width-table td {
  padding: 14px 15px;
  border-bottom: 1px solid #f0f0f0;
}

/* 装饰细节 */
.table-avatar { width: 30px; height: 30px; border-radius: 4px; vertical-align: middle; margin-right: 10px; }
.coder-name { font-weight: 600; color: #0969da; }
.power-val { font-family: monospace; font-weight: bold; color: #cf222e; }

.class-tag {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: bold;
}
.class-tag.god { background: #fff8c5; color: #9a6700; border: 1px solid #d4a72c; }
.class-tag.master { background: #ddf4ff; color: #0969da; }

.rate-bar-bg { width: 80px; height: 6px; background: #eee; border-radius: 3px; display: inline-block; margin-right: 8px; }
.rate-bar-fill { height: 100%; background: #2da44e; border-radius: 3px; }
.status-online { color: #2da44e; font-size: 12px; font-weight: bold; }
</style>