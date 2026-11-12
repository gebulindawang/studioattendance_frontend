import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getMe } from '@/api/user'
import { ROLE } from '@/constants/role'

export const useUserStore = defineStore('user', () => {
  const profile = ref(null)

  const isLoaded = computed(() => profile.value !== null)
  const role = computed(() => profile.value?.role)
  const isAdmin = computed(() => role.value === ROLE.ADMIN)
  const displayName = computed(() => profile.value?.nickname || profile.value?.username || '')

  async function fetchProfile() {
    profile.value = await getMe()
    return profile.value
  }

  function hasRole(roles) {
    return roles.includes(role.value)
  }

  function reset() {
    profile.value = null
  }

  return { profile, isLoaded, role, isAdmin, displayName, fetchProfile, hasRole, reset }
})
