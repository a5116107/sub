<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useAnnouncementsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useUnreadCountQuery
} from '~/entities/announcement'
import type { Announcement } from '~/entities/announcement'
import { Button, Card, Badge, Skeleton } from '~/shared/ui'
import { EmptyState } from '~/widgets'

const { t } = useI18n()

// State
const currentPage = ref(1)
const pageSize = ref(10)
const showUnreadOnly = ref(false)

// Queries
const { data: announcementsData, isLoading } = useAnnouncementsQuery({
  page: currentPage.value,
  page_size: pageSize.value,
  unread_only: showUnreadOnly.value || undefined
})

// Re-fetch when params change
watch([currentPage, pageSize, showUnreadOnly], () => {
  // Query will auto-refetch due to reactive params
})

const { data: unreadCountData } = useUnreadCountQuery()

// Mutations
const markAsReadMutation = useMarkAsReadMutation()
const markAllAsReadMutation = useMarkAllAsReadMutation()

// Computed
const announcements = computed(() => announcementsData.value?.items || [])
const totalPages = computed(() => Math.ceil((announcementsData.value?.total || 0) / pageSize.value))
const unreadCount = computed(() => unreadCountData.value?.count || 0)

// Methods
function getTypeVariant(type: string): 'default' | 'success' | 'warning' | 'danger' {
  switch (type) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'danger'
    default:
      return 'default'
  }
}

function getTypeIcon(type: string): string {
  switch (type) {
    case 'success':
      return '✓'
    case 'warning':
      return '⚠'
    case 'error':
      return '✕'
    default:
      return 'ℹ'
  }
}

async function handleMarkAsRead(announcement: Announcement) {
  if (announcement.is_read) return
  await markAsReadMutation.mutateAsync(announcement.id)
}

async function handleMarkAllAsRead() {
  await markAllAsReadMutation.mutateAsync()
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-4xl">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-[var(--text-primary)]">
          {{ t('announcements.title', 'Announcements') }}
        </h1>
        <p class="text-sm text-[var(--text-secondary)] mt-1">
          {{ t('announcements.subtitle', 'Stay updated with the latest news and updates') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Unread filter -->
        <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
          <input
            v-model="showUnreadOnly"
            type="checkbox"
            class="rounded border-[var(--border-primary)] text-[var(--color-primary-500)] focus:ring-[var(--color-primary-500)]"
          />
          {{ t('announcements.unreadOnly', 'Unread only') }}
          <Badge v-if="unreadCount > 0" variant="default" size="sm">
            {{ unreadCount }}
          </Badge>
        </label>

        <!-- Mark all as read -->
        <Button
          v-if="unreadCount > 0"
          variant="secondary"
          size="sm"
          :loading="markAllAsReadMutation.isPending.value"
          @click="handleMarkAllAsRead"
        >
          {{ t('announcements.markAllRead', 'Mark all as read') }}
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="space-y-4">
      <Card v-for="i in 3" :key="i" class="p-4">
        <div class="flex items-start gap-4">
          <Skeleton class="w-8 h-8 rounded-full" />
          <div class="flex-1 space-y-2">
            <Skeleton class="h-5 w-1/3" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Empty state -->
    <EmptyState
      v-else-if="announcements.length === 0"
      :title="t('announcements.empty.title', 'No announcements')"
      :description="t('announcements.empty.description', 'There are no announcements at this time.')"
      icon="📢"
    />

    <!-- Announcements list -->
    <div v-else class="space-y-4">
      <Card
        v-for="announcement in announcements"
        :key="announcement.id"
        class="p-4 transition-all duration-200 hover:shadow-md cursor-pointer"
        :class="{
          'border-l-4 border-l-[var(--color-primary-500)] bg-[var(--color-primary-50)]/50 dark:bg-[var(--color-primary-900)]/20': !announcement.is_read
        }"
        @click="handleMarkAsRead(announcement)"
      >
        <div class="flex items-start gap-4">
          <!-- Type icon -->
          <div
            class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg"
            :class="{
              'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400': announcement.type === 'info',
              'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400': announcement.type === 'success',
              'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400': announcement.type === 'warning',
              'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400': announcement.type === 'error'
            }"
          >
            {{ getTypeIcon(announcement.type) }}
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-base font-semibold text-[var(--text-primary)] truncate">
                {{ announcement.title }}
              </h3>
              <Badge :variant="getTypeVariant(announcement.type)" size="sm">
                {{ announcement.type }}
              </Badge>
              <Badge v-if="!announcement.is_read" variant="default" size="sm">
                {{ t('announcements.new', 'New') }}
              </Badge>
            </div>

            <p class="text-sm text-[var(--text-secondary)] line-clamp-2 mb-2">
              {{ announcement.content }}
            </p>

            <div class="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
              <span>{{ formatDate(announcement.created_at) }}</span>
            </div>
          </div>
        </div>
      </Card>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
      <Button
        variant="secondary"
        size="sm"
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        {{ t('common.previous', 'Previous') }}
      </Button>

      <span class="text-sm text-[var(--text-secondary)] px-4">
        {{ currentPage }} / {{ totalPages }}
      </span>

      <Button
        variant="secondary"
        size="sm"
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        {{ t('common.next', 'Next') }}
      </Button>
    </div>
  </div>
</template>
