<template>
  <div class="location-map-container">
    <div class="map-header">
      <h3>Localização no Jardim</h3>
      <a
        v-if="latitude && longitude"
        :href="googleMapsUrl"
        target="_blank"
        rel="noreferrer"
        class="maps-link"
      >
        Abrir no Google Maps
      </a>
    </div>

    <div v-if="latitude && longitude" ref="mapContainer" class="map-container"></div>
    <div v-else class="map-placeholder">Localização nao disponivel</div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import L from 'leaflet'

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
let map = null

const googleMapsUrl = computed(() => {
  if (!props.latitude || !props.longitude) {
    return null
  }
  return `https://maps.google.com/?q=${props.latitude},${props.longitude}`
})

function initMap() {
  if (!mapContainer.value || !props.latitude || !props.longitude) {
    return
  }

  if (map) {
    map.remove()
    map = null
  }

  const lat = Number(props.latitude)
  const lng = Number(props.longitude)

  if (isNaN(lat) || isNaN(lng)) {
    return
  }

  map = L.map(mapContainer.value).setView([lat, lng], 18)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map)

  const marker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%231f3220"><path d="M12 0C7.58 0 4 3.58 4 8c0 5 8 16 8 16s8-11 8-16c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    }),
  }).addTo(map)

  marker.bindPopup(props.plantName)

  setTimeout(() => {
    if (map) {
      map.invalidateSize()
    }
  }, 100)
}

onMounted(() => {
  if (props.latitude && props.longitude) {
    initMap()
  }
})

watch([() => props.latitude, () => props.longitude], () => {
  if (props.latitude && props.longitude) {
    initMap()
  }
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
}

.map-placeholder {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  font-size: 0.95rem;
  background: linear-gradient(180deg, #f2f5ed, #e8f0e0);
}

@media (max-width: 600px) {
  .map-container {
    height: 240px;
  }

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
