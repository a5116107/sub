import { ref, computed } from 'vue'

export interface UseBulkActionOptions<T> {
  getItemId: (item: T) => string | number
}

export function useBulkAction<T>(options: UseBulkActionOptions<T>) {
  const { getItemId } = options

  const selectedIds = ref<Set<string | number>>(new Set())

  const selectedCount = computed(() => selectedIds.value.size)

  const isSelected = (item: T): boolean => {
    return selectedIds.value.has(getItemId(item))
  }

  const isAllSelected = (items: T[]): boolean => {
    if (items.length === 0) return false
    return items.every(item => selectedIds.value.has(getItemId(item)))
  }

  const isSomeSelected = (items: T[]): boolean => {
    if (items.length === 0) return false
    const selectedInList = items.filter(item => selectedIds.value.has(getItemId(item)))
    return selectedInList.length > 0 && selectedInList.length < items.length
  }

  const toggleItem = (item: T) => {
    const id = getItemId(item)
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    } else {
      selectedIds.value.add(id)
    }
    // Trigger reactivity
    selectedIds.value = new Set(selectedIds.value)
  }

  const selectItem = (item: T) => {
    const id = getItemId(item)
    if (!selectedIds.value.has(id)) {
      selectedIds.value.add(id)
      selectedIds.value = new Set(selectedIds.value)
    }
  }

  const deselectItem = (item: T) => {
    const id = getItemId(item)
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
      selectedIds.value = new Set(selectedIds.value)
    }
  }

  const toggleAll = (items: T[]) => {
    if (isAllSelected(items)) {
      // Deselect all items in the list
      items.forEach(item => {
        selectedIds.value.delete(getItemId(item))
      })
    } else {
      // Select all items in the list
      items.forEach(item => {
        selectedIds.value.add(getItemId(item))
      })
    }
    selectedIds.value = new Set(selectedIds.value)
  }

  const selectAll = (items: T[]) => {
    items.forEach(item => {
      selectedIds.value.add(getItemId(item))
    })
    selectedIds.value = new Set(selectedIds.value)
  }

  const clearSelection = () => {
    selectedIds.value = new Set()
  }

  const getSelectedItems = (items: T[]): T[] => {
    return items.filter(item => selectedIds.value.has(getItemId(item)))
  }

  const getSelectedIds = (): (string | number)[] => {
    return Array.from(selectedIds.value)
  }

  return {
    selectedIds,
    selectedCount,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggleItem,
    selectItem,
    deselectItem,
    toggleAll,
    selectAll,
    clearSelection,
    getSelectedItems,
    getSelectedIds
  }
}
