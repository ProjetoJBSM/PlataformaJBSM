<template>
  <div class="container fade-up">
    <div v-if="loadingOverlayVisible" class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-dialog">
        <div class="spinner" aria-hidden="true"></div>
        <strong>Carregando acervo</strong>
        <p>{{ loadingMessage || 'Buscando espécies...' }}</p>
      </div>
    </div>

    <section class="section" style="margin-top: 0.5rem">
      <header class="section-header">
        <h1 class="section-title">Acervo de espécies</h1>
        <p class="section-subtitle">
          Busque por nome, código, família ou origem. Os resultados são atualizados em tempo real.
        </p>
      </header>

      <div class="toolbar panel">
        <label>
          <span class="field-label">Pesquisar</span>
          <input
            v-model="search"
            class="input"
            placeholder="Ex.: ipe, anacardiaceae, 01048"
            type="search"
          />
        </label>

        <label>
          <span class="field-label">Família</span>
          <select v-model="family" class="select">
            <option value="">Todas</option>
            <option v-for="item in families" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <label>
          <span class="field-label">Tipo</span>
          <select v-model="type" class="select">
            <option value="">Todos</option>
            <option v-for="item in types" :key="item" :value="item">{{ item }}</option>
          </select>
        </label>

        <button class="btn btn-secondary" type="button" @click="clearFilters">Limpar filtros</button>
      </div>

      <div class="section">
        <div v-if="refreshing" class="state-box state-loading" style="margin-bottom: 0.7rem">
          Atualizando dados do acervo...
        </div>
        <div v-if="cacheNotice" class="state-box state-loading" style="margin-bottom: 0.7rem">
          {{ cacheNotice }}
        </div>
        <div v-if="error" class="state-box state-error">{{ error }}</div>
        <template v-else>
          <p class="section-subtitle" style="margin-bottom: 0.8rem">
            {{ filteredPlants.length }} registro(s) encontrado(s)
          </p>

          <div v-if="filteredPlants.length" class="grid-cards">
            <RouterLink
              v-for="plant in filteredPlants"
              :key="plant.id"
              :to="{ name: 'species-details', params: { id: plant.id } }"
              class="card"
              style="text-decoration: none"
            >
              <h3>{{ plant.commonName || 'Sem nome popular' }}</h3>
              <p><strong>Científíco:</strong> {{ plant.scientificName || 'Não informado' }}</p>
              <p><strong>Código:</strong> {{ plant.code || plant.id }}</p>
              <p><strong>Família:</strong> {{ plant.family || 'Não informada' }}</p>
              <div class="tag-row" style="margin-top: 0.6rem">
                <span class="tag">{{ plant.type || 'Tipo não informado' }}</span>
                <span class="tag">{{ plant.origin || 'Origem não informada' }}</span>
              </div>
            </RouterLink>
          </div>

          <div v-else class="empty-state">
            Nenhum resultado para os filtros atuais. Tente remover filtros ou usar outro termo.
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { fetchPlants } from '../services/plantsRepository'

const loading = ref(true)
const refreshing = ref(false)
const loadingMessage = ref('')
const error = ref('')
const cacheNotice = ref('')
const plants = ref([])

const search = ref('')
const family = ref('')
const type = ref('')

const normalizedSearch = computed(() =>
  search.value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
)

const families = computed(() => {
  const values = new Set(plants.value.map((item) => item.family).filter(Boolean))
  return [...values].sort((a, b) => a.localeCompare(b))
})

const types = computed(() => {
  const values = new Set(plants.value.map((item) => item.type).filter(Boolean))
  return [...values].sort((a, b) => a.localeCompare(b))
})

const filteredPlants = computed(() => {
  return plants.value.filter((plant) => {
    if (family.value && plant.family !== family.value) {
      return false
    }

    if (type.value && plant.type !== type.value) {
      return false
    }

    if (!normalizedSearch.value) {
      return true
    }

    const haystack = [
      plant.id,
      plant.code,
      plant.commonName,
      plant.scientificName,
      plant.family,
      plant.origin,
      plant.type,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    return haystack.includes(normalizedSearch.value)
  })
})

const loadingOverlayVisible = computed(() => loading.value && !plants.value.length)

function clearFilters() {
  search.value = ''
  family.value = ''
  type.value = ''
}

async function loadPlants() {
  loading.value = true
  refreshing.value = false
  loadingMessage.value = 'Lendo dados salvos localmente...'
  error.value = ''
  cacheNotice.value = ''

  try {
    const cachedPlants = await fetchPlants({}, { preferCache: true, allowStaleCache: true })

    if (cachedPlants.length) {
      plants.value = cachedPlants
      loading.value = false
      refreshing.value = true
      loadingMessage.value = 'Atualizando dados do servidor...'
    }

    const freshPlants = await fetchPlants({}, { forceRefresh: true })
    plants.value = freshPlants
  } catch (err) {
    if (plants.value.length) {
      cacheNotice.value = 'Sem conexao no momento. Exibindo dados em cache.'
    } else {
      error.value = err instanceof Error ? err.message : 'Falha ao carregar o acervo.'
    }
  } finally {
    loading.value = false
    refreshing.value = false
    loadingMessage.value = ''
  }
}

onMounted(loadPlants)
</script>
