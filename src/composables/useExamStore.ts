import { computed, ref } from 'vue'
import { createExam, gradeExam, selectOfficialQuestions, updateProgress, updateWrongBook } from '../services/exam'
import { loadApplicationData, resolveDataDirectory, saveApplicationData } from '../services/storage'
import { DEFAULT_SUBJECT_ID, getSubjectConfig, isSubjectId, subjectOf } from '../services/subjects'
import type {
  ActiveExam,
  ExamRecord,
  ProgressData,
  Question,
  QuestionBankManifest,
  SubjectId,
  SubmitMethod,
  WrongBookEntry,
} from '../types'

const CURRENT_QUESTION_BANK_TAG = 'multi-0.1.5-20260602'
const CURRENT_QUESTION_BANK_VERSION = 4

export function useExamStore() {
  const loading = ref(true)
  const error = ref('')
  const questions = ref<Question[]>([])
  const records = ref<ExamRecord[]>([])
  const wrongBook = ref<WrongBookEntry[]>([])
  const progress = ref<ProgressData>({ attemptedQuestionIds: [] })
  const activeExam = ref<ActiveExam | null>(null)
  const activeSubjectId = ref<SubjectId>(DEFAULT_SUBJECT_ID)
  const dataDirectory = ref('')
  const questionBankManifest = ref<QuestionBankManifest | undefined>()

  const questionMap = computed(() => new Map(questions.value.map((question) => [question.id, question])))
  const activeSubject = computed(() => getSubjectConfig(activeSubjectId.value))
  const subjectQuestions = computed(() => questions.value.filter((question) => subjectOf(question) === activeSubjectId.value))
  const subjectRecords = computed(() =>
    records.value.filter((record) => (record.subjectId ?? DEFAULT_SUBJECT_ID) === activeSubjectId.value),
  )
  const subjectWrongBook = computed(() =>
    wrongBook.value.filter((entry) => {
      const question = questionMap.value.get(entry.questionId)
      return question && subjectOf(question) === activeSubjectId.value
    }),
  )
  const unresolvedWrongBook = computed(() => subjectWrongBook.value.filter((entry) => !entry.mastered))
  const completionPercent = computed(() =>
    subjectQuestions.value.length
      ? Number(
          ((
            progress.value.attemptedQuestionIds.filter((id) => {
              const question = questionMap.value.get(id)
              return question && subjectOf(question) === activeSubjectId.value
            }).length / subjectQuestions.value.length
          ) * 100).toFixed(1),
        )
      : 0,
  )
  const officialRecords = computed(() => subjectRecords.value.filter((record) => record.mode === 'exam'))
  const averageScore = computed(() => {
    if (!officialRecords.value.length) return 0
    const score = officialRecords.value.reduce((sum, record) => sum + record.score, 0)
    return Number((score / officialRecords.value.length).toFixed(1))
  })
  const highestScore = computed(() => Math.max(0, ...officialRecords.value.map((record) => record.score)))

  function sameIds(first: string[], second: string[]): boolean {
    return first.length === second.length && first.every((id, index) => id === second[index])
  }

  async function initialize() {
    try {
      const initial = await loadApplicationData()
      const validQuestionIds = new Set(initial.questions.map((question) => question.id))
      const sanitizedProgress = {
        attemptedQuestionIds: initial.progress.attemptedQuestionIds.filter((id) => validQuestionIds.has(id)),
      }
      const sanitizedWrongBook = initial.wrongBook.filter((entry) => validQuestionIds.has(entry.questionId))
      const activeExamIsUsable = initial.activeExam?.questionIds.every((id) => validQuestionIds.has(id)) ?? false
      const sanitizedActiveExam = activeExamIsUsable ? initial.activeExam : null

      const cleanupTasks: Promise<void>[] = []
      if (!sameIds(initial.progress.attemptedQuestionIds, sanitizedProgress.attemptedQuestionIds)) {
        cleanupTasks.push(saveApplicationData('progress', sanitizedProgress))
      }
      if (initial.wrongBook.length !== sanitizedWrongBook.length) {
        cleanupTasks.push(saveApplicationData('wrongBook', sanitizedWrongBook))
      }
      if (initial.activeExam && !sanitizedActiveExam) {
        cleanupTasks.push(saveApplicationData('activeExam', null))
      }

      questions.value = initial.questions
      questionBankManifest.value = initial.questionBankManifest
      records.value = initial.records
      wrongBook.value = sanitizedWrongBook
      progress.value = sanitizedProgress
      activeExam.value = sanitizedActiveExam
      activeSubjectId.value = isSubjectId(sanitizedActiveExam?.subjectId)
        ? sanitizedActiveExam.subjectId
        : isSubjectId(initial.settings.activeSubjectId)
          ? initial.settings.activeSubjectId
          : DEFAULT_SUBJECT_ID
      if (cleanupTasks.length) await Promise.all(cleanupTasks)
      dataDirectory.value = await resolveDataDirectory()
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '应用初始化失败'
    } finally {
      loading.value = false
    }
  }

  async function setActiveSubject(subjectId: SubjectId) {
    activeSubjectId.value = subjectId
    await saveApplicationData('settings', {
      questionBankVersion: CURRENT_QUESTION_BANK_VERSION,
      questionBankTag: CURRENT_QUESTION_BANK_TAG,
      activeSubjectId: subjectId,
    })
  }

  async function replaceQuestionBank(nextQuestions: Question[], manifest: QuestionBankManifest) {
    const validQuestionIds = new Set(nextQuestions.map((question) => question.id))
    const nextProgress = {
      attemptedQuestionIds: progress.value.attemptedQuestionIds.filter((id) => validQuestionIds.has(id)),
    }
    const nextWrongBook = wrongBook.value.filter((entry) => validQuestionIds.has(entry.questionId))
    await Promise.all([
      saveApplicationData('progress', nextProgress),
      saveApplicationData('wrongBook', nextWrongBook),
      saveApplicationData('activeExam', null),
      saveApplicationData('settings', {
        questionBankVersion: CURRENT_QUESTION_BANK_VERSION,
        questionBankTag: manifest.bankTag,
        activeSubjectId: activeSubjectId.value,
      }),
    ])
    questions.value = nextQuestions
    questionBankManifest.value = manifest
    progress.value = nextProgress
    wrongBook.value = nextWrongBook
    activeExam.value = null
  }

  async function startOfficialExam() {
    const session = createExam(selectOfficialQuestions(subjectQuestions.value, activeSubjectId.value), 'exam', activeSubjectId.value)
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function startWrongPractice() {
    const ids = subjectWrongBook.value
      .filter((entry) => !entry.mastered)
      .map((entry) => entry.questionId)
      .slice(0, 50)
    if (!ids.length) return
    const session = createExam(ids, 'wrong-practice', activeSubjectId.value)
    await saveApplicationData('activeExam', session)
    activeExam.value = session
  }

  async function startPractice(questionIds: string[]) {
    if (!questionIds.length) return
    const session = createExam(questionIds, 'practice', activeSubjectId.value)
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
    activeSubjectId,
    questionBankManifest,
    activeSubject,
    subjectQuestions,
    subjectRecords,
    subjectWrongBook,
    dataDirectory,
    questionMap,
    unresolvedWrongBook,
    completionPercent,
    officialRecords,
    averageScore,
    highestScore,
    initialize,
    setActiveSubject,
    replaceQuestionBank,
    startOfficialExam,
    startWrongPractice,
    startPractice,
    setAnswer,
    setCurrentIndex,
    submitActiveExam,
  }
}
