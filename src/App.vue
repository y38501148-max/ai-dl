<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useExamStore } from './composables/useExamStore'
import { DEFAULT_SUBJECT_ID, SUBJECTS, subjectOf } from './services/subjects'
import { openExternalLink } from './services/externalLink'
import {
  checkForQuestionBankUpdate,
  downloadAndInstallQuestionBank,
  type QuestionBankUpdateInfo,
} from './services/questionBankUpdate'
import { checkForUpdate, type UpdateInfo } from './services/update'
import DashboardView from './views/DashboardView.vue'
import ExamView from './views/ExamView.vue'
import HistoryView from './views/HistoryView.vue'
import PracticePickerView from './views/PracticePickerView.vue'
import ResultView from './views/ResultView.vue'
import WrongBookView from './views/WrongBookView.vue'
import type { ExamRecord, SubjectId } from './types'

type Page = 'dashboard' | 'exam' | 'result' | 'wrong-book' | 'history' | 'practice-picker'

const store = useExamStore()
const page = ref<Page>('dashboard')
const result = ref<ExamRecord | null>(null)
const confirmingStart = ref(false)
const actionError = ref('')
const updateInfo = ref<UpdateInfo | null>(null)
const questionBankUpdateInfo = ref<QuestionBankUpdateInfo | null>(null)
const questionBankUpdating = ref(false)
const subjectNotice = ref('')

const recentOfficialRecord = computed(() => store.officialRecords.value[0])
const activeExamSubjectId = computed(() => store.activeExam.value?.subjectId ?? store.activeSubjectId.value)
const resultSubjectId = computed(() => result.value?.subjectId ?? DEFAULT_SUBJECT_ID)
const attemptedCount = computed(
  () =>
    store.progress.value.attemptedQuestionIds.filter((id) => {
      const question = store.questionMap.value.get(id)
      if (!question) return false
      return subjectOf(question) === store.activeSubjectId.value
    }).length,
)

onMounted(async () => {
  await store.initialize()
  if (store.activeExam.value) page.value = 'exam'
  void checkForUpdate().then((info) => {
    updateInfo.value = info
  })
  void checkForQuestionBankUpdate(store.questionBankManifest.value).then((info) => {
    questionBankUpdateInfo.value = info
  })
})

async function changeSubject(subjectId: SubjectId) {
  if (store.activeExam.value) return
  await store.setActiveSubject(subjectId)
  const subject = SUBJECTS.find((item) => item.id === subjectId)
  subjectNotice.value = subject?.notice ?? ''
  page.value = 'dashboard'
  result.value = null
}

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

async function startSelectedPractice(questionIds: string[]) {
  try {
    actionError.value = ''
    await store.startPractice(questionIds)
    if (store.activeExam.value) page.value = 'exam'
  } catch {
    actionError.value = '无法开始练习，请重新启动应用后再试。'
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

async function openUpdate() {
  if (!updateInfo.value) return
  try {
    await openExternalLink(updateInfo.value.releaseUrl)
    updateInfo.value = null
  } catch {
    actionError.value = '无法打开更新页面，请稍后手动访问 GitHub Releases。'
  }
}

async function installQuestionBankUpdate() {
  if (!questionBankUpdateInfo.value) return
  try {
    questionBankUpdating.value = true
    actionError.value = ''
    const manifest = questionBankUpdateInfo.value.manifest
    const questions = await downloadAndInstallQuestionBank(questionBankUpdateInfo.value)
    await store.replaceQuestionBank(questions, { ...manifest, questionCount: questions.length })
    questionBankUpdateInfo.value = null
    page.value = 'dashboard'
    result.value = null
  } catch {
    actionError.value = '题库更新失败，已继续使用当前题库。'
  } finally {
    questionBankUpdating.value = false
  }
}
</script>

<template>
  <div v-if="store.loading.value" class="loading-screen">正在初始化题库与本地数据...</div>
  <div v-else-if="store.error.value" class="error-screen panel">
    <h1>应用启动失败</h1>
    <p>{{ store.error.value }}</p>
  </div>
  <template v-else>
    <div class="subject-switcher panel">
      <label for="subject-select">科目选择</label>
      <select
        id="subject-select"
        :value="store.activeSubjectId.value"
        :disabled="Boolean(store.activeExam.value)"
        @change="changeSubject(($event.target as HTMLSelectElement).value as SubjectId)"
      >
        <option v-for="subject in SUBJECTS" :key="subject.id" :value="subject.id">{{ subject.name }}</option>
      </select>
    </div>

    <DashboardView
      v-if="page === 'dashboard'"
      :subject="store.activeSubject.value"
      :completion-percent="store.completionPercent.value"
      :attempted-count="attemptedCount"
      :total-questions="store.subjectQuestions.value.length"
      :exam-count="store.officialRecords.value.length"
      :average-score="store.averageScore.value"
      :highest-score="store.highestScore.value"
      :wrong-count="store.unresolvedWrongBook.value.length"
      :recent-record="recentOfficialRecord"
      :active-exam="store.activeExam.value"
      :data-directory="store.dataDirectory.value"
      @start="confirmingStart = true"
      @practice="page = 'practice-picker'"
      @resume="page = 'exam'"
      @history="page = 'history'"
      @wrong-book="page = 'wrong-book'"
    />
    <PracticePickerView
      v-else-if="page === 'practice-picker'"
      :questions="store.subjectQuestions.value"
      :attempted-question-ids="store.progress.value.attemptedQuestionIds"
      @back="home"
      @start="startSelectedPractice"
    />
    <ExamView
      v-else-if="page === 'exam' && store.activeExam.value"
      :session="store.activeExam.value"
      :question-map="store.questionMap.value"
      :subject="SUBJECTS.find((subject) => subject.id === activeExamSubjectId) ?? SUBJECTS[0]"
      @answer="answer"
      @navigate="navigate"
      @submit="submit"
    />
    <ResultView
      v-else-if="page === 'result' && result"
      :record="result"
      :question-map="store.questionMap.value"
      :subject="SUBJECTS.find((subject) => subject.id === resultSubjectId) ?? SUBJECTS[0]"
      @home="home"
    />
    <WrongBookView
      v-else-if="page === 'wrong-book'"
      :entries="store.subjectWrongBook.value"
      :question-map="store.questionMap.value"
      @back="home"
      @practice="startPractice"
    />
    <HistoryView
      v-else-if="page === 'history'"
      :records="store.subjectRecords.value"
      @back="home"
      @open="showRecord"
    />
  </template>

  <div v-if="confirmingStart" class="modal-backdrop">
    <section class="modal start-modal panel">
      <p class="eyebrow">开始考试</p>
      <h2>{{ store.activeSubject.value.examDescription }}</h2>
      <ul class="rules">
        <li>考试时长 60 分钟，超时自动交卷。</li>
        <li>每题 {{ store.activeSubject.value.scorePerQuestion }} 分，自动保存考试记录。</li>
        <li>填空题以精确计算和模拟结果为主，选择题均为单选。</li>
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
  <div v-if="subjectNotice" class="modal-backdrop">
    <section class="modal panel">
      <h2>科目提醒</h2>
      <p>{{ subjectNotice }}</p>
      <div class="modal-actions">
        <button class="button primary" @click="subjectNotice = ''">我知道了</button>
      </div>
    </section>
  </div>
  <div v-if="updateInfo" class="modal-backdrop">
    <section class="modal panel">
      <p class="eyebrow">发现新版本</p>
      <h2>可更新到 {{ updateInfo.latestVersion }}</h2>
      <p>当前版本为 {{ updateInfo.currentVersion }}。更新检测已异步完成，网络失败不会影响正常使用。</p>
      <div v-if="updateInfo.releaseNotes.length" class="update-notes">
        <strong>更新说明</strong>
        <ul>
          <li v-for="note in updateInfo.releaseNotes" :key="note">{{ note }}</li>
        </ul>
      </div>
      <div class="modal-actions">
        <button class="button secondary" @click="updateInfo = null">稍后</button>
        <button class="button primary" @click="openUpdate">前往更新</button>
      </div>
    </section>
  </div>
  <div v-if="questionBankUpdateInfo" class="modal-backdrop">
    <section class="modal panel">
      <p class="eyebrow">发现新题库</p>
      <h2>可更新到 {{ questionBankUpdateInfo.latestTag }}</h2>
      <p>
        当前题库为 {{ questionBankUpdateInfo.currentTag }}，新题库共
        {{ questionBankUpdateInfo.questionCount }} 道题。题库更新会单独下载，不需要重新安装应用。
      </p>
      <div v-if="questionBankUpdateInfo.releaseNotes.length" class="update-notes">
        <strong>更新说明</strong>
        <ul>
          <li v-for="note in questionBankUpdateInfo.releaseNotes" :key="note">{{ note }}</li>
        </ul>
      </div>
      <div class="modal-actions">
        <button class="button secondary" :disabled="questionBankUpdating" @click="questionBankUpdateInfo = null">
          稍后
        </button>
        <button class="button primary" :disabled="questionBankUpdating" @click="installQuestionBankUpdate">
          {{ questionBankUpdating ? '更新中...' : '更新题库' }}
        </button>
      </div>
    </section>
  </div>
</template>
