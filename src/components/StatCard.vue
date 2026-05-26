<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  detail?: string
  accent?: boolean
}>()
</script>

<template>
  <article class="stat-card" :class="{ accent }">
    <p>{{ label }}</p>
    <strong>{{ value }}</strong>
    <small v-if="detail">{{ detail }}</small>
  </article>
</template>

