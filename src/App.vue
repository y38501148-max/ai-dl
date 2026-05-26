<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useExamStore } from './composables/useExamStore'
import DashboardView from './views/DashboardView.vue'
import ExamView from './views/ExamView.vue'
import HistoryView from './views/HistoryView.vue'
import ResultView from './views/ResultView.vue'
import WrongBookView from './views/WrongBookView.vue'
import type { ExamRecord } from './types'

type Page = 'dashboard' | 'exam' | 'result' | 'wrong-book' | 'history'

const store = useExamStore()
const page = ref<Page>('dashboard')
const result = ref<ExamRecord | null>(null)
const confirmingStart = ref(false)
const actionError = ref('')

const recentOfficialRecord = computed(() => store.officialRecords.value[0])

onMounted(async () => {
  await store.initialize()
  if (store.activeExam.value) page.value = 'exam'
})

async function startOfficial() {
  try {
    actionError.value = ''
    await store.startOfficialExam()
    confirmingStart.value = false
    page.value = 'exam'
  } catch {
    actionError.value = '无法保存当前考试，请重新启动应用后再试。'
  }
}

async function startPractice() {
  try {
    actionError.value = ''
    await store.startWrongPractice()
    if (store.activeExam.value) page.value = 'exam'
  } catch {
    actionError.value = '无法开始错题重练，请重新启动应用后再试。'
  }
}

async function submit(method: 'manual' | 'timeout') {
  try {
    actionError.value = ''
    const submitted = await store.submitActiveExam(method)
    if (!submitted) return
    result.value = submitted
    page.value = 'result'
  } catch {
    actionError.value = '交卷保存失败，当前试卷仍保留，请重新尝试交卷。'
  }
}

async function answer(questionId: string, answers: string[]) {
  try {
    actionError.value = ''
    await store.setAnswer(questionId, answers)
  } catch {
    actionError.value = '答案保存失败，请重新选择该题答案。'
  }
}

async function navigate(index: number) {
  try {
    actionError.value = ''
    await store.setCurrentIndex(index)
  } catch {
    actionError.value = '答题位置保存失败，你仍可继续作答。'
  }
}

function showRecord(record: ExamRecord) {
  result.value = record
  page.value = 'result'
}

function home() {
  page.value = 'dashboard'
  result.value = null
}
</script>

<template>
  <div v-if="store.loading.value" class="loading-screen">正在初始化题库与本地数据...</div>
  <div v-else-if="store.error.value" class="error-screen panel">
    <h1>应用启动失败</h1>
    <p>{{ store.error.value }}</p>
  </div>
  <DashboardView
    v-else-if="page === 'dashboard'"
    :completion-percent="store.completionPercent.value"
    :attempted-count="store.progress.value.attemptedQuestionIds.length"
    :total-questions="store.questions.value.length"
    :exam-count="store.officialRecords.value.length"
    :average-score="store.averageScore.value"
    :highest-score="store.highestScore.value"
    :wrong-count="store.unresolvedWrongBook.value.length"
    :recent-record="recentOfficialRecord"
    :active-exam="store.activeExam.value"
    :data-directory="store.dataDirectory.value"
    @start="confirmingStart = true"
    @resume="page = 'exam'"
    @history="page = 'history'"
    @wrong-book="page = 'wrong-book'"
  />
  <ExamView
    v-else-if="page === 'exam' && store.activeExam.value"
    :session="store.activeExam.value"
    :question-map="store.questionMap.value"
    @answer="answer"
    @navigate="navigate"
    @submit="submit"
  />
  <ResultView
    v-else-if="page === 'result' && result"
    :record="result"
    :question-map="store.questionMap.value"
    @home="home"
  />
  <WrongBookView
    v-else-if="page === 'wrong-book'"
    :entries="store.wrongBook.value"
    :question-map="store.questionMap.value"
    @back="home"
    @practice="startPractice"
  />
  <HistoryView v-else-if="page === 'history'" :records="store.records.value" @back="home" @open="showRecord" />

  <div v-if="confirmingStart" class="modal-backdrop">
    <section class="modal start-modal panel">
      <p class="eyebrow">开始考试</p>
      <h2>随机抽取 50 道题</h2>
      <ul class="rules">
        <li>考试时长 60 分钟，超时自动交卷。</li>
        <li>每题 2 分，满分 100 分。</li>
        <li>多选题必须完全正确才得分。</li>
        <li>考试界面仅显示本场题号，不显示题库原编号。</li>
      </ul>
      <div class="modal-actions">
        <button class="button secondary" @click="confirmingStart = false">取消</button>
        <button class="button primary" @click="startOfficial">确认开始</button>
      </div>
    </section>
  </div>
  <div v-if="actionError" class="action-error" role="alert">
    <span>{{ actionError }}</span>
    <button @click="actionError = ''">关闭</button>
  </div>
</template>
