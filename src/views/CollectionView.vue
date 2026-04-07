<template>
  <div class="container fade-up">
    <section class="section" style="margin-top: 0.5rem">
      <header class="section-header">
        <h1 class="section-title">Acervo de especies</h1>
        <p class="section-subtitle">
          Busque por nome, codigo, familia ou origem. Os resultados sao atualizados em tempo real.
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
          <span class="field-label">Familia</span>
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
        <div v-if="loading" class="state-box state-loading">Carregando acervo...</div>
        <div v-else-if="error" class="state-box state-error">{{ error }}</div>
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
              <p><strong>Cientifico:</strong> {{ plant.scientificName || 'Nao informado' }}</p>
              <p><strong>Codigo:</strong> {{ plant.code || plant.id }}</p>
              <p><strong>Familia:</strong> {{ plant.family || 'Nao informada' }}</p>
              <div class="tag-row" style="margin-top: 0.6rem">
                <span class="tag">{{ plant.type || 'Tipo nao informado' }}</span>
                <span class="tag">{{ plant.origin || 'Origem nao informada' }}</span>
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
const error = ref('')
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

function clearFilters() {
  search.value = ''
  family.value = ''
  type.value = ''
}

async function loadPlants() {
  loading.value = true
  error.value = ''

  try {
    plants.value = await fetchPlants()
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar o acervo.'
  } finally {
    loading.value = false
  }
}

onMounted(loadPlants)
</script>
