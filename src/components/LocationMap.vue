<template>
  <div class="location-map-container">
    <div class="map-header">
      <h3>Localização no Jardim</h3>
      <a
        v-if="hasCoordinates"
        :href="googleMapsUrl"
        target="_blank"
        rel="noreferrer"
        class="maps-link"
      >
        Abrir no Google Maps
      </a>
    </div>

    <div v-if="hasCoordinates" ref="mapContainer" class="map-container">
      <div v-if="!mapReady" class="map-loading">Carregando mapa...</div>
    </div>
    <div v-else class="map-placeholder">Localização não disponível</div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  latitude: {
    type: [Number, String],
    default: null,
  },
  longitude: {
    type: [Number, String],
    default: null,
  },
  plantName: {
    type: String,
    default: 'Local da planta',
  },
})

const mapContainer = ref(null)
const mapReady = ref(false)

let map = null
let L = null
let mapInitScheduled = false
let mapInitTimer = null
let mapIdleHandle = null
let resizeObserver = null

const hasCoordinates = computed(() => {
  const lat = Number(props.latitude)
  const lng = Number(props.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng)
})

const googleMapsUrl = computed(() => {
  if (!hasCoordinates.value) {
    return null
  }

  return `https://maps.google.com/?q=${props.latitude},${props.longitude}`
})

function getCoords() {
  return {
    lat: Number(props.latitude),
    lng: Number(props.longitude),
  }
}

async function ensureLeafletLoaded() {
  if (L) {
    return L
  }

  await import('leaflet/dist/leaflet.css')
  const leafletModule = await import('leaflet')
  L = leafletModule.default
  return L
}

function clearMapInitSchedule() {
  if (typeof window === 'undefined') {
    return
  }

  if (mapInitTimer !== null) {
    window.clearTimeout(mapInitTimer)
    mapInitTimer = null
  }

  if (mapIdleHandle !== null && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(mapIdleHandle)
    mapIdleHandle = null
  }

  mapInitScheduled = false
}

function destroyMap() {
  clearMapInitSchedule()

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  if (map) {
    map.remove()
    map = null
  }

  mapReady.value = false
}

function setupResizeObserver() {
  if (typeof window === 'undefined' || !mapContainer.value || typeof ResizeObserver === 'undefined') {
    return
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
  }

  resizeObserver = new ResizeObserver(() => {
    if (map) {
      map.invalidateSize()
    }
  })

  resizeObserver.observe(mapContainer.value)
}

async function initMap() {
  if (!hasCoordinates.value || !mapContainer.value || map) {
    return
  }

  mapInitScheduled = false

  const { lat, lng } = getCoords()
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return
  }

  const Leaflet = await ensureLeafletLoaded()
  await nextTick()

  if (!mapContainer.value) {
    return
  }

  map = Leaflet.map(mapContainer.value, {
    zoomControl: true,
    attributionControl: true,
    scrollWheelZoom: false,
  }).setView([lat, lng], 18)

  Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  const marker = Leaflet.marker([lat, lng], {
    icon: Leaflet.divIcon({
      className: 'plant-pin-wrapper',
      html: '<span class="plant-pin-dot"></span>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
  }).addTo(map)

  marker.bindPopup(props.plantName)

  map.whenReady(() => {
    mapReady.value = true
    map.invalidateSize()
  })

  requestAnimationFrame(() => {
    if (map) {
      map.invalidateSize()
    }
  })

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 250)

  setupResizeObserver()
}

function scheduleMapInit() {
  if (!hasCoordinates.value || map || mapInitScheduled || typeof window === 'undefined') {
    return
  }

  mapInitScheduled = true

  const runInit = () => {
    void initMap()
  }

  if (typeof window.requestIdleCallback === 'function') {
    mapIdleHandle = window.requestIdleCallback(runInit, { timeout: 1800 })
    return
  }

  mapInitTimer = window.setTimeout(runInit, 500)
}

onMounted(() => {
  if (!hasCoordinates.value) {
    return
  }

  scheduleMapInit()
})

watch(
  () => [props.latitude, props.longitude],
  async () => {
    destroyMap()
    await nextTick()

    if (hasCoordinates.value) {
      scheduleMapInit()
    }
  }
)

onBeforeUnmount(() => {
  destroyMap()
})
</script>

<style scoped>
.location-map-container {
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid rgba(77, 99, 57, 0.2);
  background: var(--paper);
}

.map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem;
  background: rgba(183, 205, 169, 0.15);
  border-bottom: 1px solid rgba(77, 99, 57, 0.15);
}

.map-header h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--ink);
}

.maps-link {
  font-size: 0.85rem;
  color: var(--green-600);
  text-decoration: none;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  transition: background-color 0.2s ease;
}

.maps-link:hover {
  background: rgba(77, 99, 57, 0.1);
  text-decoration: underline;
}

:global(.leaflet-container) {
  background: #e8f0e0;
}

.map-container {
  height: 300px;
  width: 100%;
  position: relative;
}

.map-loading,
.map-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.95rem;
  background: linear-gradient(180deg, #f2f5ed, #e8f0e0);
}

:global(.plant-pin-wrapper) {
  background: transparent;
  border: none;
}

:global(.plant-pin-dot) {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #1f3220;
  border: 2px solid #f4f5ee;
  box-shadow: 0 0 0 3px rgba(31, 50, 32, 0.24);
  display: block;
}

@media (max-width: 600px) {
  .map-container,
  .map-loading,
  .map-placeholder {
    height: 240px;
  }

  .map-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>
