<template>
  <div class="container fade-up">
    <div v-if="loading" class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-dialog">
        <div class="spinner" aria-hidden="true"></div>
        <strong>Carregando espécie</strong>
        <p>Buscando fotos e informações da planta.</p>
      </div>
    </div>

    <section class="section" style="margin-top: 0.5rem">
      <RouterLink class="btn btn-secondary" to="/acervo">Voltar ao acervo</RouterLink>

      <div v-if="error" class="state-box state-error" style="margin-top: 1rem">{{ error }}</div>
      <div v-else-if="!loading && !plant" class="empty-state" style="margin-top: 1rem">
        Espécie não encontrada.
      </div>

      <article v-else-if="!loading" class="section" style="margin-top: 1rem">
        <div class="detail-grid">
          <div class="detail-left">
            <PhotoGallery
              :photos="galleryPhotos"
              :alt="plant.commonName || plant.scientificName"
            />
          </div>

          <div class="detail-right">
            <div class="panel">
              <h1>{{ plant.commonName || 'Sem nome popular' }}</h1>
              <p style="margin-top: 0.35rem; color: var(--muted)">
                {{ plant.scientificName || 'Nome científíco não informado' }}
              </p>

              <div class="tag-row" style="margin-top: 0.75rem">
                <span class="tag">{{ plant.type || 'Tipo não informado' }}</span>
                <span class="tag">{{ plant.family || 'Família não informada' }}</span>
                <span class="tag">{{ profileLabel }}</span>
              </div>

              <p style="margin-top: 0.9rem">{{ plant.description || 'Sem descrição cadastrada.' }}</p>

              <dl class="meta-list" style="margin-top: 1rem">
                <div class="meta-item">
                  <dt class="meta-label">Código</dt>
                  <dd>{{ plant.code || plant.id }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Origem</dt>
                  <dd>{{ plant.origin || 'Não informada' }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Localização no jardim</dt>
                  <dd>{{ plant.location || 'Não informada' }}</dd>
                </div>
                <div class="meta-item">
                  <dt class="meta-label">Observacoes</dt>
                  <dd>{{ plant.curatorNotes || 'Sem observações' }}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div v-if="hasMapCoordinates" style="margin-top: 1.5rem">
          <LocationMap
            v-if="showMap"
            :latitude="mapLatitude"
            :longitude="mapLongitude"
            :plant-name="plant.commonName || plant.scientificName"
          />
          <div v-else class="map-deferred-placeholder">Carregando mapa...</div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useConnectionProfile } from '../composables/useConnectionProfile'
import { getPlantById } from '../services/plantsRepository'
import PhotoGallery from '../components/PhotoGallery.vue'

const LocationMap = defineAsyncComponent(() => import('../components/LocationMap.vue'))

const route = useRoute()
const { profileLabel, preferredImageVariant } = useConnectionProfile()

const loading = ref(true)
const error = ref('')
const plant = ref(null)
const showMap = ref(false)
let mapIdleHandle = null
let mapDelayTimer = null

function parseCoordinate(value) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const mapLatitude = computed(() => parseCoordinate(plant.value?.geoLocation?.latitude))
const mapLongitude = computed(() => parseCoordinate(plant.value?.geoLocation?.longitude))
const hasMapCoordinates = computed(() => mapLatitude.value !== null && mapLongitude.value !== null)

const modalImageVariant = computed(() => {
  return preferredImageVariant.value === 'high' ? 'high' : 'medium'
})

const galleryPhotos = computed(() => {
  if (!plant.value?.images) {
    return []
  }

  return plant.value.images
    .map((img) => {
      if (typeof img === 'string') {
        return {
          preview: img,
          thumb: img,
          modal: img,
        }
      }

      return {
        preview: img.low || img.medium || img.high,
        thumb: img.low || img.medium || img.high,
        modal: img[modalImageVariant.value] || img.high || img.medium || img.low,
      }
    })
    .filter((img) => Boolean(img.preview || img.modal))
})

async function loadPlant() {
  loading.value = true
  error.value = ''
  showMap.value = false

  try {
    plant.value = await getPlantById(route.params.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar espécie.'
  } finally {
    loading.value = false
    scheduleMapMount()
  }
}

function clearMapSchedule() {
  if (typeof window === 'undefined') {
    return
  }

  if (mapDelayTimer !== null) {
    window.clearTimeout(mapDelayTimer)
    mapDelayTimer = null
  }

  if (mapIdleHandle !== null && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(mapIdleHandle)
    mapIdleHandle = null
  }
}

function scheduleMapMount() {
  clearMapSchedule()

  if (typeof window === 'undefined' || !hasMapCoordinates.value) {
    showMap.value = false
    return
  }

  const mountMap = () => {
    showMap.value = true
  }

  if (typeof window.requestIdleCallback === 'function') {
    mapIdleHandle = window.requestIdleCallback(mountMap, { timeout: 2200 })
    return
  }

  mapDelayTimer = window.setTimeout(mountMap, 600)
}

onMounted(loadPlant)

watch(
  () => route.params.id,
  () => {
    loadPlant()
  }
)

onBeforeUnmount(() => {
  clearMapSchedule()
})
</script>

<style scoped>
.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.detail-left {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-right {
  min-width: 0;
}

.map-deferred-placeholder {
  height: 260px;
  border-radius: var(--radius-md);
  border: 1px dashed rgba(77, 99, 57, 0.28);
  background: linear-gradient(180deg, #f2f5ed, #e8f0e0);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
}

@media (max-width: 960px) {
  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-left {
    width: 100%;
  }

  .map-deferred-placeholder {
    height: 220px;
  }
}
</style>
