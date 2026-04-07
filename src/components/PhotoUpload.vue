<template>
  <div class="photo-upload-container">
    <div v-if="isProcessing" class="upload-processing-overlay" role="status" aria-live="polite">
      <div class="upload-processing-card">
        <div class="spinner" aria-hidden="true"></div>
        <strong>Processando fotos...</strong>
        <p>{{ processingMessage }}</p>
      </div>
    </div>

    <div
      class="upload-area"
      @dragenter.prevent="dragover = true"
      @dragover.prevent="dragover = true"
      @dragleave.prevent="dragover = false"
      @drop.prevent="handleDrop"
      :class="{ dragover }"
    >
      <input
        ref="fileInputRef"
        type="file"
        multiple
        accept="image/*"
        style="display: none"
        @change="handleFileSelect"
      />

      <button type="button" class="upload-button" @click="$refs.fileInputRef?.click()">
        + Adicionar fotos
      </button>
      <p class="upload-hint">ou arraste fotos aqui (maximo: {{ MAX_PHOTOS }})</p>
      <p class="upload-counter">Total atual: {{ totalPhotosCount }}/{{ MAX_PHOTOS }}</p>
    </div>

    <div v-if="existingPhotos.length" class="uploaded-photos">
      <h4>Fotos ja vinculadas ao registro ({{ existingPhotos.length }})</h4>

      <div class="photo-list">
        <div v-for="(photo, idx) in existingPhotos" :key="photo.id" class="photo-item">
          <img :src="photo.preview" :alt="`Foto vinculada ${idx + 1}`" class="photo-thumb" />

          <div class="photo-info">
            <p class="photo-name">{{ photo.label }}</p>
            <p class="photo-size">Foto ja salva no banco</p>
            <span class="photo-chip">Existente</span>
          </div>

          <button type="button" class="remove-btn" @click="removeExistingPhoto(idx)" aria-label="Remover">
            ×
          </button>
        </div>
      </div>
    </div>

    <div v-if="uploadedPhotos.length" class="uploaded-photos">
      <h4>Novas fotos selecionadas ({{ uploadedPhotos.length }})</h4>

      <div class="photo-list">
        <div v-for="(photo, idx) in uploadedPhotos" :key="idx" class="photo-item">
          <img :src="photo.preview" :alt="`Foto ${idx + 1}`" class="photo-thumb" />

          <div class="photo-info">
            <p class="photo-name">{{ photo.file.name }}</p>
            <p class="photo-size">{{ formatFileSize(photo.file.size) }}</p>

            <div v-if="photo.exif.hasExif" class="exif-info">
              <strong>Metadados EXIF detectados:</strong>
              <ul>
                <li v-if="isFiniteNumber(photo.exif.latitude)">Latitude: {{ photo.exif.latitude.toFixed(6) }}</li>
                <li v-if="isFiniteNumber(photo.exif.longitude)">Longitude: {{ photo.exif.longitude.toFixed(6) }}</li>
                <li v-if="isFiniteNumber(photo.exif.altitude)">Altitude: {{ photo.exif.altitude.toFixed(2) }}m</li>
                <li v-if="photo.exif.datetime">Data/Hora: {{ photo.exif.datetime }}</li>
              </ul>

              <label v-if="isFiniteNumber(photo.exif.latitude) && isFiniteNumber(photo.exif.longitude)" class="checkbox-label">
                <input
                  type="checkbox"
                  v-model="photo.exif.useLocation"
                  @change="onExifToggle(idx)"
                />
                Usar geolocalização da foto
              </label>
            </div>

            <div v-else class="no-exif">Sem metadados EXIF de localização</div>
          </div>

          <span class="photo-chip new">Nova</span>

          <button type="button" class="remove-btn" @click="removePhoto(idx)" aria-label="Remover">
            ×
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="upload-error">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { extractExifFromFile } from '../services/exifExtractor'

const emit = defineEmits(['photos-selected', 'photos-changed', 'geolocation-detected'])
const MAX_PHOTOS = 10

const fileInputRef = ref(null)
const dragover = ref(false)
const existingPhotos = ref([])
const uploadedPhotos = ref([])
const error = ref('')
const processingMessage = ref('')
const isProcessing = computed(() => Boolean(processingMessage.value))
const totalPhotosCount = computed(() => existingPhotos.value.length + uploadedPhotos.value.length)

async function handleFileSelect(event) {
  const files = event.target.files
  if (files) {
    await processFiles(Array.from(files))
  }
}

function handleDrop(event) {
  dragover.value = false
  const files = event.dataTransfer?.files
  if (files) {
    processFiles(Array.from(files))
  }
}

async function processFiles(files) {
  error.value = ''

  if (!files?.length) {
    return
  }

  const validFiles = files.filter((f) => f.type.startsWith('image/'))

  if (validFiles.length !== files.length) {
    error.value = `${files.length - validFiles.length} arquivo(s) nao sao imagens e foram ignorados.`
  }

  const availableSlots = Math.max(0, MAX_PHOTOS - totalPhotosCount.value)

  if (availableSlots <= 0) {
    error.value = `Limite maximo de ${MAX_PHOTOS} fotos atingido.`
    return
  }

  const acceptedFiles = validFiles.slice(0, availableSlots)
  if (validFiles.length > acceptedFiles.length) {
    const ignored = validFiles.length - acceptedFiles.length
    error.value = `${error.value ? `${error.value} ` : ''}${ignored} foto(s) excederam o limite de ${MAX_PHOTOS} e foram ignoradas.`
  }

  processingMessage.value = 'Lendo arquivos e metadados EXIF...'

  try {
    for (let index = 0; index < acceptedFiles.length; index += 1) {
      const file = acceptedFiles[index]

      try {
        processingMessage.value = `Processando foto ${index + 1} de ${acceptedFiles.length}: ${file.name}`
        const preview = await createPreview(file)
        const exif = await extractExifFromFile(file)
        const hasCoordinates = isFiniteNumber(exif.latitude) && isFiniteNumber(exif.longitude)

        uploadedPhotos.value.push({
          file,
          preview,
          exif: {
            ...exif,
            hasExif: hasCoordinates,
            useLocation: hasCoordinates,
          },
        })

        if (hasCoordinates) {
          emit('geolocation-detected', {
            index,
            latitude: exif.latitude,
            longitude: exif.longitude,
          })
        }
      } catch (err) {
        console.error(`Erro ao processar ${file.name}:`, err)
      }
    }

    emitPhotosChanged()
  } finally {
    processingMessage.value = ''
  }
}

async function createPreview(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result)
    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}

function removePhoto(idx) {
  uploadedPhotos.value.splice(idx, 1)
  emitPhotosChanged()
}

function removeExistingPhoto(idx) {
  existingPhotos.value.splice(idx, 1)
  emitPhotosChanged()
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function onExifToggle(idx) {
  const photo = uploadedPhotos.value[idx]
  if (
    photo?.exif?.useLocation &&
    isFiniteNumber(photo?.exif?.latitude) &&
    isFiniteNumber(photo?.exif?.longitude)
  ) {
    emit('geolocation-detected', {
      index: idx,
      latitude: photo.exif.latitude,
      longitude: photo.exif.longitude,
    })
  }
}

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function getImagePreview(image) {
  if (!image) {
    return ''
  }

  if (typeof image === 'string') {
    return image
  }

  return image.low || image.medium || image.high || image.url || ''
}

function getImageId(image, index) {
  if (!image) {
    return `img-${index}`
  }

  if (typeof image === 'string') {
    return image
  }

  return (
    image.lowPath ||
    image.mediumPath ||
    image.highPath ||
    image.high ||
    image.medium ||
    image.low ||
    `img-${index}`
  )
}

function normalizeExistingPhotos(images = []) {
  return (images || [])
    .map((image, index) => {
      const preview = getImagePreview(image)
      if (!preview) {
        return null
      }

      return {
        id: getImageId(image, index),
        image,
        preview,
        label: typeof image === 'string' ? `Foto ${index + 1}` : image.alt || `Foto ${index + 1}`,
      }
    })
    .filter(Boolean)
}

function getPhotosPayload() {
  return [
    ...existingPhotos.value.map((item) => ({
      kind: 'existing',
      id: item.id,
      image: item.image,
    })),
    ...uploadedPhotos.value.map((item) => ({
      kind: 'new',
      file: item.file,
      preview: item.preview,
      exif: item.exif,
    })),
  ]
}

function getPhotoSnapshot() {
  return getPhotosPayload().map((item) => {
    if (item.kind === 'existing') {
      return `existing:${item.id}`
    }

    return `new:${item.file.name}:${item.file.size}:${item.file.lastModified}`
  })
}

function emitPhotosChanged() {
  emit('photos-selected', getPhotosPayload())
  emit('photos-changed', getPhotoSnapshot())
}

defineExpose({
  getPhotos: () => getPhotosPayload(),
  getSnapshot: () => getPhotoSnapshot(),
  setExistingPhotos: (images = []) => {
    existingPhotos.value = normalizeExistingPhotos(images)
    uploadedPhotos.value = []
    error.value = ''
    emitPhotosChanged()

    const firstExistingGeo = existingPhotos.value.find((item) => {
      const image = item.image
      return (
        image &&
        typeof image === 'object' &&
        Number.isFinite(image.geoLocation?.latitude) &&
        Number.isFinite(image.geoLocation?.longitude)
      )
    })

    if (firstExistingGeo) {
      emit('geolocation-detected', {
        index: 0,
        latitude: firstExistingGeo.image.geoLocation.latitude,
        longitude: firstExistingGeo.image.geoLocation.longitude,
      })
    }
  },
  clear: () => {
    existingPhotos.value = []
    uploadedPhotos.value = []
    error.value = ''
    emitPhotosChanged()
  },
})
</script>

<style scoped>
.photo-upload-container {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.upload-processing-overlay {
  position: absolute;
  inset: 0;
  background: rgba(24, 36, 24, 0.52);
  border-radius: var(--radius-md);
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.upload-processing-card {
  width: min(360px, 100%);
  border-radius: var(--radius-md);
  background: white;
  border: 1px solid rgba(77, 99, 57, 0.22);
  box-shadow: var(--shadow-soft);
  padding: 1rem;
  text-align: center;
  display: grid;
  gap: 0.5rem;
  place-items: center;
}

.upload-processing-card strong {
  color: var(--green-900);
}

.upload-processing-card p {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.upload-area {
  border: 2px dashed rgba(77, 99, 57, 0.3);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  text-align: center;
  transition: all 0.2s ease;
  cursor: pointer;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: rgba(77, 99, 57, 0.6);
  background: rgba(183, 205, 169, 0.1);
}

.upload-button {
  background: rgba(77, 99, 57, 0.1);
  border: 1px solid rgba(77, 99, 57, 0.25);
  color: var(--green-900);
  padding: 0.75rem 1.2rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.upload-button:hover {
  background: rgba(77, 99, 57, 0.2);
  border-color: rgba(77, 99, 57, 0.4);
}

.upload-hint {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 0.9rem;
}

.upload-counter {
  margin-top: 0.35rem;
  color: var(--green-700);
  font-size: 0.86rem;
  font-weight: 600;
}

.uploaded-photos {
  border: 1px solid rgba(77, 99, 57, 0.15);
  border-radius: var(--radius-md);
  padding: 1rem;
  background: rgba(183, 205, 169, 0.05);
}

.uploaded-photos h4 {
  margin: 0 0 0.8rem 0;
  color: var(--green-900);
  font-size: 0.95rem;
}

.photo-list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.photo-item {
  display: flex;
  gap: 0.8rem;
  align-items: flex-start;
  padding: 0.8rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(77, 99, 57, 0.1);
  position: relative;
}

.photo-thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.photo-info {
  flex: 1;
  min-width: 0;
}

.photo-name {
  margin: 0;
  font-weight: 600;
  color: var(--ink);
  word-break: break-word;
}

.photo-size {
  margin: 0.2rem 0 0 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.photo-chip {
  display: inline-flex;
  margin-top: 0.5rem;
  padding: 0.16rem 0.52rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  background: rgba(52, 80, 51, 0.14);
  color: var(--green-900);
}

.photo-chip.new {
  background: rgba(77, 99, 57, 0.14);
}

.exif-info {
  margin-top: 0.6rem;
  padding: 0.6rem;
  background: rgba(183, 205, 169, 0.2);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
}

.exif-info strong {
  display: block;
  color: var(--green-900);
  margin-bottom: 0.4rem;
}

.exif-info ul {
  margin: 0;
  padding-left: 1.2rem;
  color: var(--muted);
}

.exif-info li {
  margin: 0.2rem 0;
}

.checkbox-label {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  margin-top: 0.4rem;
  cursor: pointer;
  color: var(--green-900);
  font-weight: 600;
}

.checkbox-label input {
  cursor: pointer;
}

.no-exif {
  margin-top: 0.6rem;
  padding: 0.6rem;
  background: rgba(155, 67, 54, 0.08);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  color: var(--muted);
}

.remove-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(155, 67, 54, 0.1);
  color: var(--danger);
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-btn:hover {
  background: rgba(155, 67, 54, 0.2);
}

.upload-error {
  padding: 0.75rem;
  background: rgba(155, 67, 54, 0.12);
  border: 1px solid rgba(155, 67, 54, 0.3);
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 0.9rem;
}
</style>
