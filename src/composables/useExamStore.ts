import { computed, ref } from 'vue'
import { createExam, gradeExam, selectOfficialQuestions, updateProgress, updateWrongBook } from '../services/exam'
import { loadApplicationData, resolveDataDirectory, saveApplicationData } from '../services/storage'
import type { ActiveExam, ExamRecord, ProgressData, Question, SubmitMethod, WrongBookEntry } from '../types'

export function useExamStore() {
  const loading = ref(true)
  const error = ref('')
  const questions = ref<Question[]>([])
  const records = ref<ExamRecord[]>([])
  const wrongBook = ref<WrongBookEntry[]>([])
  const progress = ref<ProgressData>({ attemptedQuestionIds: [] })
  const activeExam = ref<ActiveExam | null>(null)
  const dataDirectory = ref('')

  const questionMap = computed(() => new Map(questions.value.map((question) => [question.id, question])))
  const unresolvedWrongBook = computed(() => wrongBook.value.filter((entry) => !entry.mastered))
  const completionPercent = computed(() =>
    questions.value.length
      ? Number(((progress.value.attemptedQuestionIds.length / questions.value.length) * 100).toFixed(1))
      : 0,
  )
  const officialRecords = computed(() => records.value.filter((record) => record.mode === 'exam'))
  const averageScore = computed(() => {
    if (!officialRecords.value.length) return 0
    const score = officialRecords.value.reduce((sum, record) => sum + record.score, 0)
    return Number((score / officialRecords.value.length).toFixed(1))
  })
  const highestScore = computed(() => Math.max(0, ...officialRecords.value.map((record) => record.score)))

  async function initialize() {
    try {
      const initial = await loadApplicationData()
      questions.value = initial.questions
      records.value = initial.records
      wrongBook.value = initial.wrongBook
      progress.value = initial.progress
      activeExam.value = initial.activeExam
      dataDirectory.value = await resolveDataDirectory()
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '应用初始化失败'
    } finally {
      loading.value = false
    }
  }

  async function startOfficialExam() {
    const session = createExam(selectOfficialQuestions(questions.value), 'exam')
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function startWrongPractice() {
    const ids = unresolvedWrongBook.value.map((entry) => entry.questionId).slice(0, 50)
    if (!ids.length) return
    const session = createExam(ids, 'wrong-practice')
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function startPractice(questionIds: string[]) {
    if (!questionIds.length) return
    const session = createExam(questionIds, 'practice')
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function setAnswer(questionId: string, answers: string[]) {
    if (!activeExam.value) return
    const session = {
      ...activeExam.value,
      answers: {
        ...activeExam.value.answers,
        [questionId]: answers,
      },
    }
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function setCurrentIndex(index: number) {
    if (!activeExam.value) return
    const session = { ...activeExam.value, currentIndex: index }
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function submitActiveExam(method: SubmitMethod): Promise<ExamRecord | null> {
    if (!activeExam.value) return null
    const attempted = new Set(progress.value.attemptedQuestionIds)
    const record = gradeExam(activeExam.value, questionMap.value, method, attempted)
    const nextProgress = updateProgress(progress.value, record)
    const nextWrongBook = updateWrongBook(wrongBook.value, record)
    const nextRecords = [record, ...records.value]
    await Promise.all([
      saveApplicationData('records', nextRecords),
      saveApplicationData('wrongBook', nextWrongBook),
      saveApplicationData('progress', nextProgress),
    ])
    await saveApplicationData('activeExam', null)
    progress.value = nextProgress
    wrongBook.value = nextWrongBook
    records.value = nextRecords
    activeExam.value = null
    return record
  }

  return {
    loading,
    error,
    questions,
    records,
    wrongBook,
    progress,
    activeExam,
    dataDirectory,
    questionMap,
    unresolvedWrongBook,
    completionPercent,
    officialRecords,
    averageScore,
    highestScore,
    initialize,
    startOfficialExam,
    startWrongPractice,
    startPractice,
    setAnswer,
    setCurrentIndex,
    submitActiveExam,
  }
}
