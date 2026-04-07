<template>
  <div class="container fade-up">
    <section class="section" style="margin-top: 0.5rem">
      <RouterLink class="btn btn-secondary" to="/acervo">Voltar ao acervo</RouterLink>

      <div v-if="loading" class="state-box state-loading" style="margin-top: 1rem">
        Carregando especie...
      </div>
      <div v-else-if="error" class="state-box state-error" style="margin-top: 1rem">{{ error }}</div>
      <div v-else-if="!plant" class="empty-state" style="margin-top: 1rem">
        Especie nao encontrada.
      </div>

      <article v-else class="section" style="margin-top: 1rem">
        <div class="detail-grid">
          <div class="detail-left">
            <PhotoGallery
              :photos="coverImages"
              :alt="plant.commonName || plant.scientificName"
            />
          </div>

          <div class="detail-right">
            <div class="panel">
              <h1>{{ plant.commonName || 'Sem nome popular' }}</h1>
              <p style="margin-top: 0.35rem; color: var(--muted)">
                {{ plant.scientificName || 'Nome cientifico nao informado' }}
              </p>

              <div class="tag-row" style="margin-top: 0.75rem">
                <span class="tag">{{ plant.type || 'Tipo nao informado' }}</span>
                <span class="tag">{{ plant.family || 'Familia nao informada' }}</span>
                <span class="tag">{{ profileLabel }}</span>
              </div>

              <p style="margin-top: 0.9rem">{{ plant.description || 'Sem descricao cadastrada.' }}</p>

              <dl class="meta-list" style="margin-top: 1rem">
                <div class="meta-item">
                  <dt class="meta-label">Codigo</dt>
                  <dd>{{ plant.code || plant.id }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Origem</dt>
                  <dd>{{ plant.origin || 'Nao informada' }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Localizacao no jardim</dt>
                  <dd>{{ plant.location || 'Nao informada' }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Observacoes</dt>
                  <dd>{{ plant.curatorNotes || 'Sem observacoes' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <LocationMap
          :latitude="plant.geoLocation?.latitude"
          :longitude="plant.geoLocation?.longitude"
          :plant-name="plant.commonName || plant.scientificName"
          style="margin-top: 1.5rem"
        />
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useConnectionProfile } from '../composables/useConnectionProfile'
import { getPlantById } from '../services/plantsRepository'
import PhotoGallery from '../components/PhotoGallery.vue'
import LocationMap from '../components/LocationMap.vue'

const route = useRoute()
const { profileLabel, preferredImageVariant } = useConnectionProfile()

const loading = ref(true)
const error = ref('')
const plant = ref(null)

const coverImages = computed(() => {
  if (!plant.value?.images) {
    return []
  }

  return plant.value.images.map((img) => img[preferredImageVariant.value] || img.high || img.medium || img.low).filter(Boolean)
})

async function loadPlant() {
  loading.value = true
  error.value = ''

  try {
    plant.value = await getPlantById(route.params.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar especie.'
  } finally {
    loading.value = false
  }
}

onMounted(loadPlant)
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-left,
.detail-right {
  min-width: 0;
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
