<template>
  <div class="photo-upload-container">
    <div class="upload-area" @dragover.prevent @drop.prevent="handleDrop" :class="{ dragover }">
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
      <p class="upload-hint">ou arraste fotos aqui</p>
    </div>

    <div v-if="uploadedPhotos.length" class="uploaded-photos">
      <h4>{{ uploadedPhotos.length }} foto(s) selecionada(s)</h4>

      <div class="photo-list">
        <div v-for="(photo, idx) in uploadedPhotos" :key="idx" class="photo-item">
          <img :src="photo.preview" :alt="`Foto ${idx + 1}`" class="photo-thumb" />

          <div class="photo-info">
            <p class="photo-name">{{ photo.file.name }}</p>
            <p class="photo-size">{{ formatFileSize(photo.file.size) }}</p>

            <div v-if="photo.exif.hasExif" class="exif-info">
              <strong>Metadados EXIF detectados:</strong>
              <ul>
                <li v-if="photo.exif.latitude">Latitude: {{ photo.exif.latitude.toFixed(6) }}</li>
                <li v-if="photo.exif.longitude">Longitude: {{ photo.exif.longitude.toFixed(6) }}</li>
                <li v-if="photo.exif.altitude">Altitude: {{ photo.exif.altitude.toFixed(2) }}m</li>
                <li v-if="photo.exif.datetime">Data/Hora: {{ photo.exif.datetime }}</li>
              </ul>

              <label v-if="photo.exif.latitude && photo.exif.longitude" class="checkbox-label">
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
import { ref } from 'vue'
import { extractExifFromFile } from '../services/exifExtractor'

const emit = defineEmits(['photos-selected', 'geolocation-detected'])

const fileInputRef = ref(null)
const dragover = ref(false)
const uploadedPhotos = ref([])
const error = ref('')

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
  const validFiles = files.filter((f) => f.type.startsWith('image/'))

  if (validFiles.length !== files.length) {
    error.value = `${files.length - validFiles.length} arquivo(s) nao sao imagens e foram ignorados.`
  }

  for (const file of validFiles) {
    try {
      const preview = await createPreview(file)
      const exif = await extractExifFromFile(file)

      uploadedPhotos.value.push({
        file,
        preview,
        exif: {
          ...exif,
          useLocation: exif.hasExif,
        },
      })
    } catch (err) {
      console.error(`Erro ao processar ${file.name}:`, err)
    }
  }

  emit('photos-selected', uploadedPhotos.value)
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
  emit('photos-selected', uploadedPhotos.value)
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
  if (photo?.exif?.useLocation && photo?.exif?.latitude && photo?.exif?.longitude) {
    emit('geolocation-detected', {
      index: idx,
      latitude: photo.exif.latitude,
      longitude: photo.exif.longitude,
    })
  }
}

defineExpose({
  getPhotos: () => uploadedPhotos.value,
  clear: () => {
    uploadedPhotos.value = []
  },
})
</script>

<style scoped>
.photo-upload-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
