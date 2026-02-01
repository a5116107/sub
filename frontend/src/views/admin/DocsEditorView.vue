<template>
  <AppLayout>
    <div class="space-y-6">
      <div class="card p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.docs.title') }}
            </div>
            <div class="mt-1 text-sm text-gray-500 dark:text-dark-400">
              {{ t('admin.docs.subtitle') }}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <router-link to="/docs/overview" class="btn btn-secondary">
              {{ t('admin.docs.viewPublic') }}
            </router-link>
            <button class="btn btn-secondary" :disabled="pagesLoading" @click="loadPages">
              {{ t('common.refresh') }}
            </button>
          </div>
        </div>
      </div>

      <div class="card p-5">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
          <!-- Left: Pages -->
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
                {{ t('admin.docs.pages') }}
              </div>
              <button class="btn btn-primary btn-sm" @click="toggleCreate">
                {{ showCreate ? t('common.cancel') : t('common.create') }}
              </button>
            </div>

            <input v-model="search" class="input w-full" :placeholder="t('common.searchPlaceholder')" />

            <div
              v-if="showCreate"
              class="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-dark-800 dark:bg-dark-900"
            >
              <div class="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                {{ t('admin.docs.createPage') }}
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                  {{ t('admin.docs.slug') }}
                </label>
                <input v-model="createForm.key" class="input w-full" :placeholder="t('admin.docs.slugPlaceholder')" />
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.titleZh') }}
                  </label>
                  <input v-model="createForm.title_zh" class="input w-full" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.titleEn') }}
                  </label>
                  <input v-model="createForm.title_en" class="input w-full" />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.group') }}
                  </label>
                  <input v-model="createForm.group" class="input w-full" :placeholder="t('admin.docs.groupPlaceholder')" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.order') }}
                  </label>
                  <input v-model.number="createForm.order" type="number" class="input w-full" />
                </div>
              </div>

              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.format') }}
                  </label>
                  <select v-model="createForm.format" class="input w-full">
                    <option value="markdown">{{ t('admin.docs.formats.markdown') }}</option>
                    <option value="html">{{ t('admin.docs.formats.html') }}</option>
                    <option value="text">{{ t('admin.docs.formats.text') }}</option>
                  </select>
                </div>
                <div class="flex items-end">
                  <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-200">
                    <input
                      v-model="createForm.public"
                      type="checkbox"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {{ t('admin.docs.public') }}
                  </label>
                </div>
              </div>

              <button class="btn btn-primary w-full" :disabled="creating" @click="createPage">
                {{ creating ? t('common.processing') : t('common.create') }}
              </button>
            </div>

            <div v-if="pagesLoading" class="flex items-center justify-center py-10">
              <LoadingSpinner />
            </div>

            <div
              v-else-if="pagesError"
              class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
            >
              <div class="font-medium">{{ t('common.error') }}</div>
              <div class="mt-1">{{ pagesError }}</div>
            </div>

            <div v-else class="space-y-4">
              <div v-if="groupedPages.length === 0" class="text-sm text-gray-500 dark:text-dark-400">
                {{ t('common.noData') }}
              </div>

              <div v-for="group in groupedPages" :key="group.name" class="space-y-1.5">
                <div class="px-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-400">
                  {{ group.name }}
                </div>

                <button
                  v-for="p in group.pages"
                  :key="p.key"
                  class="w-full rounded-xl px-3 py-2 text-left text-sm transition-colors"
                  :class="
                    selectedKey === p.key
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-800'
                  "
                  @click="selectPage(p.key)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-medium leading-5">{{ displayTitle(p) }}</div>
                    <span
                      class="mt-0.5 rounded-md px-2 py-0.5 text-[11px]"
                      :class="
                        p.public
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          : 'bg-gray-200 text-gray-700 dark:bg-dark-800 dark:text-dark-200'
                      "
                    >
                      {{ p.public ? t('admin.docs.public') : t('admin.docs.private') }}
                    </span>
                  </div>
                  <div class="mt-0.5 flex items-center justify-between text-xs text-gray-500 dark:text-dark-400">
                    <span>/docs/{{ p.key }}</span>
                    <span class="uppercase">{{ p.format || 'markdown' }}</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <!-- Right: Meta + Content -->
          <div v-if="!selectedMeta" class="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-dark-400">
            {{ t('admin.docs.selectHint') }}
          </div>

          <div v-else class="space-y-5">
            <!-- Meta -->
            <div class="rounded-2xl border border-gray-200/60 bg-white p-5 shadow-sm dark:border-dark-800/60 dark:bg-dark-900">
              <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div class="text-sm font-semibold text-gray-900 dark:text-white">
                    {{ t('admin.docs.meta') }}
                  </div>
                  <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">/docs/{{ selectedMeta.key }}</div>
                </div>

                <div class="flex items-center gap-2">
                  <router-link v-if="metaForm.public" :to="`/docs/${selectedMeta.key}`" class="btn btn-secondary btn-sm">
                    {{ t('admin.docs.openPage') }}
                  </router-link>

                  <button class="btn btn-primary btn-sm" :disabled="metaSaving || !metaDirty" @click="saveMeta">
                    {{ metaSaving ? t('common.saving') : t('common.save') }}
                  </button>

                  <button
                    v-if="!isBuiltIn(selectedMeta.key)"
                    class="btn btn-secondary btn-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    :disabled="deleting"
                    @click="deleteSelected"
                  >
                    {{ t('common.delete') }}
                  </button>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.titleZh') }}
                  </label>
                  <input v-model="metaForm.title_zh" class="input w-full" />
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.titleEn') }}
                  </label>
                  <input v-model="metaForm.title_en" class="input w-full" />
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.group') }}
                  </label>
                  <input v-model="metaForm.group" class="input w-full" :placeholder="t('admin.docs.groupPlaceholder')" />
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.order') }}
                  </label>
                  <input v-model.number="metaForm.order" type="number" class="input w-full" />
                </div>

                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.format') }}
                  </label>
                  <select v-model="metaForm.format" class="input w-full">
                    <option value="markdown">{{ t('admin.docs.formats.markdown') }}</option>
                    <option value="html">{{ t('admin.docs.formats.html') }}</option>
                    <option value="text">{{ t('admin.docs.formats.text') }}</option>
                  </select>
                </div>

                <div class="flex items-end">
                  <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-200">
                    <input
                      v-model="metaForm.public"
                      type="checkbox"
                      class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {{ t('admin.docs.public') }}
                  </label>
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-dark-800 dark:bg-dark-950">
                <div class="flex items-center justify-between">
                  <div class="font-medium text-gray-700 dark:text-dark-200">{{ t('admin.docs.status') }}</div>
                  <div
                    class="text-xs"
                    :class="metaDirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-dark-400'"
                  >
                    {{ metaDirty ? t('admin.docs.unsaved') : t('admin.docs.saved') }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Editor + Preview -->
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <div class="space-y-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
                    {{ t('admin.docs.content') }}
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      class="btn btn-sm"
                      :class="editLang === 'zh' ? 'btn-primary' : 'btn-secondary'"
                      @click="editLang = 'zh'"
                    >
                      中文
                    </button>
                    <button
                      class="btn btn-sm"
                      :class="editLang === 'en' ? 'btn-primary' : 'btn-secondary'"
                      @click="editLang = 'en'"
                    >
                      English
                    </button>
                    <button class="btn btn-primary btn-sm" :disabled="contentSaving || contentLoading || !contentDirty" @click="saveContent">
                      {{ contentSaving ? t('common.saving') : t('common.save') }}
                    </button>
                  </div>
                </div>

                <div
                  class="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-dark-800 dark:bg-dark-950"
                >
                  <div class="flex items-center justify-between">
                    <div class="font-medium text-gray-700 dark:text-dark-200">
                      {{ t('admin.docs.status') }}
                    </div>
                    <div
                      class="text-xs"
                      :class="contentDirty ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-dark-400'"
                    >
                      {{ contentDirty ? t('admin.docs.unsaved') : t('admin.docs.saved') }}
                    </div>
                  </div>
                  <div v-if="contentUpdatedAt" class="mt-1 text-xs text-gray-500 dark:text-dark-400">
                    {{ t('admin.docs.updatedAt') }}: {{ contentUpdatedAt }}
                  </div>
                  <div v-else class="mt-1 text-xs text-gray-500 dark:text-dark-400">
                    {{ t('admin.docs.updatedAt') }}: {{ t('common.unknown') }}
                  </div>
                </div>

                <div
                  v-if="contentLoading"
                  class="flex items-center justify-center rounded-xl border border-gray-200 py-16 dark:border-dark-800"
                >
                  <LoadingSpinner />
                </div>

                <textarea
                  v-else
                  v-model="content"
                  class="input min-h-[520px] w-full font-mono text-sm leading-6"
                  :placeholder="contentPlaceholder"
                ></textarea>

                <div
                  v-if="currentFormat === 'html'"
                  class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                >
                  {{ t('admin.docs.htmlSanitizedHint') }}
                </div>
              </div>

              <div class="space-y-2">
                <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
                  {{ t('common.preview') }}
                </div>
                <div class="min-h-[520px] overflow-auto rounded-xl border border-gray-200 bg-white p-4 dark:border-dark-800 dark:bg-dark-900">
                  <RichContentRenderer :content="content" :format="currentFormat" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { adminAPI } from '@/api/admin'
import { useAppStore } from '@/stores'
import RichContentRenderer from '@/components/docs/RichContentRenderer.vue'

const { t, locale } = useI18n()
const appStore = useAppStore()

type DocsPageMeta = {
  key: string
  title_zh?: string
  title_en?: string
  group?: string
  order?: number
  format?: 'markdown' | 'html' | 'text' | string
  public: boolean
}

type UpsertDocsPageMetaRequest = {
  key: string
  title_zh?: string
  title_en?: string
  group?: string
  order?: number
  format?: 'markdown' | 'html' | 'text' | string
  public: boolean
}

const builtInKeys = new Set(['overview', 'quickstart', 'compatibility', 'faq'])

const pagesLoading = ref(false)
const pagesError = ref('')
const pages = ref<DocsPageMeta[]>([])

const search = ref('')
const showCreate = ref(false)
const creating = ref(false)

const selectedKey = ref('overview')

const createForm = ref<UpsertDocsPageMetaRequest>({
  key: '',
  title_zh: '',
  title_en: '',
  group: 'Docs',
  order: 100,
  format: 'markdown',
  public: true
})

const selectedMeta = computed<DocsPageMeta | null>(() => {
  return pages.value.find(p => p.key === selectedKey.value) || null
})

const metaForm = ref<UpsertDocsPageMetaRequest>({
  key: 'overview',
  title_zh: '',
  title_en: '',
  group: '',
  order: 10,
  format: 'markdown',
  public: true
})

const metaSaving = ref(false)
const deleting = ref(false)

const editLang = ref<'zh' | 'en'>('zh')
const contentLoading = ref(false)
const contentSaving = ref(false)
const content = ref('')
const loadedContent = ref('')
const contentUpdatedAt = ref<string>('')

const metaDirty = computed(() => {
  if (!selectedMeta.value) return false
  const curr = metaForm.value
  const orig = selectedMeta.value
  return (
    (curr.title_zh || '') !== (orig.title_zh || '') ||
    (curr.title_en || '') !== (orig.title_en || '') ||
    (curr.group || '') !== (orig.group || '') ||
    Number(curr.order || 0) !== Number(orig.order || 0) ||
    (curr.format || 'markdown') !== (orig.format || 'markdown') ||
    Boolean(curr.public) !== Boolean(orig.public)
  )
})

const contentDirty = computed(() => content.value !== loadedContent.value)

const currentFormat = computed(() => {
  return (metaForm.value.format || selectedMeta.value?.format || 'markdown') as string
})

const contentPlaceholder = computed(() => {
  if (currentFormat.value === 'html') return t('admin.docs.htmlPlaceholder')
  if (currentFormat.value === 'text') return t('admin.docs.textPlaceholder')
  return t('admin.docs.placeholder')
})

function isBuiltIn(key: string): boolean {
  return builtInKeys.has(String(key || '').toLowerCase())
}

function displayTitle(meta: DocsPageMeta): string {
  // Prefer current UI language: zh->title_zh, otherwise title_en.
  const uiLang = String(locale.value || '').toLowerCase().startsWith('zh') ? 'zh' : 'en'
  if (uiLang === 'zh') {
    return String(meta.title_zh || meta.title_en || meta.key)
  }
  return String(meta.title_en || meta.title_zh || meta.key)
}

function toggleCreate(): void {
  showCreate.value = !showCreate.value
  if (!showCreate.value) {
    createForm.value = {
      key: '',
      title_zh: '',
      title_en: '',
      group: 'Docs',
      order: 100,
      format: 'markdown',
      public: true
    }
  }
}

function selectPage(key: string): void {
  selectedKey.value = String(key || '').toLowerCase()
}

async function loadPages(): Promise<void> {
  pagesLoading.value = true
  pagesError.value = ''
  try {
    const list = await adminAPI.docs.listPages()
    pages.value = (list || [])
      .slice()
      .sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || a.key.localeCompare(b.key))

    if (pages.value.length > 0 && !pages.value.some(p => p.key === selectedKey.value)) {
      selectedKey.value = pages.value[0].key
    }
  } catch (error) {
    console.error('Failed to load docs pages:', error)
    pagesError.value = t('admin.docs.loadFailed')
  } finally {
    pagesLoading.value = false
  }
}

async function createPage(): Promise<void> {
  creating.value = true
  try {
    const payload: UpsertDocsPageMetaRequest = {
      ...createForm.value,
      key: String(createForm.value.key || '').trim().toLowerCase()
    }
    if (!payload.key) {
      appStore.showError(t('admin.docs.slugRequired'))
      return
    }

    const created = await adminAPI.docs.createPage(payload)
    appStore.showSuccess(t('admin.docs.createdToast'))
    showCreate.value = false
    await loadPages()
    selectedKey.value = created.key
  } catch (error) {
    console.error('Failed to create docs page:', error)
    appStore.showError(t('admin.docs.saveFailed'))
  } finally {
    creating.value = false
  }
}

async function saveMeta(): Promise<void> {
  if (!selectedMeta.value) return
  metaSaving.value = true
  try {
    const payload: UpsertDocsPageMetaRequest = {
      ...metaForm.value,
      key: selectedMeta.value.key
    }
    const updated = await adminAPI.docs.updatePageMeta(selectedMeta.value.key, payload)
    pages.value = pages.value.map(p => (p.key === updated.key ? updated : p))
    appStore.showSuccess(t('admin.docs.savedToast'))
  } catch (error) {
    console.error('Failed to update docs meta:', error)
    appStore.showError(t('admin.docs.saveFailed'))
  } finally {
    metaSaving.value = false
  }
}

async function deleteSelected(): Promise<void> {
  if (!selectedMeta.value) return
  if (isBuiltIn(selectedMeta.value.key)) return
  if (!confirm(t('admin.docs.deleteConfirm'))) return

  deleting.value = true
  try {
    await adminAPI.docs.deletePage(selectedMeta.value.key)
    appStore.showSuccess(t('admin.docs.deletedToast'))
    await loadPages()
  } catch (error) {
    console.error('Failed to delete docs page:', error)
    appStore.showError(t('admin.docs.saveFailed'))
  } finally {
    deleting.value = false
  }
}

async function loadContent(): Promise<void> {
  if (!selectedMeta.value) return
  contentLoading.value = true
  try {
    const page = await adminAPI.docs.getDocPage(selectedMeta.value.key, editLang.value)
    content.value = page.markdown || ''
    loadedContent.value = page.markdown || ''
    contentUpdatedAt.value = page.updated_at || ''
  } catch (error) {
    console.error('Failed to load docs content:', error)
    appStore.showError(t('admin.docs.loadFailed'))
  } finally {
    contentLoading.value = false
  }
}

async function saveContent(): Promise<void> {
  if (!selectedMeta.value) return
  contentSaving.value = true
  try {
    const page = await adminAPI.docs.updateDocPage(selectedMeta.value.key, {
      lang: editLang.value,
      markdown: content.value
    })
    loadedContent.value = page.markdown || ''
    contentUpdatedAt.value = page.updated_at || ''
    appStore.showSuccess(t('admin.docs.savedToast'))
  } catch (error) {
    console.error('Failed to save docs content:', error)
    appStore.showError(t('admin.docs.saveFailed'))
  } finally {
    contentSaving.value = false
  }
}

const groupedPages = computed(() => {
  const q = String(search.value || '').trim().toLowerCase()
  const filtered = pages.value.filter(p => {
    if (!q) return true
    const hay = `${p.key} ${p.title_zh || ''} ${p.title_en || ''} ${p.group || ''}`.toLowerCase()
    return hay.includes(q)
  })

  const groups = new Map<string, { name: string; order: number; pages: DocsPageMeta[] }>()
  for (const p of filtered) {
    const name = String(p.group || '').trim() || t('admin.docs.ungrouped')
    const order = Number(p.order || 0)
    const existing = groups.get(name)
    if (!existing) {
      groups.set(name, { name, order, pages: [p] })
    } else {
      existing.pages.push(p)
      existing.order = Math.min(existing.order, order)
    }
  }

  const out = Array.from(groups.values()).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
  for (const g of out) {
    g.pages.sort((a, b) => (Number(a.order || 0) - Number(b.order || 0)) || a.key.localeCompare(b.key))
  }
  return out
})

watch(selectedMeta, meta => {
  if (!meta) return
  metaForm.value = {
    key: meta.key,
    title_zh: meta.title_zh || '',
    title_en: meta.title_en || '',
    group: meta.group || '',
    order: Number(meta.order || 0),
    format: (meta.format || 'markdown') as string,
    public: Boolean(meta.public)
  }
  loadContent()
})

watch(editLang, () => {
  loadContent()
})

onMounted(() => {
  loadPages()
})
</script>
