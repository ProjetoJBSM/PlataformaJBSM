import { computed, onMounted, onUnmounted, ref } from 'vue'

export function useConnectionProfile() {
  const effectiveType = ref('4g')
  const saveData = ref(false)

  function sync() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection

    if (!connection) {
      effectiveType.value = '4g'
      saveData.value = false
      return
    }

    effectiveType.value = connection.effectiveType || '4g'
    saveData.value = Boolean(connection.saveData)
  }

  onMounted(() => {
    sync()
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection?.addEventListener) {
      connection.addEventListener('change', sync)
    }
  })

  onUnmounted(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection?.removeEventListener) {
      connection.removeEventListener('change', sync)
    }
  })

  const profileLabel = computed(() => {
    if (saveData.value || effectiveType.value === 'slow-2g' || effectiveType.value === '2g') {
      return 'Modo economia de dados'
    }

    if (effectiveType.value === '3g') {
      return 'Conexao media'
    }

    return 'Conexao rapida'
  })

  const preferredImageVariant = computed(() => {
    if (saveData.value || effectiveType.value === 'slow-2g' || effectiveType.value === '2g') {
      return 'low'
    }

    if (effectiveType.value === '3g') {
      return 'medium'
    }

    return 'high'
  })

  return {
    effectiveType,
    saveData,
    profileLabel,
    preferredImageVariant,
  }
}
