// Table composable for data tables
import { ref, computed, type Ref } from 'vue'

export type SortDirection = 'asc' | 'desc' | null

export interface SortState {
  key: string
  direction: SortDirection
}

export interface UseTableOptions<T> {
  data: Ref<T[]>
  sortable?: boolean
  defaultSort?: SortState
}

export interface UseTableReturn<T> {
  sortState: Ref<SortState>
  sortedData: Ref<T[]>
  setSort: (key: string) => void
  clearSort: () => void
}

export function useTable<T extends Record<string, any>>(
  options: UseTableOptions<T>
): UseTableReturn<T> {
  const { data, sortable = true, defaultSort = { key: '', direction: null } } = options

  const sortState = ref<SortState>({ ...defaultSort })

  const sortedData = computed(() => {
    if (!sortable || !sortState.value.direction) {
      return data.value
    }

    const { key, direction } = sortState.value

    return [...data.value].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (aVal === null || aVal === undefined) return 1
      if (bVal === null || bVal === undefined) return -1

      if (typeof aVal === 'string') {
        const comparison = aVal.localeCompare(bVal)
        return direction === 'asc' ? comparison : -comparison
      }

      if (typeof aVal === 'number') {
        return direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      if (aVal instanceof Date) {
        const aTime = aVal.getTime()
        const bTime = (bVal as Date).getTime()
        return direction === 'asc' ? aTime - bTime : bTime - aTime
      }

      return 0
    })
  })

  function setSort(key: string) {
    if (!sortable) return

    if (sortState.value.key === key) {
      // Cycle through: asc -> desc -> null
      if (sortState.value.direction === 'asc') {
        sortState.value.direction = 'desc'
      } else if (sortState.value.direction === 'desc') {
        sortState.value = { key: '', direction: null }
      } else {
        sortState.value.direction = 'asc'
      }
    } else {
      sortState.value = { key, direction: 'asc' }
    }
  }

  function clearSort() {
    sortState.value = { key: '', direction: null }
  }

  return {
    sortState,
    sortedData,
    setSort,
    clearSort
  }
}
