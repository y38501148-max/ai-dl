<script setup lang="ts">
import StatCard from '../components/StatCard.vue'
import type { ActiveExam, ExamRecord } from '../types'

defineProps<{
  completionPercent: number
  attemptedCount: number
  totalQuestions: number
  examCount: number
  averageScore: number
  highestScore: number
  wrongCount: number
  recentRecord?: ExamRecord
  activeExam: ActiveExam | null
  dataDirectory: string
}>()

defineEmits<{
  start: []
  resume: []
  history: []
  wrongBook: []
}>()

function dateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <main class="dashboard">
    <section class="hero panel">
      <div>
        <p class="eyebrow">AI COURSE EXAM</p>
        <h1>人工智能导论题库</h1>
        <p class="subtitle">从 360 道题中随机组卷，专注完成每一次 60 分钟训练。</p>
        <div class="hero-actions">
          <button class="button primary" @click="$emit('start')">开始随机考试</button>
          <button v-if="activeExam" class="button secondary" @click="$emit('resume')">继续未完成考试</button>
        </div>
      </div>
      <div class="progress-ring" :style="{ '--percentage': `${completionPercent}%` }">
        <div>
          <strong>{{ completionPercent }}%</strong>
          <span>题库完成度</span>
        </div>
      </div>
    </section>

    <section class="stat-grid">
      <StatCard label="已做题目" :value="`${attemptedCount} / ${totalQuestions}`" detail="仅统计已作答题目" accent />
      <StatCard label="累计考试" :value="examCount" detail="正式随机考试场次" />
      <StatCard label="平均成绩" :value="`${averageScore} 分`" />
      <StatCard label="历史最高" :value="`${highestScore} 分`" />
      <StatCard label="待掌握错题" :value="wrongCount" detail="可进入错题重练" />
    </section>

    <section class="dashboard-columns">
      <article class="panel shortcut-panel">
        <div class="section-title">
          <div>
            <h2>学习工具</h2>
            <p>考试记录与错题会保存在本机。</p>
          </div>
        </div>
        <button class="shortcut" @click="$emit('wrongBook')">
          <span>错题本</span>
          <small>复习尚未掌握的题目</small>
        </button>
        <button class="shortcut" @click="$emit('history')">
          <span>考试经历</span>
          <small>查看成绩与每题作答情况</small>
        </button>
      </article>

      <article class="panel recent-panel">
        <div class="section-title">
          <div>
            <h2>最近一次考试</h2>
            <p v-if="recentRecord">{{ dateTime(recentRecord.submittedAt) }}</p>
          </div>
        </div>
        <template v-if="recentRecord">
          <div class="recent-score">{{ recentRecord.score }}<small>/ {{ recentRecord.maxScore }}</small></div>
          <p class="muted">
            正确 {{ recentRecord.correctCount }} 题，错误 {{ recentRecord.wrongCount }} 题，未答
            {{ recentRecord.unansweredCount }} 题
          </p>
        </template>
        <p v-else class="empty-text">还没有完成过正式考试，开始第一场训练吧。</p>
      </article>
    </section>

    <footer class="storage-note">本地数据目录：{{ dataDirectory }}</footer>
  </main>
</template>

