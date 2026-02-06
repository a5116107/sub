import { ref, computed, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'

export interface SearchOptions {
  debounceMs?: number
  minLength?: number
}

export interface FilterOption {
  key: string
  value: string | number | boolean | null
  label: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'multiselect' | 'text' | 'date' | 'daterange' | 'boolean'
  options?: FilterOption[]
  placeholder?: string
}

export function useSearch(options: SearchOptions = {}) {
  const { debounceMs = 300, minLength = 0 } = options

  const query = ref('')
  const isSearching = ref(false)
  const searchHistory = ref<string[]>([])
  const activeFilters = ref<Record<string, any>>({})

  // Debounced search query
  const debouncedQuery = ref('')

  const updateDebouncedQuery = useDebounceFn((value: string) => {
    debouncedQuery.value = value
    isSearching.value = false
  }, debounceMs)

  watch(query, (newValue) => {
    if (newValue.length >= minLength || newValue.length === 0) {
      isSearching.value = true
      updateDebouncedQuery(newValue)
    }
  })

  // Check if search is active
  const hasActiveSearch = computed(() => {
    return debouncedQuery.value.length >= minLength && debouncedQuery.value.length > 0
  })

  // Check if any filters are active
  const hasActiveFilters = computed(() => {
    return Object.values(activeFilters.value).some(v => {
      if (Array.isArray(v)) return v.length > 0
      return v !== null && v !== undefined && v !== ''
    })
  })

  // Combined active state
  const isFiltering = computed(() => hasActiveSearch.value || hasActiveFilters.value)

  // Add to search history
  const addToHistory = (term: string) => {
    if (!term || term.length < minLength) return
    const filtered = searchHistory.value.filter(h => h !== term)
    searchHistory.value = [term, ...filtered].slice(0, 10)
    try {
      localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
    } catch {
      // Ignore storage errors
    }
  }

  // Load search history
  const loadHistory = () => {
    try {
      const stored = localStorage.getItem('searchHistory')
      if (stored) {
        searchHistory.value = JSON.parse(stored)
      }
    } catch {
      searchHistory.value = []
    }
  }

  // Clear search
  const clearSearch = () => {
    query.value = ''
    debouncedQuery.value = ''
  }

  // Set filter value
  const setFilter = (key: string, value: any) => {
    activeFilters.value = {
      ...activeFilters.value,
      [key]: value
    }
  }

  // Clear a specific filter
  const clearFilter = (key: string) => {
    const { [key]: _, ...rest } = activeFilters.value
    activeFilters.value = rest
  }

  // Clear all filters
  const clearAllFilters = () => {
    activeFilters.value = {}
  }

  // Reset everything
  const reset = () => {
    clearSearch()
    clearAllFilters()
  }

  // Filter function for local filtering
  const filterItems = <T extends Record<string, any>>(
    items: T[],
    searchFields: (keyof T)[]
  ): T[] => {
    let result = items

    // Apply text search
    if (hasActiveSearch.value) {
      const q = debouncedQuery.value.toLowerCase()
      result = result.filter(item => {
        return searchFields.some(field => {
          const value = item[field]
          if (value === null || value === undefined) return false
          return String(value).toLowerCase().includes(q)
        })
      })
    }

    // Apply filters
    if (hasActiveFilters.value) {
      result = result.filter(item => {
        return Object.entries(activeFilters.value).every(([key, filterValue]) => {
          if (filterValue === null || filterValue === undefined || filterValue === '') {
            return true
          }

          const itemValue = item[key]

          // Handle array filters (multiselect)
          if (Array.isArray(filterValue)) {
            if (filterValue.length === 0) return true
            return filterValue.includes(itemValue)
          }

          // Handle boolean filters
          if (typeof filterValue === 'boolean') {
            return itemValue === filterValue
          }

          // Handle string/number equality
          return itemValue === filterValue
        })
      })
    }

    return result
  }

  // Initialize
  loadHistory()

  return {
    query,
    debouncedQuery,
    isSearching,
    searchHistory,
    activeFilters,
    hasActiveSearch,
    hasActiveFilters,
    isFiltering,
    addToHistory,
    clearSearch,
    setFilter,
    clearFilter,
    clearAllFilters,
    reset,
    filterItems
  }
}
