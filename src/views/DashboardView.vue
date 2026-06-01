<script setup lang="ts">
import StatCard from '../components/StatCard.vue'
import type { SubjectConfig } from '../services/subjects'
import type { ActiveExam, ExamRecord } from '../types'

defineProps<{
  subject: SubjectConfig
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
  practice: []
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
        <p class="eyebrow">{{ subject.examLabel }}</p>
        <h1>{{ subject.title }}</h1>
        <p class="subtitle">{{ subject.subtitle }}</p>
        <div class="hero-actions">
          <button class="button primary" @click="$emit('start')">开始模拟考试</button>
          <button v-if="subject.allowPractice" class="button secondary" @click="$emit('practice')">自由练习</button>
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
      <StatCard
        label="已做题目"
        :value="`${attemptedCount} / ${totalQuestions}`"
        :detail="subject.allowPractice ? '点击进入练习菜单' : '模拟考试作答后更新'"
        accent
        :button="subject.allowPractice"
        @click="$emit('practice')"
      />
      <StatCard label="累计考试" :value="examCount" detail="模拟考试场次" />
      <StatCard label="平均成绩" :value="`${averageScore} 分`" />
      <StatCard label="历史最高" :value="`${highestScore} 分`" />
      <StatCard
        v-if="subject.allowPractice"
        label="待掌握错题"
        :value="wrongCount"
        detail="可进入错题重练"
      />
      <StatCard v-else label="考试题型" value="10 + 10" detail="选择题 + 填空题" />
    </section>

    <section class="dashboard-columns">
      <article class="panel shortcut-panel">
        <div class="section-title">
          <div>
            <h2>学习工具</h2>
        <p>{{ subject.allowPractice ? '考试记录与错题会保存在本机。' : '数据结构考试记录会保存在本机。' }}</p>
          </div>
        </div>
        <button v-if="subject.allowPractice" class="shortcut" @click="$emit('wrongBook')">
          <span>错题本</span>
          <small>复习尚未掌握的题目</small>
        </button>
        <button v-if="subject.allowPractice" class="shortcut" @click="$emit('practice')">
          <span>练习模式</span>
          <small>按 60 题分组或自由挑题</small>
        </button>
        <button v-else class="shortcut wide" @click="$emit('start')">
          <span>数据结构模拟考试</span>
          <small>10 道选择 + 10 道填空，含代码书写区</small>
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
