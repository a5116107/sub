<template>
  <BaseDialog
    :show="show"
    :title="t('admin.errorPassthrough.title')"
    width="extra-wide"
    close-on-click-outside
    @close="$emit('close')"
  >
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.errorPassthrough.description') }}
        </p>
        <button class="btn btn-primary btn-sm" @click="openCreate">
          <Icon name="plus" size="sm" class="mr-1" />
          {{ t('admin.errorPassthrough.createRule') }}
        </button>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-8">
        <Icon name="refresh" size="lg" class="animate-spin text-gray-400" />
      </div>

      <div v-else-if="rules.length === 0" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        {{ t('admin.errorPassthrough.noRules') }}
      </div>

      <div v-else class="max-h-[60vh] overflow-auto rounded-lg border border-gray-200 dark:border-dark-700">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-dark-700">
          <thead class="sticky top-0 bg-gray-50 dark:bg-dark-700">
            <tr>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.priority') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.name') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.conditions') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.platforms') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.status') }}
              </th>
              <th class="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {{ t('admin.errorPassthrough.columns.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white dark:divide-dark-700 dark:bg-dark-800">
            <tr v-for="rule in rules" :key="rule.id" class="hover:bg-gray-50 dark:hover:bg-dark-700/40">
              <td class="whitespace-nowrap px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{{ rule.priority }}</td>
              <td class="px-3 py-2">
                <div class="text-sm font-medium text-gray-900 dark:text-white">{{ rule.name }}</div>
                <div v-if="rule.description" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ rule.description }}
                </div>
              </td>
              <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                <div>codes: {{ rule.error_codes.length ? rule.error_codes.join(', ') : '-' }}</div>
                <div>keywords: {{ rule.keywords.length ? rule.keywords.join(', ') : '-' }}</div>
                <div>mode: {{ rule.match_mode }}</div>
              </td>
              <td class="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                {{ rule.platforms.length ? rule.platforms.join(', ') : t('admin.errorPassthrough.allPlatforms') }}
              </td>
              <td class="px-3 py-2">
                <label class="inline-flex cursor-pointer items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    class="rounded border-gray-300 dark:border-dark-600"
                    :checked="rule.enabled"
                    @change="toggleEnabled(rule)"
                  />
                  {{ rule.enabled ? t('common.enabled') : t('common.disabled') }}
                </label>
              </td>
              <td class="px-3 py-2">
                <div class="flex items-center gap-2">
                  <button class="btn btn-secondary btn-xs" @click="openEdit(rule)">
                    <Icon name="edit" size="sm" />
                  </button>
                  <button class="btn btn-danger btn-xs" @click="deleteRule(rule)">
                    <Icon name="trash" size="sm" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-secondary" @click="$emit('close')">{{ t('common.close') }}</button>
    </template>
  </BaseDialog>

  <BaseDialog
    :show="showForm"
    :title="isEditing ? t('admin.errorPassthrough.editRule') : t('admin.errorPassthrough.createRule')"
    width="wide"
    close-on-click-outside
    @close="closeForm"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="input-label">{{ t('admin.errorPassthrough.form.name') }}</label>
          <input v-model="form.name" class="input" type="text" required />
        </div>
        <div>
          <label class="input-label">{{ t('admin.errorPassthrough.form.priority') }}</label>
          <input v-model.number="form.priority" class="input" type="number" min="0" />
        </div>
      </div>

      <div>
        <label class="input-label">{{ t('admin.errorPassthrough.form.description') }}</label>
        <input v-model="form.description" class="input" type="text" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="input-label">{{ t('admin.errorPassthrough.form.errorCodes') }}</label>
          <input v-model="form.errorCodesInput" class="input" type="text" :placeholder="t('admin.errorPassthrough.form.errorCodesPlaceholder')" />
        </div>
        <div>
          <label class="input-label">{{ t('admin.errorPassthrough.form.matchMode') }}</label>
          <select v-model="form.matchMode" class="input">
            <option value="any">{{ t('admin.errorPassthrough.matchMode.any') }}</option>
            <option value="all">{{ t('admin.errorPassthrough.matchMode.all') }}</option>
          </select>
        </div>
      </div>

      <div>
        <label class="input-label">{{ t('admin.errorPassthrough.form.keywords') }}</label>
        <textarea v-model="form.keywordsInput" class="input min-h-[88px]" :placeholder="t('admin.errorPassthrough.form.keywordsPlaceholder')" />
      </div>

      <div>
        <label class="input-label">{{ t('admin.errorPassthrough.form.platforms') }}</label>
        <div class="mt-2 grid grid-cols-3 gap-2">
          <label v-for="item in platformOptions" :key="item.value" class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              class="rounded border-gray-300 dark:border-dark-600"
              :value="item.value"
              :checked="form.platforms.includes(item.value)"
              @change="togglePlatform(item.value)"
            />
            {{ item.label }}
          </label>
        </div>
      </div>

      <div class="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-dark-700">
        <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="form.passthroughCode" type="checkbox" class="rounded border-gray-300 dark:border-dark-600" />
          {{ t('admin.errorPassthrough.form.passthroughCode') }}
        </label>
        <div v-if="!form.passthroughCode">
          <label class="input-label">{{ t('admin.errorPassthrough.form.responseCode') }}</label>
          <input v-model.number="form.responseCode" class="input" type="number" min="100" max="599" />
        </div>

        <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="form.passthroughBody" type="checkbox" class="rounded border-gray-300 dark:border-dark-600" />
          {{ t('admin.errorPassthrough.form.passthroughBody') }}
        </label>
        <div v-if="!form.passthroughBody">
          <label class="input-label">{{ t('admin.errorPassthrough.form.customMessage') }}</label>
          <input v-model="form.customMessage" class="input" type="text" />
        </div>

        <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input v-model="form.enabled" type="checkbox" class="rounded border-gray-300 dark:border-dark-600" />
          {{ t('admin.errorPassthrough.form.enabled') }}
        </label>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center justify-end gap-3">
        <button class="btn btn-secondary" :disabled="saving" @click="closeForm">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" :disabled="saving" @click="submit">
          {{ saving ? t('common.saving') : t('common.save') }}
        </button>
      </div>
    </template>
  </BaseDialog>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { adminAPI, type ErrorPassthroughRule } from '@/api/admin'

interface Props {
  show: boolean
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(false)
const saving = ref(false)
const rules = ref<ErrorPassthroughRule[]>([])
const showForm = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)

const platformOptions = [
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'antigravity', label: 'Antigravity' },
  { value: 'qwen', label: 'Qwen' },
  { value: 'iflow', label: 'IFlow' }
]

const form = reactive({
  name: '',
  enabled: true,
  priority: 0,
  errorCodesInput: '',
  keywordsInput: '',
  matchMode: 'any' as 'any' | 'all',
  platforms: [] as string[],
  passthroughCode: true,
  responseCode: null as number | null,
  passthroughBody: true,
  customMessage: '',
  description: ''
})

watch(
  () => props.show,
  (open) => {
    if (open) {
      loadRules()
    }
  }
)

const parseErrorCodes = (input: string): number[] =>
  input
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isInteger(item) && item > 0)

const parseKeywords = (input: string): string[] =>
  input
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean)

const resetForm = () => {
  form.name = ''
  form.enabled = true
  form.priority = 0
  form.errorCodesInput = ''
  form.keywordsInput = ''
  form.matchMode = 'any'
  form.platforms = []
  form.passthroughCode = true
  form.responseCode = null
  form.passthroughBody = true
  form.customMessage = ''
  form.description = ''
}

const loadRules = async () => {
  loading.value = true
  try {
    rules.value = await adminAPI.errorPassthrough.list()
  } catch (error: any) {
    appStore.showError(error?.message || t('admin.errorPassthrough.failedToLoad'))
  } finally {
    loading.value = false
  }
}

const togglePlatform = (platform: string) => {
  const idx = form.platforms.indexOf(platform)
  if (idx >= 0) form.platforms.splice(idx, 1)
  else form.platforms.push(platform)
}

const openCreate = () => {
  isEditing.value = false
  editingId.value = null
  resetForm()
  showForm.value = true
}

const openEdit = (rule: ErrorPassthroughRule) => {
  isEditing.value = true
  editingId.value = rule.id
  form.name = rule.name
  form.enabled = rule.enabled
  form.priority = rule.priority
  form.errorCodesInput = rule.error_codes.join(', ')
  form.keywordsInput = rule.keywords.join('\n')
  form.matchMode = rule.match_mode
  form.platforms = [...rule.platforms]
  form.passthroughCode = rule.passthrough_code
  form.responseCode = rule.response_code
  form.passthroughBody = rule.passthrough_body
  form.customMessage = rule.custom_message || ''
  form.description = rule.description || ''
  showForm.value = true
}

const closeForm = () => {
  showForm.value = false
  saving.value = false
}

const submit = async () => {
  const errorCodes = parseErrorCodes(form.errorCodesInput)
  const keywords = parseKeywords(form.keywordsInput)
  if (!form.name.trim()) {
    appStore.showError(t('admin.errorPassthrough.nameRequired'))
    return
  }
  if (errorCodes.length === 0 && keywords.length === 0) {
    appStore.showError(t('admin.errorPassthrough.conditionsRequired'))
    return
  }

  const payload = {
    name: form.name.trim(),
    enabled: form.enabled,
    priority: form.priority,
    error_codes: errorCodes,
    keywords: keywords,
    match_mode: form.matchMode,
    platforms: form.platforms,
    passthrough_code: form.passthroughCode,
    response_code: form.passthroughCode ? null : form.responseCode,
    passthrough_body: form.passthroughBody,
    custom_message: form.passthroughBody ? null : (form.customMessage.trim() || null),
    description: form.description.trim() || null
  }

  saving.value = true
  try {
    if (isEditing.value && editingId.value) {
      await adminAPI.errorPassthrough.update(editingId.value, payload)
      appStore.showSuccess(t('admin.errorPassthrough.ruleUpdated'))
    } else {
      await adminAPI.errorPassthrough.create(payload)
      appStore.showSuccess(t('admin.errorPassthrough.ruleCreated'))
    }
    closeForm()
    await loadRules()
  } catch (error: any) {
    appStore.showError(error?.message || t('admin.errorPassthrough.failedToSave'))
  } finally {
    saving.value = false
  }
}

const deleteRule = async (rule: ErrorPassthroughRule) => {
  if (!confirm(t('admin.errorPassthrough.deleteConfirm', { name: rule.name }))) return
  try {
    await adminAPI.errorPassthrough.delete(rule.id)
    appStore.showSuccess(t('admin.errorPassthrough.ruleDeleted'))
    await loadRules()
  } catch (error: any) {
    appStore.showError(error?.message || t('admin.errorPassthrough.failedToDelete'))
  }
}

const toggleEnabled = async (rule: ErrorPassthroughRule) => {
  try {
    await adminAPI.errorPassthrough.toggleEnabled(rule.id, !rule.enabled)
    rule.enabled = !rule.enabled
  } catch (error: any) {
    appStore.showError(error?.message || t('admin.errorPassthrough.failedToToggle'))
  }
}
</script>
