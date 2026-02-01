<template>
  <div class="docs-markdown" v-html="sanitizedHtml"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  markdown: string
}>()

marked.setOptions({
  gfm: true,
  breaks: false
})

const sanitizedHtml = computed(() => {
  const raw = props.markdown || ''
  const html = marked.parse(raw) as string
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } })
})
</script>

<style scoped>
.docs-markdown :deep(h1) {
  @apply mb-4 text-3xl font-bold text-gray-900 dark:text-white;
}

.docs-markdown :deep(h2) {
  @apply mt-10 mb-3 text-2xl font-semibold text-gray-900 dark:text-white;
}

.docs-markdown :deep(h3) {
  @apply mt-8 mb-2 text-xl font-semibold text-gray-900 dark:text-white;
}

.docs-markdown :deep(p) {
  @apply my-3 leading-7 text-gray-700 dark:text-dark-200;
}

.docs-markdown :deep(ul) {
  @apply my-3 list-disc space-y-2 pl-6 text-gray-700 dark:text-dark-200;
}

.docs-markdown :deep(ol) {
  @apply my-3 list-decimal space-y-2 pl-6 text-gray-700 dark:text-dark-200;
}

.docs-markdown :deep(li) {
  @apply leading-7;
}

.docs-markdown :deep(a) {
  @apply text-primary-600 underline-offset-2 hover:underline dark:text-primary-400;
}

.docs-markdown :deep(blockquote) {
  @apply my-4 border-l-4 border-primary-400/50 bg-primary-50/50 px-4 py-2 text-gray-700 dark:border-primary-500/40 dark:bg-dark-900/40 dark:text-dark-200;
}

.docs-markdown :deep(code) {
  @apply rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-900 dark:bg-dark-800 dark:text-dark-50;
}

.docs-markdown :deep(pre) {
  @apply my-4 overflow-x-auto rounded-xl bg-gray-950 p-4 text-sm text-gray-100 shadow-sm;
}

.docs-markdown :deep(pre code) {
  @apply bg-transparent p-0 text-gray-100;
}

.docs-markdown :deep(hr) {
  @apply my-8 border-gray-200/60 dark:border-dark-700/60;
}

.docs-markdown :deep(table) {
  @apply my-4 w-full border-collapse overflow-hidden rounded-xl;
}

.docs-markdown :deep(th) {
  @apply border border-gray-200 bg-gray-50 px-3 py-2 text-left text-sm font-semibold text-gray-900 dark:border-dark-700 dark:bg-dark-900 dark:text-white;
}

.docs-markdown :deep(td) {
  @apply border border-gray-200 px-3 py-2 text-sm text-gray-700 dark:border-dark-700 dark:text-dark-200;
}
</style>
