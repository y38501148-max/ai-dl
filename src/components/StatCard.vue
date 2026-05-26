<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  detail?: string
  accent?: boolean
  button?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button v-if="button" class="stat-card stat-card-button" :class="{ accent }" @click="$emit('click')">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <small v-if="detail">{{ detail }}</small>
  </button>
  <article v-else class="stat-card" :class="{ accent }">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <small v-if="detail">{{ detail }}</small>
  </article>
</template>
