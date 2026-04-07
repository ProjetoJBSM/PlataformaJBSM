<template>
  <div class="app-shell">
    <header class="site-header">
      <div class="container header-content">
        <RouterLink to="/" class="brand">
          <span class="brand-mark" aria-hidden="true">JBSM</span>
          <div class="brand-text">
            <strong>Jardim Botanico UFSM</strong>
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
          <RouterLink to="/acervo">Acervo</RouterLink>
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
import { ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()
const mobileMenuOpen = ref(false)

watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)
</script>
