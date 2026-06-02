<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Question } from '../types'

const GROUP_SIZE = 60

const props = defineProps<{
  questions: Question[]
  attemptedQuestionIds: string[]
}>()

const emit = defineEmits<{
  back: []
  start: [questionIds: string[]]
}>()

const selectedIds = ref(new Set<string>())

const groups = computed(() => {
  const result: { index: number; title: string; questions: Question[] }[] = []
  for (let start = 0; start < props.questions.length; start += GROUP_SIZE) {
    const items = props.questions.slice(start, start + GROUP_SIZE)
    const first = items[0]?.sourceNumber ?? start + 1
    const last = items[items.length - 1]?.sourceNumber ?? start + items.length
    result.push({
      index: result.length,
      title: `${first}-${last} 题`,
      questions: items,
    })
  }
  return result
})

const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() => selectedCount.value === props.questions.length && props.questions.length > 0)
const attemptedIds = computed(() => new Set(props.attemptedQuestionIds))
const unattemptedQuestions = computed(() => props.questions.filter((question) => !attemptedIds.value.has(question.id)))
const unattemptedCount = computed(() =>
  unattemptedQuestions.value.length,
)
const allUnattemptedSelected = computed(
  () => unattemptedQuestions.value.length > 0 && unattemptedQuestions.value.every((question) => selectedIds.value.has(question.id)),
)

function isSelected(questionId: string): boolean {
  return selectedIds.value.has(questionId)
}

function isUnattempted(questionId: string): boolean {
  return !attemptedIds.value.has(questionId)
}

function updateSelection(next: Set<string>) {
  selectedIds.value = next
}

function toggleQuestion(questionId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(questionId)) next.delete(questionId)
  else next.add(questionId)
  updateSelection(next)
}

function toggleAll() {
  if (allSelected.value) {
    updateSelection(new Set())
    return
  }
  updateSelection(new Set(props.questions.map((question) => question.id)))
}

function toggleAllUnattempted() {
  if (allUnattemptedSelected.value) {
    const next = new Set(selectedIds.value)
    unattemptedQuestions.value.forEach((question) => next.delete(question.id))
    updateSelection(next)
    return
  }
  updateSelection(new Set([...selectedIds.value, ...unattemptedQuestions.value.map((question) => question.id)]))
}

function groupSelected(groupQuestions: Question[]): boolean {
  return groupQuestions.every((question) => selectedIds.value.has(question.id))
}

function groupPartial(groupQuestions: Question[]): boolean {
  return groupQuestions.some((question) => selectedIds.value.has(question.id)) && !groupSelected(groupQuestions)
}

function toggleGroup(groupQuestions: Question[]) {
  const next = new Set(selectedIds.value)
  const selected = groupSelected(groupQuestions)
  groupQuestions.forEach((question) => {
    if (selected) next.delete(question.id)
    else next.add(question.id)
  })
  updateSelection(next)
}

function startPractice() {
  const selected = props.questions.filter((question) => selectedIds.value.has(question.id)).map((question) => question.id)
  emit('start', selected)
}

function typeText(type: Question['type']): string {
  if (type === 'multiple') return '多选'
  if (type === 'boolean') return '判断'
  if (type === 'blank') return '填空'
  return '单选'
}
</script>

<template>
  <main class="library-page practice-page">
    <header class="page-header panel practice-header">
      <div>
        <button class="text-button" @click="$emit('back')">返回首页</button>
        <p class="eyebrow">PRACTICE</p>
        <h1>练习模式</h1>
        <p class="muted">题库按每 60 题分组，也可以单独勾选任意题目后开始练习。</p>
      </div>
      <div class="page-actions">
        <button class="button secondary" :disabled="unattemptedCount === 0" @click="toggleAllUnattempted">
          {{ allUnattemptedSelected ? '取消新题' : `选择全部新题 ${unattemptedCount} 题` }}
        </button>
        <button class="button secondary" @click="toggleAll">
          {{ allSelected ? '取消全选' : `全选 ${questions.length} 题` }}
        </button>
        <button class="button primary" :disabled="selectedCount === 0" @click="startPractice">
          开始练习 {{ selectedCount }} 题
        </button>
      </div>
    </header>

    <section class="practice-summary panel">
      <strong>已选择 {{ selectedCount }} / {{ questions.length }} 题</strong>
      <span class="muted">
        <b class="new-question-dot">新</b>
        表示未做过的题目，共 {{ unattemptedCount }} 道。练习仍会计入题库完成度。
      </span>
    </section>

    <section class="practice-groups">
      <article v-for="group in groups" :key="group.index" class="practice-group panel">
        <div class="practice-group-heading">
          <label class="group-check">
            <input
              type="checkbox"
              :checked="groupSelected(group.questions)"
              :indeterminate.prop="groupPartial(group.questions)"
              @change="toggleGroup(group.questions)"
            />
            <span>第 {{ group.index + 1 }} 组</span>
          </label>
          <small>{{ group.title }} · 已选 {{ group.questions.filter((question) => isSelected(question.id)).length }} / {{ group.questions.length }}</small>
        </div>

        <div class="practice-question-grid">
          <button
            v-for="question in group.questions"
            :key="question.id"
            class="practice-question"
            :class="{ selected: isSelected(question.id), unattempted: isUnattempted(question.id) }"
            @click="toggleQuestion(question.id)"
            :title="isUnattempted(question.id) ? '未做过的题目' : '已做过的题目'"
          >
            <strong>{{ question.sourceNumber }}</strong>
            <span>{{ typeText(question.type) }}</span>
            <em v-if="isUnattempted(question.id)">新</em>
          </button>
        </div>
      </article>
    </section>
  </main>
</template>
