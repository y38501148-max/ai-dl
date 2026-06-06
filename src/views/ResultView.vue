<script setup lang="ts">
import { formatDuration } from '../services/exam'
import type { SubjectConfig } from '../services/subjects'
import type { ExamRecord, Question } from '../types'

defineProps<{
  record: ExamRecord
  questionMap: Map<string, Question>
  subject: SubjectConfig
}>()

defineEmits<{
  home: []
}>()

const baseUrl = import.meta.env.BASE_URL

function answersText(question: Question, answers: string[]): string {
  if (!answers.length) return '未作答'
  if (question.type === 'blank') return answers.join('；')
  return answers
    .map((key) => {
      const option = question.options.find((item) => item.key === key)
      return `${key}. ${option?.text ?? ''}`
    })
    .join('；')
}

function assetUrl(path: string): string {
  return `${baseUrl}${path}`
}

function modeText(mode: ExamRecord['mode']): string {
  if (mode === 'exam') return '考试完成'
  if (mode === 'wrong-practice') return '错题重练完成'
  return '练习完成'
}
</script>

<template>
  <main class="result-page">
    <button class="result-exit-button" type="button" @click="$emit('home')" aria-label="返回首页">
      返回首页
    </button>

    <header class="result-summary panel">
      <div>
        <p class="eyebrow">{{ modeText(record.mode) }}</p>
        <h1>{{ record.score }}<small>/ {{ record.maxScore }} 分</small></h1>
        <p class="muted">
          用时 {{ formatDuration(record.elapsedSeconds) }} ·
          {{ record.submitMethod === 'timeout' ? '时间到自动交卷' : '主动交卷' }}
        </p>
      </div>
      <div class="result-counts">
        <span class="correct">正确 {{ record.correctCount }}</span>
        <span class="wrong">错误 {{ record.wrongCount }}</span>
        <span>未答 {{ record.unansweredCount }}</span>
        <span>新完成 {{ record.newlyAttemptedCount }}</span>
      </div>
      <button class="button primary" @click="$emit('home')">返回首页</button>
    </header>

    <section class="review-list">
      <article
        v-for="evaluation in record.evaluations"
        :key="evaluation.questionId"
        class="review-item panel"
        :class="{ failed: !evaluation.correct }"
      >
        <template v-if="questionMap.get(evaluation.questionId)">
          <div class="review-title">
            <strong>第 {{ evaluation.displayNumber }} 题</strong>
            <span :class="evaluation.correct ? 'tag-success' : evaluation.answered ? 'tag-error' : 'tag-neutral'">
              {{ evaluation.correct ? `正确 +${subject.scorePerQuestion} 分` : evaluation.answered ? '错误 0 分' : '未答 0 分' }}
            </span>
          </div>
          <p class="review-stem">{{ questionMap.get(evaluation.questionId)!.stem }}</p>
          <img
            v-if="questionMap.get(evaluation.questionId)!.image"
            class="question-image compact"
            :src="assetUrl(questionMap.get(evaluation.questionId)!.image!)"
            alt="题目配图"
          />
          <p>你的答案：{{ answersText(questionMap.get(evaluation.questionId)!, evaluation.selectedAnswers) }}</p>
          <p>正确答案：{{ answersText(questionMap.get(evaluation.questionId)!, evaluation.correctAnswers) }}</p>
          <section v-if="questionMap.get(evaluation.questionId)!.explanation" class="explanation-box">
            <strong>题解</strong>
            <p>{{ questionMap.get(evaluation.questionId)!.explanation }}</p>
          </section>
        </template>
      </article>
    </section>
  </main>
</template>
