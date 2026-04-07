<template>
  <div class="photo-gallery">
    <div class="gallery-container" @click="openGallery(0)">
      <img
        v-if="photos[0]"
        :src="photos[0]"
        :alt="alt"
        loading="lazy"
        class="gallery-main"
      />
      <div v-else class="gallery-placeholder">Sem foto</div>

      <div v-if="photos.length > 1" class="gallery-badge">{{ photos.length }} fotos</div>
    </div>

    <details class="gallery-thumbs-details" v-if="photos.length > 1">
      <summary>Ver {{ photos.length }} fotos</summary>
      <div class="gallery-thumbs">
        <button
          v-for="(photo, idx) in photos"
          :key="idx"
          type="button"
          class="gallery-thumb"
          :aria-label="`Foto ${idx + 1}`"
          @click.prevent="openGallery(idx)"
        >
          <img :src="photo" :alt="`${alt} - foto ${idx + 1}`" loading="lazy" />
        </button>
      </div>
    </details>

    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="galleryOpen" class="gallery-modal-overlay" @click="closeGallery">
          <div class="gallery-modal" @click.stop>
            <button class="modal-close" type="button" @click="closeGallery" aria-label="Fechar">×</button>

            <div class="modal-content">
              <img :src="photos[currentPhotoIndex]" :alt="`${alt} - foto ${currentPhotoIndex + 1}`" />
            </div>

            <div v-if="photos.length > 1" class="modal-info">
              Foto {{ currentPhotoIndex + 1 }} de {{ photos.length }}
            </div>

            <div v-if="photos.length > 1" class="modal-nav">
              <button
                type="button"
                class="modal-btn"
                @click="previousPhoto"
                aria-label="Foto anterior"
              >
                ‹ Anterior
              </button>
              <button
                type="button"
                class="modal-btn"
                @click="nextPhoto"
                aria-label="Proxima foto"
              >
                Proxima ›
              </button>
            </div>

            <div v-if="photos.length > 1" class="modal-thumbnails">
              <button
                v-for="(photo, idx) in photos"
                :key="idx"
                type="button"
                class="modal-thumb"
                :class="{ active: idx === currentPhotoIndex }"
                @click="currentPhotoIndex = idx"
                :aria-label="`Foto ${idx + 1}`"
              >
                <img :src="photo" :alt="`${alt} - thumbnail ${idx + 1}`" loading="lazy" />
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

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

function openGallery(index) {
  currentPhotoIndex.value = index
  galleryOpen.value = true
}

function closeGallery() {
  galleryOpen.value = false
}

function nextPhoto() {
  currentPhotoIndex.value = (currentPhotoIndex.value + 1) % (props.photos?.length || 1)
}

function previousPhoto() {
  const length = props.photos?.length || 1
  currentPhotoIndex.value = (currentPhotoIndex.value - 1 + length) % length
}

watch(galleryOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

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
  max-width: 92vw;
  max-height: 70vh;
  object-fit: contain;
  border-radius: var(--radius-md);
}

.modal-info {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  padding: 0 1rem;
}

.modal-nav {
  display: flex;
  justify-content: center;
  gap: 0.8rem;
  padding: 0 1rem;
}

.modal-btn {
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s ease;
}

.modal-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
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
  .modal-content {
    padding: 1rem 0.5rem;
  }

  .modal-content img {
    max-width: 96vw;
    max-height: 62vh;
  }

  .modal-nav {
    flex-direction: column;
  }

  .modal-btn {
    width: 100%;
  }

  .gallery-container {
    aspect-ratio: 3 / 4;
  }
}
</style>
