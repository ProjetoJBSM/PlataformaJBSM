<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container header-content">
        <RouterLink to="/" class="brand">
          <img src="./assets/img/logo1.png" alt="Logo JBSM" class="brand-logo" />
          <div class="brand-text">
            <div class="brand-name">
              <span v-if="isAdminArea" class="brand-botanical">Administração</span>
              <span v-else="isAdminArea" class="brand-botanical">Jardim Botânico <span class="brand-institution">UFSM</span></span>
            </div>
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
          <RouterLink :to="{ name: 'home', hash: '#atracoes' }">Atrações</RouterLink>
          <RouterLink :to="{ name: 'home', hash: '#visite' }">Visite</RouterLink>
          <RouterLink :to="{ name: 'home', hash: '#contato' }">Contato</RouterLink>
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
            Importação
          </RouterLink>
          <RouterLink
            v-if="isAdminArea"
            :to="{ name: 'admin', query: { tab: 'plates' } }"
            :class="{ 'admin-tab-link-active': currentAdminTab === 'plates' }"
          >
            Geração de placas
          </RouterLink>
          <button
            v-if="isAdminArea"
            type="button"
            class="logout-btn"
            @click="handleLogout"
            aria-label="Sair da administração"
          >
            Sair
          </button>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="page-fade" mode="out-in" appear>
          <component :is="Component" :key="currentRoute.path" />
        </Transition>
      </RouterView>
    </main>

    <footer class="site-footer">
      <div class="container footer-content">
        <p>Jardim Botânico de Santa Maria - UFSM</p>
        <p>Av. Roraima, 1000 - Camobi, Santa Maria/RS</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useConnectionProfile } from './composables/useConnectionProfile'

const route = useRoute()
const router = useRouter()
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

async function handleLogout() {
  try {
    const [{ signOut }, { auth }] = await Promise.all([
      import('firebase/auth'),
      import('./services/firebase'),
    ])

    if (auth) {
      await signOut(auth)
    }

    await router.push({ name: 'home' })
  } catch (error) {
    console.error('Erro ao fazer logout:', error)
  }
}

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
