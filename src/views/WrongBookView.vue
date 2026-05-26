<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Question, WrongBookEntry } from '../types'

const props = defineProps<{
  entries: WrongBookEntry[]
  questionMap: Map<string, Question>
}>()

defineEmits<{
  back: []
  practice: []
}>()

const showMastered = ref(false)
const filtered = computed(() =>
  props.entries.filter((entry) => showMastered.value || !entry.mastered).sort((a, b) => b.wrongCount - a.wrongCount),
)
const unresolvedCount = computed(() => props.entries.filter((entry) => !entry.mastered).length)

function answersText(question: Question, answers: string[]): string {
  return answers
    .map((key) => `${key}. ${question.options.find((option) => option.key === key)?.text ?? ''}`)
    .join('；')
}

function dateTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <main class="library-page">
    <header class="page-header panel">
      <div>
        <button class="text-button" @click="$emit('back')">返回首页</button>
        <p class="eyebrow">WRONG BOOK</p>
        <h1>错题本</h1>
        <p class="muted">待掌握 {{ unresolvedCount }} 道，答对后自动标记为已掌握并保留历史。</p>
      </div>
      <div class="page-actions">
        <label class="switch">
          <input v-model="showMastered" type="checkbox" />
          <span>显示已掌握</span>
        </label>
        <button class="button primary" :disabled="unresolvedCount === 0" @click="$emit('practice')">开始错题重练</button>
      </div>
    </header>

    <section v-if="filtered.length" class="wrong-list">
      <article v-for="(entry, itemIndex) in filtered" :key="entry.questionId" class="wrong-item panel">
        <template v-if="questionMap.get(entry.questionId)">
          <div class="review-title">
            <strong>错题 {{ itemIndex + 1 }}</strong>
            <span :class="entry.mastered ? 'tag-success' : 'tag-error'">
              {{ entry.mastered ? '已掌握' : `错误 ${entry.wrongCount} 次` }}
            </span>
          </div>
          <h2>{{ questionMap.get(entry.questionId)!.stem }}</h2>
          <p>最近错误答案：{{ answersText(questionMap.get(entry.questionId)!, entry.latestWrongAnswers) }}</p>
          <p class="correct-answer">
            正确答案：{{ answersText(questionMap.get(entry.questionId)!, questionMap.get(entry.questionId)!.correctAnswers) }}
          </p>
          <small class="muted">最近答错：{{ dateTime(entry.latestWrongAt) }}</small>
        </template>
      </article>
    </section>
    <section v-else class="empty panel">
      <h2>当前没有待复习错题</h2>
      <p>完成考试后，答错的题目会自动进入这里。</p>
    </section>
  </main>
</template>

