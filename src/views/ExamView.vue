<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import type { ActiveExam, Question } from '../types'

const props = defineProps<{
  session: ActiveExam
  questionMap: Map<string, Question>
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
let clock: number | undefined
let timeoutSubmitted = false

const questions = computed(() =>
  props.session.questionIds.map((id) => props.questionMap.get(id)).filter((item): item is Question => Boolean(item)),
)
const current = computed(() => questions.value[index.value])
const currentAnswers = computed(() => props.session.answers[current.value?.id] ?? [])
const answeredCount = computed(() =>
  props.session.questionIds.filter((id) => (props.session.answers[id] ?? []).length > 0).length,
)
const unansweredCount = computed(() => props.session.questionIds.length - answeredCount.value)

function syncTimer() {
  secondsLeft.value = Math.max(0, Math.ceil((new Date(props.session.deadlineAt).getTime() - Date.now()) / 1000))
  if (secondsLeft.value === 0 && !timeoutSubmitted) {
    timeoutSubmitted = true
    emit('submit', 'timeout')
  }
}

function selectAnswer(key: string, checked: boolean) {
  if (!current.value) return
  if (current.value.type !== 'multiple') {
    emit('answer', current.value.id, [key])
    return
  }
  const next = new Set(currentAnswers.value)
  if (checked) next.add(key)
  else next.delete(key)
  emit('answer', current.value.id, [...next])
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
        <p class="eyebrow">{{ session.mode === 'exam' ? '正式随机考试' : '错题重练' }}</p>
        <h1>{{ session.mode === 'exam' ? '随机试卷' : '待掌握错题练习' }}</h1>
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
          <span class="question-type">{{ current.type === 'multiple' ? '多选题' : current.type === 'boolean' ? '判断题' : '单选题' }}</span>
        </div>
        <h2>{{ current.stem }}</h2>
        <p v-if="current.type === 'multiple'" class="instruction">多选题须全部选择正确才得分。</p>
        <div class="options">
          <label
            v-for="option in current.options"
            :key="option.key"
            class="option"
            :class="{ selected: currentAnswers.includes(option.key) }"
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

