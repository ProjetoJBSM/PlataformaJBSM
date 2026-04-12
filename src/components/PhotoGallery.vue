<template>
  <div class="photo-gallery">
    <div
      class="gallery-container"
      @click="openGallery(previewPhotoIndex)"
      @touchstart.passive="handleTouchStart"
      @touchend.passive="handleTouchEnd"
    >
      <Transition :name="previewTransitionName" mode="out-in">
        <img
          v-if="mainPhotoPreview"
          :key="previewPhotoIndex"
          :src="mainPhotoPreview"
          :alt="alt"
          :fetchpriority="previewPhotoIndex === 0 ? 'high' : 'auto'"
          loading="eager"
          decoding="async"
          class="gallery-main"
          draggable="false"
        />
        <div v-else key="preview-placeholder" class="gallery-placeholder">Sem foto</div>
      </Transition>

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

    <div v-if="hasMultiplePhotos && showPreviewThumbs" class="gallery-thumbs-strip" aria-label="Miniaturas da galeria">
      <button
        v-for="(_, idx) in photos"
        :key="`thumb-${idx}`"
        type="button"
        class="gallery-thumb"
        :class="{ active: idx === previewPhotoIndex }"
        :aria-label="`Foto ${idx + 1}`"
        @click.prevent="setPreviewIndex(idx)"
      >
        <img :src="getThumbDisplay(idx)" :alt="`${alt} - foto ${idx + 1}`" loading="lazy" decoding="async" />
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
              @touchstart.passive="handleModalTouchStart"
              @touchend.passive="handleModalTouchEnd"
              @touchcancel.passive="handleModalTouchEnd"
            >
              <Transition :name="modalTransitionName" mode="out-in">
                <img
                  v-if="currentModalPhoto"
                  :key="currentPhotoIndex"
                  :src="currentModalPhoto"
                  :alt="`${alt} - foto ${currentPhotoIndex + 1}`"
                  class="modal-image"
                  loading="eager"
                  decoding="async"
                  draggable="false"
                />
                <div v-else key="modal-placeholder" class="modal-placeholder">Sem foto</div>
              </Transition>
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
                <img :src="getThumbDisplay(idx)" :alt="`${alt} - thumbnail ${idx + 1}`" loading="lazy" decoding="async" />
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
const modalTouchStartX = ref(null)
const ignoreNextOpen = ref(false)
const modalDirection = ref('next')
const previewDirection = ref('next')
const showPreviewThumbs = ref(false)
const cachedPreviewSources = ref([])
const cachedThumbSources = ref([])
const cachedModalSources = ref([])

let previewThumbsTimer = null
let previewThumbsIdleHandle = null
let preloadExecutionId = 0

const pageImageCache = getPageImageCache()

const hasPhotos = computed(() => (props.photos?.length || 0) > 0)
const hasMultiplePhotos = computed(() => (props.photos?.length || 0) > 1)
const mainPhotoPreview = computed(() => getPreviewDisplay(previewPhotoIndex.value))
const currentModalPhoto = computed(() => getModalDisplay(currentPhotoIndex.value))
const previewTransitionName = computed(() =>
  previewDirection.value === 'prev' ? 'modal-photo-prev' : 'modal-photo-next'
)
const modalTransitionName = computed(() =>
  modalDirection.value === 'prev' ? 'modal-photo-prev' : 'modal-photo-next'
)

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
    return
  }

  const previewSources = photos.map((photo) => getPreviewSrc(photo))
  const thumbSources = photos.map((photo) => getThumbSrc(photo))
  const modalSources = photos.map((photo) => getModalSrc(photo))

  // Preload da navegação principal em qualidade baixa para troca imediata na galeria.
  await preloadSessionImages([...previewSources, ...thumbSources])

  const [resolvedPreviews, resolvedThumbs] = await Promise.all([
    Promise.all(previewSources.map((source) => getSessionCachedImage(source))),
    Promise.all(thumbSources.map((source) => getSessionCachedImage(source))),
  ])

  if (thisExecutionId !== preloadExecutionId) {
    return
  }

  cachedPreviewSources.value = resolvedPreviews
  cachedThumbSources.value = resolvedThumbs

  const scheduleBackgroundModalLoad = () => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(
        () => {
          if (thisExecutionId === preloadExecutionId) {
            void loadModalImagesInBackground(modalSources, thisExecutionId)
          }
        },
        { timeout: 2200 }
      )
      return
    }

    setTimeout(() => {
      if (thisExecutionId === preloadExecutionId) {
        void loadModalImagesInBackground(modalSources, thisExecutionId)
      }
    }, 120)
  }

  scheduleBackgroundModalLoad()
}

async function loadModalImagesInBackground(modalSources, executionId) {
  const uniqueSources = [...new Set(modalSources.filter(Boolean))]
  if (!uniqueSources.length) {
    if (executionId === preloadExecutionId) {
      cachedModalSources.value = []
    }
    return
  }

  // Imagens do modal ampliado carregam em segundo plano com cache global da pagina.
  await pageImageCache.preload(uniqueSources)

  if (executionId !== preloadExecutionId) {
    return
  }

  const resolvedModals = await Promise.all(modalSources.map((source) => pageImageCache.get(source)))
  if (executionId === preloadExecutionId) {
    cachedModalSources.value = resolvedModals
  }
}

function clearPreviewThumbsSchedule() {
  if (typeof window === 'undefined') {
    return
  }

  if (previewThumbsTimer !== null) {
    window.clearTimeout(previewThumbsTimer)
    previewThumbsTimer = null
  }

  if (previewThumbsIdleHandle !== null && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(previewThumbsIdleHandle)
    previewThumbsIdleHandle = null
  }
}

function schedulePreviewThumbs() {
  clearPreviewThumbsSchedule()

  if (typeof window === 'undefined' || !hasMultiplePhotos.value) {
    showPreviewThumbs.value = hasMultiplePhotos.value
    return
  }

  showPreviewThumbs.value = false

  const revealThumbs = () => {
    showPreviewThumbs.value = hasMultiplePhotos.value
  }

  if (typeof window.requestIdleCallback === 'function') {
    previewThumbsIdleHandle = window.requestIdleCallback(revealThumbs, { timeout: 1200 })
    return
  }

  previewThumbsTimer = window.setTimeout(revealThumbs, 350)
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
}

function closeGallery() {
  galleryOpen.value = false
}

function nextPhoto() {
  if (!hasPhotos.value) {
    return
  }

  modalDirection.value = 'next'
  previewDirection.value = 'next'
  const nextIndex = normalizeIndex(currentPhotoIndex.value + 1)
  currentPhotoIndex.value = nextIndex
  previewPhotoIndex.value = nextIndex
}

function previousPhoto() {
  if (!hasPhotos.value) {
    return
  }

  modalDirection.value = 'prev'
  previewDirection.value = 'prev'
  const nextIndex = normalizeIndex(currentPhotoIndex.value - 1)
  currentPhotoIndex.value = nextIndex
  previewPhotoIndex.value = nextIndex
}

function setCurrentIndex(index) {
  if (!hasPhotos.value) {
    return
  }

  const normalized = normalizeIndex(index)
  modalDirection.value = normalized < currentPhotoIndex.value ? 'prev' : 'next'
  previewDirection.value = modalDirection.value
  currentPhotoIndex.value = normalized
  previewPhotoIndex.value = normalized
}

function setPreviewIndex(index) {
  const normalized = normalizeIndex(index)
  previewDirection.value = normalized < previewPhotoIndex.value ? 'prev' : 'next'
  previewPhotoIndex.value = normalized
}

function nextPreview() {
  previewDirection.value = 'next'
  previewPhotoIndex.value = normalizeIndex(previewPhotoIndex.value + 1)
}

function previousPreview() {
  previewDirection.value = 'prev'
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

function handleModalTouchStart(event) {
  if (!hasMultiplePhotos.value) {
    return
  }

  modalTouchStartX.value = event.changedTouches?.[0]?.clientX ?? null
}

function handleModalTouchEnd(event) {
  if (!hasMultiplePhotos.value || modalTouchStartX.value === null) {
    modalTouchStartX.value = null
    return
  }

  const touchEndX = event.changedTouches?.[0]?.clientX
  if (typeof touchEndX !== 'number') {
    modalTouchStartX.value = null
    return
  }

  const deltaX = touchEndX - modalTouchStartX.value
  const swipeThreshold = 42

  if (deltaX >= swipeThreshold) {
    previousPhoto()
  } else if (deltaX <= -swipeThreshold) {
    nextPhoto()
  }

  modalTouchStartX.value = null
}

function handleOverlayTouchMove(event) {
  if (event.touches.length > 1) {
    event.preventDefault()
  }
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

function preventGestureZoom(event) {
  if (galleryOpen.value) {
    event.preventDefault()
  }
}

function preventPinchTouchZoom(event) {
  if (galleryOpen.value && event.touches.length > 1) {
    event.preventDefault()
  }
}

function addModalGlobalListeners() {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleWindowKeydown)
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('gesturestart', preventGestureZoom, { passive: false })
    document.addEventListener('gesturechange', preventGestureZoom, { passive: false })
    document.addEventListener('touchmove', preventPinchTouchZoom, { passive: false })
  }
}

function removeModalGlobalListeners() {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleWindowKeydown)
  }

  if (typeof document !== 'undefined') {
    document.removeEventListener('gesturestart', preventGestureZoom)
    document.removeEventListener('gesturechange', preventGestureZoom)
    document.removeEventListener('touchmove', preventPinchTouchZoom)
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
})

watch(
  () => props.photos,
  () => {
    void preloadGalleryImages()
  },
  { deep: true, immediate: true }
)

watch(
  () => props.photos?.length || 0,
  (length) => {
    schedulePreviewThumbs()

    if (!length) {
      previewPhotoIndex.value = 0
      currentPhotoIndex.value = 0
      cachedPreviewSources.value = []
      cachedThumbSources.value = []
      cachedModalSources.value = []
      return
    }

    if (previewPhotoIndex.value >= length) {
      previewPhotoIndex.value = 0
    }

    if (currentPhotoIndex.value >= length) {
      currentPhotoIndex.value = previewPhotoIndex.value
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }

  clearPreviewThumbsSchedule()
  removeModalGlobalListeners()
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
  display: grid;
  place-items: center;
  padding: 0.5rem 1rem;
  min-height: 300px;
  overflow: hidden;
  position: relative;
}

.modal-image {
  max-width: 88vw;
  max-height: 82vh;
  object-fit: contain;
  border-radius: var(--radius-md);
  user-select: none;
}

.modal-placeholder {
  color: rgba(255, 255, 255, 0.75);
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
  padding: 0.5rem;
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

.modal-photo-next-enter-active,
.modal-photo-next-leave-active,
.modal-photo-prev-enter-active,
.modal-photo-prev-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.modal-photo-next-enter-from {
  opacity: 0;
  transform: translateX(26px);
}

.modal-photo-next-leave-to {
  opacity: 0;
  transform: translateX(-26px);
}

.modal-photo-prev-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}

.modal-photo-prev-leave-to {
  opacity: 0;
  transform: translateX(26px);
}

:global(body.low-motion) .modal-photo-next-enter-active,
:global(body.low-motion) .modal-photo-next-leave-active,
:global(body.low-motion) .modal-photo-prev-enter-active,
:global(body.low-motion) .modal-photo-prev-leave-active {
  transition: none !important;
}

@media (prefers-reduced-motion: reduce) {
  .modal-photo-next-enter-active,
  .modal-photo-next-leave-active,
  .modal-photo-prev-enter-active,
  .modal-photo-prev-leave-active {
    transition: none !important;
  }
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
