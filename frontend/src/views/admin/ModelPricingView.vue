<template>
  <AppLayout>
    <div class="space-y-6">
      <!-- Header -->
      <div class="card p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.modelPricing.title') }}
            </div>
            <div class="mt-1 text-sm text-gray-500 dark:text-dark-400">
              {{ t('admin.modelPricing.description') }}
            </div>
          </div>

          <button class="btn btn-secondary" :disabled="loading" @click="refresh">
            <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
            <span class="ml-2">{{ t('common.refresh') }}</span>
          </button>
        </div>
      </div>

      <!-- Status -->
      <div class="card p-5">
        <div class="mb-3 text-sm font-semibold text-gray-700 dark:text-dark-200">
          {{ t('admin.modelPricing.status') }}
        </div>

        <div v-if="loading && !status" class="flex justify-center py-8">
          <LoadingSpinner />
        </div>

        <div v-else-if="status" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-800 dark:bg-dark-950">
            <div class="text-xs text-gray-500 dark:text-dark-400">{{ t('admin.modelPricing.modelCount') }}</div>
            <div class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
              {{ status.model_count.toLocaleString() }}
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-800 dark:bg-dark-950">
            <div class="text-xs text-gray-500 dark:text-dark-400">{{ t('admin.modelPricing.lastUpdated') }}</div>
            <div class="mt-1 text-sm font-medium text-gray-900 dark:text-white">
              {{ formatDateTime(status.last_updated) || '-' }}
            </div>
            <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {{ t('admin.modelPricing.localHash') }}: {{ status.local_hash || '-' }}
            </div>
          </div>

          <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-800 dark:bg-dark-950 md:col-span-2">
            <div class="flex items-center justify-between gap-4">
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ t('admin.modelPricing.override') }}
                </div>
              <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">
                  {{ t('admin.modelPricing.overrideHint') }}
              </div>
              </div>
              <Toggle
                :model-value="overrideEnabled"
                :disabled="overrideSaving"
                @update:model-value="onOverrideChange"
              />
            </div>
          </div>

          <div
            v-if="status.remote_url"
            class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs text-gray-600 dark:border-dark-800 dark:bg-dark-950 dark:text-dark-300 md:col-span-2"
          >
            <div class="flex flex-col gap-1">
              <div><span class="font-semibold">remote_url:</span> {{ status.remote_url }}</div>
              <div v-if="status.hash_url"><span class="font-semibold">hash_url:</span> {{ status.hash_url }}</div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-200">
          {{ t('admin.modelPricing.refreshFailed') }}
        </div>
      </div>

      <!-- Actions -->
      <div class="card p-5">
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          <!-- Import -->
          <div class="space-y-3">
            <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
              {{ t('admin.modelPricing.import') }}
            </div>
            <div class="text-xs text-gray-500 dark:text-dark-400">
              {{ t('admin.modelPricing.importHint') }}
            </div>

            <input class="input" type="file" accept="application/json,.json" @change="onFileChange" />
            <div class="text-xs text-gray-500 dark:text-dark-400">
              {{ selectedFile ? selectedFile.name : '-' }}
            </div>

            <button class="btn btn-primary" :disabled="!selectedFile || importing" @click="importNow">
              <Icon name="upload" size="md" :class="importing ? 'animate-pulse' : ''" />
              <span class="ml-2">{{ importing ? t('common.processing') : t('admin.modelPricing.import') }}</span>
            </button>
          </div>

          <!-- Download / Sync -->
          <div class="space-y-3">
            <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
              {{ t('common.actions') }}
            </div>

            <button class="btn btn-secondary" :disabled="downloading" @click="downloadNow">
              <Icon name="download" size="md" />
              <span class="ml-2">{{ t('admin.modelPricing.download') }}</span>
            </button>

            <div class="text-xs text-gray-500 dark:text-dark-400">
              {{ t('admin.modelPricing.syncHint') }}
            </div>
            <button class="btn btn-secondary" :disabled="syncing" @click="syncNow">
              <Icon name="refresh" size="md" :class="syncing ? 'animate-spin' : ''" />
              <span class="ml-2">{{ t('admin.modelPricing.syncRemote') }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Editor -->
      <div class="card p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="text-sm font-semibold text-gray-700 dark:text-dark-200">
              {{ t('admin.modelPricing.editor') }}
            </div>
            <div class="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {{ t('admin.modelPricing.editorHint') }}
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button class="btn btn-secondary btn-sm" :disabled="editorLoading" @click="loadEditor">
              <Icon name="download" size="sm" />
              <span class="ml-2">{{ t('admin.modelPricing.loadCurrent') }}</span>
            </button>
            <button
              class="btn btn-secondary btn-sm"
              :disabled="editorLoading || editorSaving || !editorText"
              @click="formatEditor"
            >
              <Icon name="sparkles" size="sm" />
              <span class="ml-2">{{ t('admin.modelPricing.formatJson') }}</span>
            </button>
            <button
              class="btn btn-primary btn-sm"
              :disabled="editorSaving || editorLoading || !editorDirty"
              @click="saveEditor"
            >
              <Icon name="check" size="sm" />
              <span class="ml-2">{{ editorSaving ? t('common.processing') : t('common.save') }}</span>
            </button>
          </div>
        </div>

        <div v-if="editorLoading" class="flex justify-center py-6">
          <LoadingSpinner />
        </div>
        <div v-else class="mt-3 space-y-2">
          <textarea
            v-model="editorText"
            class="input w-full resize-y font-mono text-xs leading-5"
            rows="16"
            spellcheck="false"
            :placeholder="t('admin.modelPricing.editorPlaceholder')"
          ></textarea>

          <div
            v-if="editorError"
            class="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          >
            {{ editorError }}
          </div>
          <div v-else class="text-xs text-gray-500 dark:text-dark-400">
            {{ editorDirty ? t('admin.modelPricing.unsavedChanges') : t('admin.modelPricing.savedHint') }}
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Toggle from '@/components/common/Toggle.vue'
import { useAppStore } from '@/stores'
import { formatDateTime } from '@/utils/format'
import modelPricingAPI, { type ModelPricingStatus } from '@/api/admin/modelPricing'

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(false)
const status = ref<ModelPricingStatus | null>(null)

const selectedFile = ref<File | null>(null)
const importing = ref(false)
const downloading = ref(false)
const syncing = ref(false)
const overrideSaving = ref(false)
const editorLoading = ref(false)
const editorSaving = ref(false)
const editorText = ref('')
const editorLoadedText = ref('')
const editorError = ref('')

const overrideEnabled = computed({
  get: () => status.value?.override_enabled ?? true,
  set: (val: boolean) => {
    if (status.value) status.value.override_enabled = val
  }
})

const editorDirty = computed(() => editorText.value !== editorLoadedText.value)

async function refresh(): Promise<void> {
  loading.value = true
  try {
    status.value = await modelPricingAPI.getStatus()
  } catch (err) {
    console.error('Failed to load model pricing status:', err)
    appStore.showError(t('admin.modelPricing.refreshFailed'))
  } finally {
    loading.value = false
  }
}

function onFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input?.files?.[0] || null
  selectedFile.value = file
}

async function applyOverride(): Promise<void> {
  if (!status.value) return
  overrideSaving.value = true
  try {
    status.value = await modelPricingAPI.setOverride(overrideEnabled.value)
  } catch (err) {
    console.error('Failed to update pricing override:', err)
    appStore.showError(t('admin.modelPricing.refreshFailed'))
    await refresh()
  } finally {
    overrideSaving.value = false
  }
}

async function onOverrideChange(value: boolean): Promise<void> {
  if (!status.value) return
  overrideEnabled.value = value
  await applyOverride()
}

async function importNow(): Promise<void> {
  if (!selectedFile.value) return
  importing.value = true
  try {
    status.value = await modelPricingAPI.importPricing(selectedFile.value, overrideEnabled.value)
    appStore.showSuccess(t('common.success'))
    selectedFile.value = null
  } catch (err) {
    console.error('Import pricing failed:', err)
    appStore.showError(t('admin.modelPricing.importFailed'))
  } finally {
    importing.value = false
  }
}

async function downloadNow(): Promise<void> {
  downloading.value = true
  try {
    const blob = await modelPricingAPI.downloadPricing()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'model_pricing.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Download pricing failed:', err)
    appStore.showError(t('admin.modelPricing.downloadFailed'))
  } finally {
    downloading.value = false
  }
}

async function syncNow(): Promise<void> {
  syncing.value = true
  try {
    status.value = await modelPricingAPI.syncFromRemote(true)
    appStore.showSuccess(t('common.success'))
  } catch (err) {
    console.error('Sync pricing failed:', err)
    appStore.showError(t('admin.modelPricing.syncFailed'))
  } finally {
    syncing.value = false
  }
}

function tryFormatJSON(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(raw)
    return { ok: true, text: JSON.stringify(parsed, null, 2) }
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message || err) }
  }
}

async function loadEditor(): Promise<void> {
  editorLoading.value = true
  editorError.value = ''
  try {
    const text = await modelPricingAPI.downloadPricingText()
    const formatted = tryFormatJSON(text)
    editorText.value = formatted.ok ? formatted.text : text
    editorLoadedText.value = editorText.value
    if (!formatted.ok) {
      editorError.value = t('admin.modelPricing.invalidJson')
    }
  } catch (err) {
    console.error('Load pricing failed:', err)
    editorError.value = t('admin.modelPricing.loadFailed')
    appStore.showError(t('admin.modelPricing.loadFailed'))
  } finally {
    editorLoading.value = false
  }
}

function formatEditor(): void {
  editorError.value = ''
  const formatted = tryFormatJSON(editorText.value)
  if (!formatted.ok) {
    editorError.value = `${t('admin.modelPricing.invalidJson')}: ${formatted.error}`
    return
  }
  editorText.value = formatted.text
}

async function saveEditor(): Promise<void> {
  editorSaving.value = true
  editorError.value = ''
  try {
    const formatted = tryFormatJSON(editorText.value)
    if (!formatted.ok) {
      editorError.value = `${t('admin.modelPricing.invalidJson')}: ${formatted.error}`
      return
    }

    const parsed = JSON.parse(formatted.text)
    status.value = await modelPricingAPI.importPricingJson(parsed, overrideEnabled.value)
    editorText.value = formatted.text
    editorLoadedText.value = formatted.text
    appStore.showSuccess(t('common.success'))
  } catch (err) {
    console.error('Save pricing failed:', err)
    editorError.value = t('admin.modelPricing.saveFailed')
    appStore.showError(t('admin.modelPricing.saveFailed'))
  } finally {
    editorSaving.value = false
  }
}

onMounted(() => {
  refresh()
  loadEditor()
})
</script>
