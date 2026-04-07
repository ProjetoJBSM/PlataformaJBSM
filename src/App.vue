<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container header-content">
        <RouterLink to="/" class="brand">
          <span class="brand-mark" aria-hidden="true">JBSM</span>
          <div class="brand-text">
            <strong>
              Jardim Botanico UFSM
              <span v-if="isAdminArea"> | Administracao</span>
            </strong>
            <small>Acervo botanico digital</small>
          </div>
        </RouterLink>

        <button
          class="menu-toggle"
          type="button"
          @click="mobileMenuOpen = !mobileMenuOpen"
          :aria-expanded="mobileMenuOpen"
          aria-label="Abrir menu"
        >
          Menu
        </button>

        <nav class="main-nav" :class="{ open: mobileMenuOpen }">
          <RouterLink :to="{ name: 'home', hash: '#sobre' }">Sobre</RouterLink>
          <RouterLink :to="{ name: 'home', hash: '#atracoes' }">Atracoes</RouterLink>
          <RouterLink :to="{ name: 'home', hash: '#visita' }">Visite</RouterLink>
          <RouterLink :to="{ name: 'collection' }">Acervo</RouterLink>

          <span v-if="isAdminArea" class="main-nav-divider" aria-hidden="true"></span>

          <RouterLink
            v-if="isAdminArea"
            :to="{ name: 'admin', query: { tab: 'records' } }"
            :class="{ 'admin-tab-link-active': currentAdminTab === 'records' }"
          >
            Registros
          </RouterLink>
          <RouterLink
            v-if="isAdminArea"
            :to="{ name: 'admin', query: { tab: 'csv' } }"
            :class="{ 'admin-tab-link-active': currentAdminTab === 'csv' }"
          >
            Importacao
          </RouterLink>
          <RouterLink
            v-if="isAdminArea"
            :to="{ name: 'admin', query: { tab: 'plates' } }"
            :class="{ 'admin-tab-link-active': currentAdminTab === 'plates' }"
          >
            Geracao de placas
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <div class="container footer-content">
        <p>Jardim Botanico de Santa Maria - UFSM</p>
        <p>Av. Roraima, 1000 - Camobi, Santa Maria/RS</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { useConnectionProfile } from './composables/useConnectionProfile'

const route = useRoute()
const mobileMenuOpen = ref(false)
const { effectiveType, saveData } = useConnectionProfile()

const isAdminArea = computed(() => route.path.startsWith('/admin'))
const currentAdminTab = computed(() => {
  if (route.name !== 'admin') {
    return ''
  }

  const tab = typeof route.query.tab === 'string' ? route.query.tab.toLowerCase() : ''
  return ['records', 'csv', 'plates'].includes(tab) ? tab : 'records'
})
const lowMotionMode = computed(() => {
  return saveData.value || ['slow-2g', '2g', '3g'].includes(effectiveType.value)
})

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)

watch(
  lowMotionMode,
  (enabled) => {
    document.body.classList.toggle('low-motion', enabled)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  document.body.classList.remove('low-motion')
})
</script>
