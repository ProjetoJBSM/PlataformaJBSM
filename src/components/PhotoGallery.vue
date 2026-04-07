<template>
  <div class="photo-gallery">
    <div
      class="gallery-container"
      @click="openGallery(previewPhotoIndex)"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <img
        v-if="mainPhotoPreview"
        :src="mainPhotoPreview"
        :alt="alt"
        loading="lazy"
        class="gallery-main"
      />
      <div v-else class="gallery-placeholder">Sem foto</div>

      <button
        v-if="photos.length > 1"
        type="button"
        class="gallery-side-btn left"
        aria-label="Foto anterior"
        @click.stop="previousPreview"
      >
        &lt;
      </button>
      <button
        v-if="photos.length > 1"
        type="button"
        class="gallery-side-btn right"
        aria-label="Proxima foto"
        @click.stop="nextPreview"
      >
        &gt;
      </button>

      <div v-if="photos.length > 1" class="gallery-badge">
        {{ previewPhotoIndex + 1 }} / {{ photos.length }}
      </div>
    </div>

    <details class="gallery-thumbs-details" v-if="photos.length > 1">
      <summary>Ver {{ photos.length }} fotos</summary>
      <div class="gallery-thumbs">
        <button
          v-for="(photo, idx) in photos"
          :key="idx"
          type="button"
          class="gallery-thumb"
          :class="{ active: idx === previewPhotoIndex }"
          :aria-label="`Foto ${idx + 1}`"
          @click.prevent="setPreviewIndex(idx)"
        >
          <img :src="getThumbSrc(photo)" :alt="`${alt} - foto ${idx + 1}`" loading="lazy" />
        </button>
      </div>
    </details>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="galleryOpen" class="gallery-modal-overlay" @click="closeGallery">
          <div class="gallery-modal" @click.stop>
            <button class="modal-close" type="button" @click="closeGallery" aria-label="Fechar">×</button>

            <button
              v-if="photos.length > 1"
              type="button"
              class="modal-side-btn modal-side-btn-left"
              aria-label="Foto anterior"
              @click.stop="previousPhoto"
            >
              &lt;
            </button>
            <button
              v-if="photos.length > 1"
              type="button"
              class="modal-side-btn modal-side-btn-right"
              aria-label="Proxima foto"
              @click.stop="nextPhoto"
            >
              &gt;
            </button>

            <div class="modal-content">
              <img
                :src="getModalSrc(photos[currentPhotoIndex])"
                :alt="`${alt} - foto ${currentPhotoIndex + 1}`"
              />
            </div>

            <div v-if="photos.length > 1" class="modal-info">
              Foto {{ currentPhotoIndex + 1 }} de {{ photos.length }}
            </div>

            <div v-if="photos.length > 1" class="modal-thumbnails">
              <button
                v-for="(photo, idx) in photos"
                :key="idx"
                type="button"
                class="modal-thumb"
                :class="{ active: idx === currentPhotoIndex }"
                @click="setCurrentIndex(idx)"
                :aria-label="`Foto ${idx + 1}`"
              >
                <img :src="getThumbSrc(photo)" :alt="`${alt} - thumbnail ${idx + 1}`" loading="lazy" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  photos: {
    type: Array,
    default: () => [],
  },
  alt: {
    type: String,
    default: 'Galeria de fotos',
  },
})

const galleryOpen = ref(false)
const currentPhotoIndex = ref(0)
const previewPhotoIndex = ref(0)
const touchStartX = ref(null)
const ignoreNextOpen = ref(false)
const mainPhotoPreview = computed(() => getPreviewSrc(props.photos?.[previewPhotoIndex.value]))

function getPreviewSrc(photo) {
  if (!photo) {
    return ''
  }

  if (typeof photo === 'string') {
    return photo
  }

  return photo.preview || photo.low || photo.medium || photo.high || photo.modal || photo.thumb || ''
}

function getModalSrc(photo) {
  if (!photo) {
    return ''
  }

  if (typeof photo === 'string') {
    return photo
  }

  return photo.modal || photo.high || photo.medium || photo.low || photo.preview || photo.thumb || ''
}

function getThumbSrc(photo) {
  if (!photo) {
    return ''
  }

  if (typeof photo === 'string') {
    return photo
  }

  return photo.thumb || photo.preview || photo.low || photo.medium || photo.high || photo.modal || ''
}

function openGallery(index) {
  if (ignoreNextOpen.value) {
    ignoreNextOpen.value = false
    return
  }

  if (!getModalSrc(props.photos?.[index])) {
    return
  }

  currentPhotoIndex.value = index
  previewPhotoIndex.value = index
  galleryOpen.value = true
}

function closeGallery() {
  galleryOpen.value = false
}

function nextPhoto() {
  currentPhotoIndex.value = (currentPhotoIndex.value + 1) % (props.photos?.length || 1)
  previewPhotoIndex.value = currentPhotoIndex.value
}

function previousPhoto() {
  const length = props.photos?.length || 1
  currentPhotoIndex.value = (currentPhotoIndex.value - 1 + length) % length
  previewPhotoIndex.value = currentPhotoIndex.value
}

function setCurrentIndex(index) {
  currentPhotoIndex.value = index
  previewPhotoIndex.value = index
}

function setPreviewIndex(index) {
  previewPhotoIndex.value = index
}

function nextPreview() {
  previewPhotoIndex.value = (previewPhotoIndex.value + 1) % (props.photos?.length || 1)
}

function previousPreview() {
  const length = props.photos?.length || 1
  previewPhotoIndex.value = (previewPhotoIndex.value - 1 + length) % length
}

function handleTouchStart(event) {
  if (!props.photos?.length) {
    return
  }

  touchStartX.value = event.changedTouches?.[0]?.clientX ?? null
}

function handleTouchEnd(event) {
  if (!props.photos?.length || touchStartX.value === null) {
    return
  }

  const touchEndX = event.changedTouches?.[0]?.clientX
  if (typeof touchEndX !== 'number') {
    touchStartX.value = null
    return
  }

  const deltaX = touchEndX - touchStartX.value
  const swipeThreshold = 42

  if (deltaX >= swipeThreshold) {
    ignoreNextOpen.value = true
    previousPreview()
  } else if (deltaX <= -swipeThreshold) {
    ignoreNextOpen.value = true
    nextPreview()
  }

  touchStartX.value = null
}

watch(galleryOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

watch(
  () => props.photos?.length || 0,
  (length) => {
    if (!length) {
      previewPhotoIndex.value = 0
      currentPhotoIndex.value = 0
      return
    }

    if (previewPhotoIndex.value >= length) {
      previewPhotoIndex.value = 0
    }

    if (currentPhotoIndex.value >= length) {
      currentPhotoIndex.value = previewPhotoIndex.value
    }
  }
)

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.photo-gallery {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.gallery-container {
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: linear-gradient(180deg, #d8e6cf, #f2f5ed);
  aspect-ratio: 1;
  cursor: pointer;
  transition: box-shadow 0.2s ease;
  border: 1px solid rgba(77, 99, 57, 0.2);
}

.gallery-container:hover {
  box-shadow: 0 8px 24px rgba(77, 99, 57, 0.15);
}

.gallery-main {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-side-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(24, 36, 24, 0.5);
  color: white;
  font-size: 1.2rem;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 4;
}

.gallery-side-btn.left {
  left: 0.6rem;
}

.gallery-side-btn.right {
  right: 0.6rem;
}

.gallery-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--muted);
  font-size: 0.95rem;
}

.gallery-badge {
  position: absolute;
  bottom: 0.8rem;
  right: 0.8rem;
  background: rgba(31, 50, 32, 0.85);
  color: white;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.gallery-thumbs-details {
  margin-top: 0.3rem;
}

.gallery-thumbs-details summary {
  padding: 0.6rem;
  border-radius: var(--radius-sm);
  background: rgba(183, 205, 169, 0.2);
  border: 1px solid rgba(77, 99, 57, 0.15);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  user-select: none;
  list-style: none;
}

.gallery-thumbs-details summary:hover {
  background: rgba(183, 205, 169, 0.3);
}

.gallery-thumbs-details[open] summary {
  margin-bottom: 0.6rem;
}

.gallery-thumbs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
}

.gallery-thumb {
  border: none;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  aspect-ratio: 1;
  padding: 0;
  transition: transform 0.15s ease;
  border: 2px solid rgba(77, 99, 57, 0.15);
}

.gallery-thumb:hover {
  transform: scale(1.05);
  border-color: rgba(77, 99, 57, 0.4);
}

.gallery-thumb.active {
  border-color: rgba(77, 99, 57, 0.6);
}

.gallery-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.gallery-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.92);
  z-index: 9999;
  display: flex;
  align-items: stretch;
  justify-content: center;
}

.gallery-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  position: relative;
  overflow: auto;
  padding: 5.2rem 1.2rem 1rem;
}

.modal-side-btn {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.45);
  background: rgba(12, 18, 13, 0.45);
  color: white;
  font-size: 1.5rem;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  z-index: 10001;
}

.modal-side-btn-left {
  left: max(0.7rem, env(safe-area-inset-left));
}

.modal-side-btn-right {
  right: max(0.7rem, env(safe-area-inset-right));
}

.modal-close {
  position: fixed;
  top: max(1rem, env(safe-area-inset-top));
  right: max(1rem, env(safe-area-inset-right));
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  z-index: 10000;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.modal-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  min-height: 300px;
}

.modal-content img {
  max-width: 88vw;
  max-height: 82vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.modal-info {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  padding: 0 1rem;
}

.modal-thumbnails {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  justify-content: center;
}

.modal-thumb {
  flex: 0 0 auto;
  width: 70px;
  height: 70px;
  border-radius: var(--radius-sm);
  border: 2px solid rgba(255, 255, 255, 0.2);
  padding: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.modal-thumb.active {
  border-color: #b7cda9;
}

.modal-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 600px) {
  .gallery-side-btn {
    width: 38px;
    height: 38px;
  }

  .modal-side-btn {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }

  .modal-content {
    padding: 1rem 2.8rem;
  }

  .modal-content img {
    max-width: 100%;
    max-height: 68vh;
  }

  .gallery-container {
    aspect-ratio: 3 / 4;
  }
}
</style>
