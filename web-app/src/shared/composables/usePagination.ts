// Pagination composable
import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

interface UsePaginationOptions {
  total: number
  pageSize?: number
  page?: number
}

interface UsePaginationReturn {
  currentPage: Ref<number>
  pageSize: Ref<number>
  totalPages: ComputedRef<number>
  startIndex: ComputedRef<number>
  endIndex: ComputedRef<number>
  hasPreviousPage: ComputedRef<boolean>
  hasNextPage: ComputedRef<boolean>
  pages: ComputedRef<number[]>
  goToPage: (page: number) => void
  goToPrevious: () => void
  goToNext: () => void
  setPageSize: (size: number) => void
}

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
  const { total, pageSize: initialPageSize = 20, page: initialPage = 1 } = options

  const currentPage = ref(initialPage)
  const pageSize = ref(initialPageSize)

  const totalPages = computed(() => Math.ceil(total / pageSize.value))

  const startIndex = computed(() => (currentPage.value - 1) * pageSize.value)

  const endIndex = computed(() => Math.min(startIndex.value + pageSize.value, total))

  const hasPreviousPage = computed(() => currentPage.value > 1)

  const hasNextPage = computed(() => currentPage.value < totalPages.value)

  const pages = computed(() => {
    const pages: number[] = []
    const maxVisiblePages = 5

    let startPage = Math.max(1, currentPage.value - Math.floor(maxVisiblePages / 2))
    let endPage = Math.min(totalPages.value, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  })

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page
    }
  }

  function goToPrevious() {
    if (hasPreviousPage.value) {
      currentPage.value--
    }
  }

  function goToNext() {
    if (hasNextPage.value) {
      currentPage.value++
    }
  }

  function setPageSize(size: number) {
    pageSize.value = size
    currentPage.value = 1
  }

  // Reset to page 1 when total changes significantly
  watch(() => total, () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = Math.max(1, totalPages.value)
    }
  })

  return {
    currentPage,
    pageSize,
    totalPages,
    startIndex,
    endIndex,
    hasPreviousPage,
    hasNextPage,
    pages,
    goToPage,
    goToPrevious,
    goToNext,
    setPageSize
  }
}
