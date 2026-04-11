<template>
  <div class="photo-gallery">
    <div
      class="gallery-container"
      @click="openGallery(previewPhotoIndex)"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <div v-if="hasPhotos" class="gallery-track-wrap">
        <div class="gallery-track" :style="previewTrackStyle">
          <figure v-for="(_, idx) in photos" :key="`preview-${idx}`" class="gallery-slide">
            <img
              :src="getPreviewDisplay(idx)"
              :alt="`${alt} - foto ${idx + 1}`"
              loading="eager"
              class="gallery-main"
              draggable="false"
            />
          </figure>
        </div>
      </div>
      <div v-else class="gallery-placeholder">Sem foto</div>

      <button
        v-if="hasMultiplePhotos"
        type="button"
        class="gallery-side-btn left"
        aria-label="Foto anterior"
        @click.stop="previousPreview"
      >
        &lt;
      </button>
      <button
        v-if="hasMultiplePhotos"
        type="button"
        class="gallery-side-btn right"
        aria-label="Proxima foto"
        @click.stop="nextPreview"
      >
        &gt;
      </button>

      <div v-if="hasMultiplePhotos" class="gallery-badge">
        {{ previewPhotoIndex + 1 }} / {{ photos.length }}
      </div>
    </div>

    <div v-if="hasMultiplePhotos" class="gallery-thumbs-strip" aria-label="Miniaturas da galeria">
      <button
        v-for="(_, idx) in photos"
        :key="`thumb-${idx}`"
        type="button"
        class="gallery-thumb"
        :class="{ active: idx === previewPhotoIndex }"
        :aria-label="`Foto ${idx + 1}`"
        @click.prevent="setPreviewIndex(idx)"
      >
        <img :src="getThumbDisplay(idx)" :alt="`${alt} - foto ${idx + 1}`" loading="lazy" />
      </button>
    </div>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div
          v-if="galleryOpen"
          class="gallery-modal-overlay"
          @click="closeGallery"
          @touchmove="handleOverlayTouchMove"
        >
          <div class="gallery-modal" @click.stop>
            <button class="modal-close" type="button" @click="closeGallery" aria-label="Fechar">×</button>

            <button
              v-if="hasMultiplePhotos"
              type="button"
              class="modal-side-btn modal-side-btn-left"
              aria-label="Foto anterior"
              @click.stop="previousPhoto"
            >
              &lt;
            </button>
            <button
              v-if="hasMultiplePhotos"
              type="button"
              class="modal-side-btn modal-side-btn-right"
              aria-label="Proxima foto"
              @click.stop="nextPhoto"
            >
              &gt;
            </button>

            <div
              class="modal-content"
              ref="modalContentRef"
              @touchstart="handleModalTouchStart"
              @touchmove="handleModalTouchMove"
              @touchend="handleModalTouchEnd"
              @touchcancel="handleModalTouchEnd"
            >
              <div class="modal-track" :class="{ 'is-zoomed': isModalZoomed }" :style="modalTrackStyle">
                <figure v-for="(_, idx) in photos" :key="`modal-${idx}`" class="modal-slide">
                  <img
                    :src="getModalDisplay(idx)"
                    :alt="`${alt} - foto ${idx + 1}`"
                    :ref="(el) => setModalImageRef(el, idx)"
                    class="modal-image"
                    draggable="false"
                  />
                </figure>
              </div>
            </div>

            <div v-if="hasMultiplePhotos" class="modal-info">
              Foto {{ currentPhotoIndex + 1 }} de {{ photos.length }}
            </div>

            <div v-if="hasMultiplePhotos" class="modal-thumbnails">
              <button
                v-for="(_, idx) in photos"
                :key="`modal-thumb-${idx}`"
                type="button"
                class="modal-thumb"
                :class="{ active: idx === currentPhotoIndex }"
                @click="setCurrentIndex(idx)"
                :aria-label="`Foto ${idx + 1}`"
              >
                <img :src="getThumbDisplay(idx)" :alt="`${alt} - thumbnail ${idx + 1}`" loading="lazy" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getPageImageCache, getSessionCachedImage, preloadSessionImages } from '../services/imageCache'

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
const cachedPreviewSources = ref([])
const cachedThumbSources = ref([])
const cachedModalSources = ref([])
const pageImageCache = getPageImageCache()

// Zoom variables
const modalContentRef = ref(null)
const modalImageRefs = ref([])
const currentZoom = ref(1)
const zoomOriginX = ref(0)
const zoomOriginY = ref(0)
const touchDistance = ref(0)
const lastTouchDistance = ref(0)
const isZooming = ref(false)
const modalTouchStartX = ref(null)
const modalTouchStartY = ref(null)

let preloadExecutionId = 0
let pageScopeKey = ''

const hasPhotos = computed(() => (props.photos?.length || 0) > 0)
const hasMultiplePhotos = computed(() => (props.photos?.length || 0) > 1)
const isModalZoomed = computed(() => currentZoom.value > 1)

const previewTrackStyle = computed(() => ({
  transform: `translate3d(${-previewPhotoIndex.value * 100}%, 0, 0)`,
  '--slide-duration': `${getSlideDuration()}ms`,
}))

const modalTrackStyle = computed(() => ({
  transform: `translate3d(${-currentPhotoIndex.value * 100}%, 0, 0)`,
  '--slide-duration': isModalZoomed.value ? '0ms' : `${getSlideDuration()}ms`,
}))

function getSlideDuration() {
  if (typeof document !== 'undefined' && document.body.classList.contains('low-motion')) {
    return 0
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return 0
  }

  return 240
}

function normalizeIndex(index) {
  const length = props.photos?.length || 0
  if (!length) {
    return 0
  }

  return (index + length) % length
}

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

function getPreviewDisplay(index) {
  return cachedPreviewSources.value[index] || getPreviewSrc(props.photos?.[index])
}

function getThumbDisplay(index) {
  return cachedThumbSources.value[index] || getThumbSrc(props.photos?.[index])
}

function getModalDisplay(index) {
  return cachedModalSources.value[index] || getModalSrc(props.photos?.[index])
}

async function preloadGalleryImages() {
  const photos = Array.isArray(props.photos) ? props.photos : []
  const thisExecutionId = ++preloadExecutionId

  if (!photos.length) {
    cachedPreviewSources.value = []
    cachedThumbSources.value = []
    cachedModalSources.value = []
    pageScopeKey = ''
    pageImageCache.clear()
    return
  }

  const previewSources = photos.map((photo) => getPreviewSrc(photo))
  const thumbSources = photos.map((photo) => getThumbSrc(photo))
  const modalSources = photos.map((photo) => getModalSrc(photo))
  const nextPageScopeKey = modalSources.join('|')

  if (pageScopeKey && pageScopeKey !== nextPageScopeKey) {
    pageImageCache.clear()
    cachedModalSources.value = []
  }

  pageScopeKey = nextPageScopeKey

  const sessionSources = [...previewSources, ...thumbSources]

  await preloadSessionImages(sessionSources)

  const [resolvedPreviews, resolvedThumbs] = await Promise.all([
    Promise.all(previewSources.map((source) => getSessionCachedImage(source))),
    Promise.all(thumbSources.map((source) => getSessionCachedImage(source))),
  ])

  if (thisExecutionId !== preloadExecutionId) {
    return
  }

  cachedPreviewSources.value = resolvedPreviews
  cachedThumbSources.value = resolvedThumbs

  const scheduleBackgroundLoad = () => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(
        () => {
          if (thisExecutionId === preloadExecutionId) {
            loadModalImagesInBackground(modalSources, thisExecutionId)
          }
        },
        { timeout: 2000 }
      )
      return
    }

    setTimeout(() => {
      if (thisExecutionId === preloadExecutionId) {
        loadModalImagesInBackground(modalSources, thisExecutionId)
      }
    }, 100)
  }

  scheduleBackgroundLoad()
}

async function loadModalImagesInBackground(modalSources, executionId) {
  if (!modalSources.length) {
    cachedModalSources.value = []
    return
  }

  await pageImageCache.preload(modalSources)

  if (executionId !== preloadExecutionId) {
    return
  }

  const resolvedModals = await Promise.all(modalSources.map((source) => pageImageCache.get(source)))

  if (executionId === preloadExecutionId) {
    cachedModalSources.value = resolvedModals
  }
}

function openGallery(index) {
  if (ignoreNextOpen.value) {
    ignoreNextOpen.value = false
    return
  }

  if (!hasPhotos.value) {
    return
  }

  const normalized = normalizeIndex(index)
  if (!getModalDisplay(normalized)) {
    return
  }

  currentPhotoIndex.value = normalized
  previewPhotoIndex.value = normalized
  galleryOpen.value = true

  nextTick(() => {
    resetZoom()
  })
}

function closeGallery() {
  galleryOpen.value = false
}

function nextPhoto() {
  if (!hasPhotos.value) {
    return
  }

  if (isModalZoomed.value) {
    resetZoom()
  }

  const nextIndex = normalizeIndex(currentPhotoIndex.value + 1)
  currentPhotoIndex.value = nextIndex
  previewPhotoIndex.value = nextIndex
}

function previousPhoto() {
  if (!hasPhotos.value) {
    return
  }

  if (isModalZoomed.value) {
    resetZoom()
  }

  const nextIndex = normalizeIndex(currentPhotoIndex.value - 1)
  currentPhotoIndex.value = nextIndex
  previewPhotoIndex.value = nextIndex
}

function setCurrentIndex(index) {
  if (!hasPhotos.value) {
    return
  }

  const normalized = normalizeIndex(index)
  currentPhotoIndex.value = normalized
  previewPhotoIndex.value = normalized
  resetZoom()
}

function handleOverlayTouchMove(event) {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
}

function handleModalTouchStart(event) {
  if (!galleryOpen.value) {
    return
  }

  if (event.touches.length === 2) {
    event.preventDefault()
    isZooming.value = true
    modalTouchStartX.value = null
    modalTouchStartY.value = null

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]

    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    touchDistance.value = Math.sqrt(dx * dx + dy * dy)
    lastTouchDistance.value = touchDistance.value

    zoomOriginX.value = (touch1.clientX + touch2.clientX) / 2
    zoomOriginY.value = (touch1.clientY + touch2.clientY) / 2
    return
  }

  if (event.touches.length === 1 && !isModalZoomed.value) {
    modalTouchStartX.value = event.touches[0].clientX
    modalTouchStartY.value = event.touches[0].clientY
  }
}

function handleModalTouchMove(event) {
  if (event.touches.length === 2 && isZooming.value) {
    event.preventDefault()

    const touch1 = event.touches[0]
    const touch2 = event.touches[1]

    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    touchDistance.value = Math.sqrt(dx * dx + dy * dy)

    const zoomDelta = touchDistance.value / (lastTouchDistance.value || touchDistance.value)
    const nextZoom = Math.max(1, Math.min(4, currentZoom.value * zoomDelta))
    zoomOriginX.value = (touch1.clientX + touch2.clientX) / 2
    zoomOriginY.value = (touch1.clientY + touch2.clientY) / 2

    if (nextZoom !== currentZoom.value) {
      currentZoom.value = nextZoom
      applyZoom()
    }

    lastTouchDistance.value = touchDistance.value
    return
  }

  if (event.touches.length === 1 && !isModalZoomed.value && modalTouchStartX.value !== null) {
    const moveX = event.touches[0].clientX
    const moveY = event.touches[0].clientY
    const deltaX = moveX - modalTouchStartX.value
    const deltaY = moveY - modalTouchStartY.value

    if (Math.abs(deltaX) > 12 && Math.abs(deltaX) > Math.abs(deltaY)) {
      event.preventDefault()
    }
  }
}

function handleModalTouchEnd(event) {
  if (event.touches.length < 2) {
    isZooming.value = false
    touchDistance.value = 0
    lastTouchDistance.value = 0
  }

  if (isModalZoomed.value) {
    modalTouchStartX.value = null
    modalTouchStartY.value = null
    return
  }

  if (modalTouchStartX.value === null || !hasMultiplePhotos.value) {
    modalTouchStartX.value = null
    modalTouchStartY.value = null
    return
  }

  const touchPoint = event.changedTouches?.[0]
  if (!touchPoint) {
    modalTouchStartX.value = null
    modalTouchStartY.value = null
    return
  }

  const deltaX = touchPoint.clientX - modalTouchStartX.value
  const deltaY = touchPoint.clientY - (modalTouchStartY.value ?? touchPoint.clientY)
  const swipeThreshold = 42

  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= swipeThreshold) {
    if (deltaX > 0) {
      previousPhoto()
    } else {
      nextPhoto()
    }
  }

  modalTouchStartX.value = null
  modalTouchStartY.value = null
}

function setModalImageRef(el, idx) {
  if (!el) {
    modalImageRefs.value[idx] = null
    return
  }

  modalImageRefs.value[idx] = el
}

function applyZoom() {
  const img = modalImageRefs.value[currentPhotoIndex.value]
  if (!img || !modalContentRef.value) {
    return
  }

  if (currentZoom.value <= 1) {
    img.style.transform = 'translate3d(0, 0, 0) scale(1)'
    return
  }

  const rect = img.getBoundingClientRect()
  const containerRect = modalContentRef.value.getBoundingClientRect()

  const originX = zoomOriginX.value - rect.left
  const originY = zoomOriginY.value - rect.top

  const translateX = ((containerRect.width / 2 - originX) * (currentZoom.value - 1)) / currentZoom.value
  const translateY = ((containerRect.height / 2 - originY) * (currentZoom.value - 1)) / currentZoom.value

  img.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${currentZoom.value})`
}

function resetZoom() {
  currentZoom.value = 1
  zoomOriginX.value = 0
  zoomOriginY.value = 0
  touchDistance.value = 0
  lastTouchDistance.value = 0
  isZooming.value = false

  for (const img of modalImageRefs.value) {
    if (img) {
      img.style.transform = 'translate3d(0, 0, 0) scale(1)'
    }
  }
}

function setPreviewIndex(index) {
  previewPhotoIndex.value = normalizeIndex(index)
}

function nextPreview() {
  previewPhotoIndex.value = normalizeIndex(previewPhotoIndex.value + 1)
}

function previousPreview() {
  previewPhotoIndex.value = normalizeIndex(previewPhotoIndex.value - 1)
}

function handleTouchStart(event) {
  if (!hasPhotos.value) {
    return
  }

  touchStartX.value = event.changedTouches?.[0]?.clientX ?? null
}

function handleTouchEnd(event) {
  if (!hasPhotos.value || touchStartX.value === null) {
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

function handleWindowKeydown(event) {
  if (!galleryOpen.value) {
    return
  }

  if (event.key === 'Escape') {
    closeGallery()
    return
  }

  if (!hasMultiplePhotos.value) {
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    nextPhoto()
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    previousPhoto()
  }
}

function handleGesture(event) {
  if (galleryOpen.value) {
    event.preventDefault()
  }
}

function addModalGlobalListeners() {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowKeydown)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('gesturestart', handleGesture, { passive: false })
    document.addEventListener('gesturechange', handleGesture, { passive: false })
  }
}

function removeModalGlobalListeners() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowKeydown)
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('gesturestart', handleGesture)
    document.removeEventListener('gesturechange', handleGesture)
  }
}

watch(galleryOpen, (isOpen) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }

  if (isOpen) {
    addModalGlobalListeners()
    return
  }

  removeModalGlobalListeners()
  resetZoom()
  modalImageRefs.value = []
})

watch(
  () => props.photos,
  () => {
    preloadGalleryImages()
  },
  { deep: true, immediate: true }
)

watch(
  () => props.photos?.length || 0,
  (length) => {
    if (!length) {
      previewPhotoIndex.value = 0
      currentPhotoIndex.value = 0
      modalImageRefs.value = []
      return
    }

    if (previewPhotoIndex.value >= length) {
      previewPhotoIndex.value = 0
    }

    if (currentPhotoIndex.value >= length) {
      currentPhotoIndex.value = previewPhotoIndex.value
    }

    modalImageRefs.value = modalImageRefs.value.slice(0, length)
  }
)

watch(currentPhotoIndex, () => {
  nextTick(() => {
    applyZoom()
  })
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }

  removeModalGlobalListeners()
  resetZoom()
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

.gallery-track-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.gallery-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
  transition: transform var(--slide-duration, 240ms) cubic-bezier(0.22, 1, 0.36, 1);
}

.gallery-slide {
  width: 100%;
  height: 100%;
  flex: 0 0 100%;
  margin: 0;
}

.gallery-container:hover {
  box-shadow: 0 8px 24px rgba(77, 99, 57, 0.15);
}

.gallery-main {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  user-select: none;
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

.gallery-thumbs-strip {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.7rem;
  padding: 0.6rem;
  border-radius: var(--radius-md);
  background: rgba(183, 205, 169, 0.08);
  border: 1px solid rgba(77, 99, 57, 0.12);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.gallery-thumb {
  flex: 0 0 auto;
  border: none;
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  width: 60px;
  height: 60px;
  padding: 0;
  transition: all 0.15s ease;
  border: 2px solid rgba(77, 99, 57, 0.2);
}

.gallery-thumb:hover {
  transform: scale(1.08);
  border-color: rgba(77, 99, 57, 0.5);
  box-shadow: 0 2px 8px rgba(77, 99, 57, 0.2);
}

.gallery-thumb.active {
  border-color: rgba(77, 99, 57, 0.8);
  box-shadow: 0 0 0 2px rgba(183, 205, 169, 0.4);
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
  overflow: hidden;
  padding: 1.2rem 1rem;
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
  overflow: hidden;
  position: relative;
  touch-action: pan-y;
}

.modal-track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
  transition: transform var(--slide-duration, 240ms) cubic-bezier(0.22, 1, 0.36, 1);
}

.modal-track.is-zoomed {
  transition: none !important;
}

.modal-slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-image {
  max-width: 88vw;
  max-height: 82vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  touch-action: none;
  will-change: transform;
  transition: transform 0.18s ease;
  transform-origin: center center;
  user-select: none;
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

  .gallery-thumbs-strip {
    gap: 0.4rem;
    padding: 0.5rem;
  }

  .gallery-thumb {
    width: 50px;
    height: 50px;
  }

  .modal-side-btn {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }

  .modal-content {
    padding: 1rem 2.8rem;
  }

  .modal-image {
    max-width: 100%;
    max-height: 68vh;
  }

  .gallery-container {
    aspect-ratio: 3 / 4;
  }
}
</style>