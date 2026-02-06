// Group API functions
import { useQuery } from '@tanstack/vue-query'
import { get } from '~/shared/api/client'
import type { Group } from '../model/types'

// Query Keys
const GROUP_KEYS = {
  all: ['groups'] as const,
  available: () => [...GROUP_KEYS.all, 'available'] as const
}

// API functions
export const groupApi = {
  list: () => get<Group[]>('/groups/available')
}

// Composables
export function useAvailableGroupsQuery() {
  return useQuery({
    queryKey: GROUP_KEYS.available(),
    queryFn: () => groupApi.list()
  })
}
