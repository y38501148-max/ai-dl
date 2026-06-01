<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { isCorrectAnswer } from '../services/exam'
import { runCCode, type CompileResult } from '../services/compiler'
import type { SubjectConfig } from '../services/subjects'
import type { ActiveExam, Question } from '../types'

const props = defineProps<{
  session: ActiveExam
  questionMap: Map<string, Question>
  subject: SubjectConfig
}>()

const emit = defineEmits<{
  answer: [questionId: string, answers: string[]]
  navigate: [index: number]
  submit: [method: 'manual' | 'timeout']
  quit: []
}>()

const index = ref(props.session.currentIndex)
const secondsLeft = ref(0)
const confirming = ref(false)
const codeDraft = ref(`#include <stdio.h>

int main(void) {
    printf("hello ds\\n");
    return 0;
}
`)
const codeStdin = ref('')
const runningCode = ref(false)
const compileResult = ref<CompileResult | null>(null)
const revealedPracticeQuestionIds = ref(new Set<string>())
const baseUrl = import.meta.env.BASE_URL
let clock: number | undefined
let timeoutSubmitted = false

const questions = computed(() =>
  props.session.questionIds.map((id) => props.questionMap.get(id)).filter((item): item is Question => Boolean(item)),
)
const current = computed(() => questions.value[index.value])
const currentAnswers = computed(() => props.session.answers[current.value?.id] ?? [])
const isDataStructure = computed(() => props.subject.id === 'data-structure')
const compilerLabel = computed(() =>
  window.__TAURI__ || window.__TAURI_INTERNALS__ ? '本地 gcc 编译运行' : '网页端在线编译服务',
)
const isPracticeMode = computed(() => props.session.mode === 'practice')
const needsPracticeSubmission = computed(() => isPracticeMode.value && ['multiple', 'blank'].includes(current.value?.type ?? ''))
const practiceAnswered = computed(() => {
  if (!isPracticeMode.value || !current.value || currentAnswers.value.length === 0) return false
  if (['multiple', 'blank'].includes(current.value.type)) {
    return revealedPracticeQuestionIds.value.has(current.value.id)
  }
  return true
})
const practiceCorrect = computed(() => {
  if (!current.value || !practiceAnswered.value) return false
  return isCorrectAnswer(current.value, currentAnswers.value)
})
const answeredCount = computed(() =>
  props.session.questionIds.filter((id) => (props.session.answers[id] ?? []).length > 0).length,
)
const unansweredCount = computed(() => props.session.questionIds.length - answeredCount.value)
const modeTitle = computed(() => {
  const prefix = isDataStructure.value ? '数据结构' : ''
  if (props.session.mode === 'exam') return isDataStructure.value ? '数据结构模拟考试' : '正式随机考试'
  if (props.session.mode === 'wrong-practice') return `${prefix}错题重练`
  return `${prefix}自由练习`
})
const paperTitle = computed(() => {
  if (props.session.mode === 'exam') return isDataStructure.value ? '选填模拟试卷' : '随机试卷'
  if (props.session.mode === 'wrong-practice') return '待掌握错题练习'
  return '自选题练习'
})

function syncTimer() {
  secondsLeft.value = Math.max(0, Math.ceil((new Date(props.session.deadlineAt).getTime() - Date.now()) / 1000))
  if (secondsLeft.value === 0 && !timeoutSubmitted) {
    timeoutSubmitted = true
    emit('submit', 'timeout')
  }
}

function selectAnswer(key: string, checked: boolean) {
  if (!current.value) return
  if (current.value.type === 'blank') return
  hidePracticeFeedback(current.value.id)
  if (current.value.type !== 'multiple') {
    emit('answer', current.value.id, [key])
    return
  }
  const next = new Set(currentAnswers.value)
  if (checked) next.add(key)
  else next.delete(key)
  emit('answer', current.value.id, [...next])
}

function setBlankAnswer(value: string) {
  if (!current.value) return
  hidePracticeFeedback(current.value.id)
  emit('answer', current.value.id, value.trim() ? [value] : [])
}

function hidePracticeFeedback(questionId: string) {
  if (!revealedPracticeQuestionIds.value.has(questionId)) return
  const next = new Set(revealedPracticeQuestionIds.value)
  next.delete(questionId)
  revealedPracticeQuestionIds.value = next
}

function revealPracticeAnswer() {
  if (!current.value || currentAnswers.value.length === 0) return
  const next = new Set(revealedPracticeQuestionIds.value)
  next.add(current.value.id)
  revealedPracticeQuestionIds.value = next
}

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

function questionTypeText(question: Question): string {
  if (question.type === 'multiple') return '多选题'
  if (question.type === 'boolean') return '判断题'
  if (question.type === 'blank') return '填空题'
  return '单选题'
}

function assetUrl(path: string): string {
  return `${baseUrl}${path}`
}

async function compileAndRun() {
  runningCode.value = true
  compileResult.value = null
  try {
    compileResult.value = await runCCode(codeDraft.value, codeStdin.value)
  } catch (reason) {
    compileResult.value = {
      success: false,
      stage: 'web',
      stdout: '',
      stderr: reason instanceof Error ? reason.message : '代码运行失败',
      exitCode: null,
    }
  } finally {
    runningCode.value = false
  }
}

function go(target: number) {
  index.value = target
  emit('navigate', target)
}

function timeText(value: number): string {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

onMounted(() => {
  syncTimer()
  clock = window.setInterval(syncTimer, 1000)
})

onBeforeUnmount(() => {
  if (clock) window.clearInterval(clock)
})
</script>

<template>
  <main class="exam-layout">
    <header class="exam-header">
      <div>
        <p class="eyebrow">{{ modeTitle }}</p>
        <h1>{{ paperTitle }}</h1>
      </div>
      <div class="exam-status">
        <span>已答 {{ answeredCount }} / {{ questions.length }}</span>
        <strong class="timer" :class="{ warning: secondsLeft <= 300 }">{{ timeText(secondsLeft) }}</strong>
        <button class="button danger-outline" @click="confirming = true">交卷</button>
      </div>
    </header>

    <div class="exam-body">
      <aside class="answer-card panel">
        <h2>答题卡</h2>
        <p class="muted">仅显示本场题号</p>
        <div class="number-grid">
          <button
            v-for="(_question, itemIndex) in questions"
            :key="itemIndex"
            class="number"
            :class="{
              current: index === itemIndex,
              answered: (session.answers[_question.id] ?? []).length > 0,
            }"
            @click="go(itemIndex)"
          >
            {{ itemIndex + 1 }}
          </button>
        </div>
      </aside>

      <section v-if="current" class="question-panel panel">
        <div class="question-heading">
          <span class="question-number">第 {{ index + 1 }} 题</span>
          <span class="question-type">{{ questionTypeText(current) }}</span>
        </div>
        <h2>{{ current.stem }}</h2>
        <img v-if="current.image" class="question-image" :src="assetUrl(current.image)" alt="题目配图" />
        <p v-if="current.type === 'multiple'" class="instruction">多选题须全部选择正确才得分。</p>
        <div v-if="current.type === 'blank'" class="blank-answer">
          <label for="blank-answer-input">答案</label>
          <input
            id="blank-answer-input"
            type="text"
            :value="currentAnswers[0] ?? ''"
            placeholder="请输入填空答案"
            @input="setBlankAnswer(($event.target as HTMLInputElement).value)"
          />
        </div>
        <div v-else class="options">
          <label
            v-for="option in current.options"
            :key="option.key"
            class="option"
            :class="{
              selected: currentAnswers.includes(option.key),
              correct: practiceAnswered && current.correctAnswers.includes(option.key),
              incorrect: practiceAnswered && currentAnswers.includes(option.key) && !current.correctAnswers.includes(option.key),
            }"
          >
            <input
              :type="current.type === 'multiple' ? 'checkbox' : 'radio'"
              :name="current.id"
              :checked="currentAnswers.includes(option.key)"
              @change="selectAnswer(option.key, ($event.target as HTMLInputElement).checked)"
            />
            <span class="option-key">{{ option.key }}</span>
            <span>{{ option.text }}</span>
          </label>
        </div>
        <div v-if="needsPracticeSubmission" class="practice-submit">
          <button class="button secondary" :disabled="currentAnswers.length === 0" @click="revealPracticeAnswer">
            {{ practiceAnswered ? '重新查看本题答案' : '提交本题查看答案' }}
          </button>
          <span class="muted">{{ current.type === 'blank' ? '填空题请填写后再查看答案，避免输入时提前泄露结果。' : '多选题请确认选项后再查看答案，避免提前泄露正确项。' }}</span>
        </div>
        <section
          v-if="practiceAnswered"
          class="practice-feedback"
          :class="practiceCorrect ? 'correct' : 'incorrect'"
        >
          <strong>{{ practiceCorrect ? '回答正确' : '回答错误' }}</strong>
          <p>你的答案：{{ answersText(current, currentAnswers) }}</p>
          <p>正确答案：{{ answersText(current, current.correctAnswers) }}</p>
          <p v-if="current.explanation">题解：{{ current.explanation }}</p>
        </section>
        <section v-if="isDataStructure" class="code-lab">
          <div class="code-lab-heading">
            <div>
              <strong>C 代码书写区</strong>
              <span>{{ compilerLabel }}</span>
            </div>
            <button class="button secondary" :disabled="runningCode" @click="compileAndRun">
              {{ runningCode ? '运行中...' : '编译运行' }}
            </button>
          </div>
          <textarea v-model="codeDraft" spellcheck="false" />
          <label class="stdin-label">
            标准输入
            <textarea v-model="codeStdin" class="stdin-box" spellcheck="false" placeholder="需要输入数据时填写" />
          </label>
          <pre v-if="compileResult" class="compile-output" :class="{ failed: !compileResult.success }">{{
            [
              compileResult.success ? '运行成功' : '运行失败',
              compileResult.stdout ? `stdout:\n${compileResult.stdout}` : '',
              compileResult.stderr ? `stderr:\n${compileResult.stderr}` : '',
            ]
              .filter(Boolean)
              .join('\n\n')
          }}</pre>
        </section>
        <footer class="question-navigation">
          <button class="button secondary" :disabled="index === 0" @click="go(index - 1)">上一题</button>
          <button
            v-if="index < questions.length - 1"
            class="button primary"
            @click="go(index + 1)"
          >
            下一题
          </button>
          <button v-else class="button primary" @click="confirming = true">完成并交卷</button>
        </footer>
      </section>
    </div>

    <div v-if="confirming" class="modal-backdrop">
      <section class="modal panel">
        <h2>确认交卷？</h2>
        <p v-if="unansweredCount">当前还有 <strong>{{ unansweredCount }}</strong> 道题未作答，交卷后无法修改。</p>
        <p v-else>全部题目均已作答，确认提交本次结果。</p>
        <div class="modal-actions">
          <button class="button secondary" @click="confirming = false">继续答题</button>
          <button class="button primary" @click="$emit('submit', 'manual')">确认交卷</button>
        </div>
      </section>
    </div>
  </main>
</template>
