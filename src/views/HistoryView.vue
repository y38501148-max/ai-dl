<script setup lang="ts">
import { formatDuration } from '../services/exam'
import type { ExamRecord } from '../types'

defineProps<{
  records: ExamRecord[]
}>()

defineEmits<{
  back: []
  open: [record: ExamRecord]
}>()

function dateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <main class="library-page">
    <header class="page-header panel">
      <div>
        <button class="text-button" @click="$emit('back')">返回首页</button>
        <p class="eyebrow">HISTORY</p>
        <h1>考试经历</h1>
        <p class="muted">共完成 {{ records.length }} 场考试或重练。</p>
      </div>
    </header>

    <section v-if="records.length" class="history-list panel">
      <button v-for="record in records" :key="record.id" class="history-row" @click="$emit('open', record)">
        <div>
          <strong>{{ record.mode === 'exam' ? '随机考试' : '错题重练' }}</strong>
          <small>{{ dateTime(record.submittedAt) }}</small>
        </div>
        <span>{{ record.score }} / {{ record.maxScore }} 分</span>
        <span>用时 {{ formatDuration(record.elapsedSeconds) }}</span>
        <span>正确 {{ record.correctCount }} · 错误 {{ record.wrongCount }}</span>
        <b>查看详情</b>
      </button>
    </section>
    <section v-else class="empty panel">
      <h2>暂无考试记录</h2>
      <p>完成考试或错题重练后，可以在这里回顾答案。</p>
    </section>
  </main>
</template>

