// Auth store
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { STORAGE_KEYS } from '~/shared/config/constants'
import type { User } from '~/entities/user'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref<string | null>(localStorage.getItem(STORAGE_KEYS.TOKEN))
  const user = ref<User | null>(null)
  const isLoading = ref(false)

  // Getters
  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  // Actions
  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
  }

  function clearAuth() {
    token.value = null
    user.value = null
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
  }

  return {
    token,
    user,
    isLoading,
    isAuthenticated,
    isAdmin,
    setToken,
    setUser,
    logout,
    clearAuth
  }
})
