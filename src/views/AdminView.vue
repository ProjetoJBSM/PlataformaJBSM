<template>
  <div class="container fade-up">
    <section class="section admin-shell" style="margin-top: 0.5rem">
      <header class="section-header">
        <h1 class="section-title">Administracao do acervo</h1>
        <p class="section-subtitle">
          Cadastre especies, importe CSV para sincronizacao e gere placas com QR Code.
        </p>
        <div class="form-actions" style="margin-top: 0.8rem">
          <button class="btn btn-secondary" type="button" @click="logoutAdmin">Sair</button>
        </div>
      </header>

      <div class="admin-tabs">
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'records' }"
          type="button"
          @click="setActiveTab('records')"
        >
          Registros
        </button>
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'csv' }"
          type="button"
          @click="setActiveTab('csv')"
        >
          Importacao CSV
        </button>
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'plates' }"
          type="button"
          @click="setActiveTab('plates')"
        >
          Geracao de placas
        </button>
      </div>

      <div v-if="statusMessage" class="state-box" :class="statusError ? 'state-error' : 'state-loading'">
        {{ statusMessage }}
      </div>

      <div v-if="busyMessage" class="loading-overlay" role="status" aria-live="polite">
        <div class="loading-dialog">
          <div class="spinner" aria-hidden="true"></div>
          <strong>Aguarde</strong>
          <p>{{ busyMessage }}</p>
        </div>
      </div>

      <div v-if="activeTab === 'records'" class="split-layout">
        <aside class="panel">
          <h3>Especies</h3>
          <div class="form-actions" style="margin-top: 0.6rem">
            <button class="btn btn-secondary" type="button" @click="startNewPlant">Nova especie</button>
            <button class="btn btn-secondary" type="button" @click="loadPlants">Atualizar</button>
          </div>

          <div class="species-list" style="margin-top: 0.8rem">
            <button
              v-for="item in plants"
              :key="item.id"
              class="species-item"
              :class="{ active: selectedId === item.id }"
              type="button"
              @click="selectPlant(item)"
            >
              <strong>{{ item.commonName || item.scientificName || item.id }}</strong>
              <div style="font-size: 0.85rem; color: var(--muted)">{{ item.id }}</div>
            </button>

            <div v-if="!plants.length" class="empty-state">Nenhuma especie cadastrada.</div>
          </div>
        </aside>

        <div class="panel">
          <h3>{{ selectedId ? 'Editar especie' : 'Nova especie' }}</h3>

          <form class="form-grid" style="margin-top: 0.85rem" @submit.prevent="saveCurrentPlant">
            <label>
              <span class="field-label">ID *</span>
              <input
                v-model="form.id"
                class="input"
                required
                placeholder="Ex.: 01048"
                :disabled="Boolean(selectedId)"
              />
            </label>
            <label>
              <span class="field-label">Codigo</span>
              <input v-model="form.code" class="input" placeholder="Opcional" />
            </label>
            <label>
              <span class="field-label">Nome popular</span>
              <input v-model="form.commonName" class="input" />
            </label>
            <label>
              <span class="field-label">Nome cientifico</span>
              <input v-model="form.scientificName" class="input" />
            </label>
            <label>
              <span class="field-label">Familia</span>
              <input v-model="form.family" class="input" />
            </label>
            <label>
              <span class="field-label">Tipo</span>
              <input v-model="form.type" class="input" placeholder="Arvore, arbusto..." />
            </label>
            <label>
              <span class="field-label">Origem</span>
              <input v-model="form.origin" class="input" />
            </label>
            <label>
              <span class="field-label">Localizacao</span>
              <input v-model="form.location" class="input" />
            </label>

            <label class="field-full">
              <span class="field-label">Latitude (opcional)</span>
              <input
                v-model="form.geoLocation.latitude"
                type="number"
                class="input"
                placeholder="Ex.: -29.6842"
                step="0.000001"
              />
            </label>
            <label class="field-full">
              <span class="field-label">Longitude (opcional)</span>
              <input
                v-model="form.geoLocation.longitude"
                type="number"
                class="input"
                placeholder="Ex.: -53.8069"
                step="0.000001"
              />
            </label>

            <div class="field-full">
              <span class="field-label">Fotos *</span>
              <PhotoUpload
                ref="photoUploadRef"
                @photos-changed="handlePhotosChanged"
                @geolocation-detected="handleGeoLocationDetected"
              />
            </div>

            <label class="field-full">
              <span class="field-label">Descricao</span>
              <textarea v-model="form.description" class="textarea"></textarea>
            </label>
            <label class="field-full">
              <span class="field-label">Observacoes do curador</span>
              <textarea v-model="form.curatorNotes" class="textarea"></textarea>
            </label>

            <div class="field-full edit-actions-bar">
              <div class="form-actions">
                <button v-if="hasUnsavedChanges" class="btn btn-primary" type="submit">Salvar alteracoes</button>
                <button
                  v-if="hasUnsavedChanges"
                  class="btn btn-secondary"
                  type="button"
                  @click="discardChanges"
                >
                  Descartar alteracoes
                </button>
                <button class="btn btn-danger" type="button" :disabled="!selectedId" @click="removeCurrentPlant">
                  Excluir registro
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div v-else-if="activeTab === 'csv'" class="panel">
        <h3>Sincronizar por CSV</h3>
        <p style="margin-top: 0.45rem; color: var(--muted)">
          Envie um CSV com colunas conhecidas. As fotos ainda precisarao ser adicionadas manualmente.
        </p>

        <div class="form-actions" style="margin-top: 0.8rem">
          <input ref="csvInputRef" class="input" type="file" accept=".csv,text/csv" @change="handleCsvUpload" />
          <button class="btn btn-secondary" type="button" @click="clearCsv">Limpar</button>
          <button class="btn btn-primary" type="button" :disabled="!csvRows.length" @click="importCsvRows">
            Importar {{ csvRows.length }} registro(s)
          </button>
        </div>

        <div v-if="csvRows.length" class="csv-preview" style="margin-top: 0.9rem">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome popular</th>
                <th>Nome cientifico</th>
                <th>Familia</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in csvRows.slice(0, 12)" :key="row.id">
                <td>{{ row.id }}</td>
                <td>{{ row.commonName }}</td>
                <td>{{ row.scientificName }}</td>
                <td>{{ row.family }}</td>
                <td>{{ row.type }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="panel">
        <h3>Gerador de placa QR</h3>
        <p style="margin-top: 0.45rem; color: var(--muted)">
          Selecione uma especie, gere a placa e baixe como imagem PNG para impressao.
        </p>

        <div class="form-grid" style="margin-top: 0.9rem">
          <label class="field-full">
            <span class="field-label">Especie</span>
            <select v-model="platePlantId" class="select" @change="renderPlate">
              <option value="">Selecione</option>
              <option v-for="item in plants" :key="item.id" :value="item.id">
                {{ item.id }} - {{ item.commonName || item.scientificName || 'Sem nome' }}
              </option>
            </select>
          </label>
          <label>
            <span class="field-label">Largura (px)</span>
            <input v-model.number="plateWidth" class="input" type="number" min="420" max="1400" />
          </label>
          <label>
            <span class="field-label">Altura (px)</span>
            <input v-model.number="plateHeight" class="input" type="number" min="200" max="1000" />
          </label>
          <label>
            <span class="field-label">Cor de fundo</span>
            <input v-model="plateTheme.background" class="input" type="color" />
          </label>
          <label>
            <span class="field-label">Cor de destaque</span>
            <input v-model="plateTheme.accent" class="input" type="color" />
          </label>
          <label>
            <span class="field-label">Cor do texto</span>
            <input v-model="plateTheme.text" class="input" type="color" />
          </label>
          <label>
            <span class="field-label">Cor do QR</span>
            <input v-model="plateTheme.qrDark" class="input" type="color" />
          </label>
        </div>

        <div class="form-actions">
          <button class="btn btn-primary" type="button" :disabled="!platePlantId" @click="renderPlate">
            Atualizar placa
          </button>
          <button class="btn btn-secondary" type="button" :disabled="!platePlantId" @click="downloadPlate">
            Baixar PNG
          </button>
          <button class="btn btn-secondary" type="button" @click="exportPlateTemplate">
            Exportar template JSON
          </button>
          <button class="btn btn-secondary" type="button" @click="openTemplatePicker">
            Importar template JSON
          </button>
          <input
            ref="plateTemplateInputRef"
            class="sr-only"
            type="file"
            accept="application/json,.json"
            @change="importPlateTemplate"
          />
        </div>

        <canvas
          ref="plateCanvasRef"
          class="plate-canvas"
          style="margin-top: 1rem"
          :width="plateWidth"
          :height="plateHeight"
        ></canvas>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { signOut } from 'firebase/auth'
import { useRoute, useRouter } from 'vue-router'
import QRCode from 'qrcode'

import { auth } from '../services/firebase'
import { normalizeCsvRow, parseCsvFile } from '../services/csvUtils'
import { compressImage, deletePlantPhoto, uploadPlantPhoto } from '../services/photoUpload'
import {
  deletePlantById,
  fetchPlants,
  importPlantsBatch,
  upsertPlant,
} from '../services/plantsRepository'
import PhotoUpload from '../components/PhotoUpload.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref(normalizeAdminTab(typeof route.query.tab === 'string' ? route.query.tab : 'records'))
const plants = ref([])
const selectedId = ref('')
const photoUploadRef = ref(null)

const csvInputRef = ref(null)
const csvRows = ref([])

const plateCanvasRef = ref(null)
const plateTemplateInputRef = ref(null)
const platePlantId = ref('')
const plateWidth = ref(900)
const plateHeight = ref(360)
const plateTheme = reactive({
  background: '#f8fbf6',
  accent: '#2b4a2e',
  text: '#1f3220',
  qrDark: '#1d3d1f',
})

const busyStack = ref([])
const busyMessage = computed(() => busyStack.value[busyStack.value.length - 1] || '')

const statusMessage = ref('')
const statusError = ref(false)
const formSnapshotVersion = ref(0)
const photoSnapshot = ref('[]')
const baselineSnapshot = ref('')
const suppressSnapshotTracking = ref(false)

const form = reactive(createEmptyForm())

const selectedPlatePlant = computed(() => plants.value.find((item) => item.id === platePlantId.value) || null)
const hasUnsavedChanges = computed(() => {
  if (!baselineSnapshot.value) {
    return false
  }

  // Dependencias reativas para recalcular quando formulario/fotos mudarem.
  formSnapshotVersion.value
  photoSnapshot.value
  return baselineSnapshot.value !== buildCurrentSnapshot()
})

function createEmptyForm() {
  return {
    id: '',
    code: '',
    commonName: '',
    scientificName: '',
    family: '',
    origin: '',
    type: '',
    description: '',
    location: '',
    curatorNotes: '',
    geoLocation: {
      latitude: null,
      longitude: null,
    },
  }
}

function setStatus(message, isError = false) {
  statusMessage.value = message
  statusError.value = isError
}

function clearStatus() {
  statusMessage.value = ''
  statusError.value = false
}

function normalizeAdminTab(tab) {
  return ['records', 'csv', 'plates'].includes(tab) ? tab : 'records'
}

function pushBusy(message) {
  busyStack.value = [...busyStack.value, message]
}

function popBusy() {
  if (!busyStack.value.length) {
    return
  }

  busyStack.value = busyStack.value.slice(0, -1)
}

function updateBusyMessage(message) {
  if (!busyStack.value.length) {
    pushBusy(message)
    return
  }

  busyStack.value = [...busyStack.value.slice(0, -1), message]
}

async function syncAdminTabQuery(tab) {
  if (route.name !== 'admin') {
    return
  }

  const currentTabRaw = typeof route.query.tab === 'string' ? route.query.tab : ''
  const currentTab = normalizeAdminTab(currentTabRaw)

  if (currentTabRaw && currentTab === tab) {
    return
  }

  await router.replace({
    name: 'admin',
    query: {
      ...route.query,
      tab,
    },
  })
}

function setActiveTab(tab) {
  const normalized = normalizeAdminTab(tab)
  if (activeTab.value === normalized) {
    return
  }

  activeTab.value = normalized
  syncAdminTabQuery(normalized)
}

function parseCoordinate(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function isFiniteNumber(value) {
  return Number.isFinite(value)
}

function normalizeFormForSnapshot() {
  return {
    id: String(form.id || '').trim(),
    code: String(form.code || '').trim(),
    commonName: String(form.commonName || '').trim(),
    scientificName: String(form.scientificName || '').trim(),
    family: String(form.family || '').trim(),
    origin: String(form.origin || '').trim(),
    type: String(form.type || '').trim(),
    description: String(form.description || '').trim(),
    location: String(form.location || '').trim(),
    curatorNotes: String(form.curatorNotes || '').trim(),
    geoLocation: {
      latitude: parseCoordinate(form.geoLocation.latitude),
      longitude: parseCoordinate(form.geoLocation.longitude),
    },
  }
}

function buildCurrentSnapshot() {
  return JSON.stringify({
    form: normalizeFormForSnapshot(),
    photos: photoUploadRef.value?.getSnapshot?.() || [],
  })
}

function resetBaselineSnapshot() {
  baselineSnapshot.value = buildCurrentSnapshot()
}

function extractStoragePathFromUrl(url) {
  if (typeof url !== 'string' || !url) {
    return null
  }

  try {
    const parsed = new URL(url)
    const marker = '/o/'
    const markerIndex = parsed.pathname.indexOf(marker)

    if (markerIndex < 0) {
      return null
    }

    const encodedPath = parsed.pathname.slice(markerIndex + marker.length)
    return decodeURIComponent(encodedPath)
  } catch {
    return null
  }
}

function extractStoragePathsFromImage(image) {
  if (!image) {
    return []
  }

  if (typeof image === 'string') {
    const parsedPath = extractStoragePathFromUrl(image)
    return parsedPath ? [parsedPath] : []
  }

  return [
    image.lowPath,
    image.mediumPath,
    image.highPath,
    image.path,
    extractStoragePathFromUrl(image.low),
    extractStoragePathFromUrl(image.medium),
    extractStoragePathFromUrl(image.high),
  ].filter(Boolean)
}

function collectStoragePaths(images = []) {
  const entries = images || []
  return [...new Set(entries.flatMap((image) => extractStoragePathsFromImage(image)))]
}

async function removeStoragePaths(paths = []) {
  const uniquePaths = [...new Set((paths || []).filter(Boolean))]
  const failed = []

  for (const storagePath of uniquePaths) {
    try {
      await deletePlantPhoto(storagePath)
    } catch {
      failed.push(storagePath)
    }
  }

  return failed
}

function handlePhotosChanged(snapshot) {
  photoSnapshot.value = JSON.stringify(Array.isArray(snapshot) ? snapshot : [])
}

async function discardChanges() {
  if (selectedId.value) {
    const selectedPlant = plants.value.find((item) => item.id === selectedId.value)
    if (selectedPlant) {
      patchForm(selectedPlant)
      clearStatus()
      setStatus('Alteracoes descartadas.')
      return
    }
  }

  startNewPlant()
  setStatus('Alteracoes descartadas.')
}

async function logoutAdmin() {
  try {
    if (auth) {
      await signOut(auth)
    }
  } finally {
    await router.replace({ name: 'admin-login' })
  }
}

async function buildImagesFromUpload() {
  const photos = photoUploadRef.value?.getPhotos?.() || []

  if (photos.length === 0) {
    setStatus('Adicione pelo menos 1 foto para salvar o registro.', true)
    return null
  }

  if (photos.length > 10) {
    setStatus('Limite de 10 fotos por especie excedido.', true)
    return null
  }

  const images = []
  pushBusy('Otimizando e enviando fotos...')

  try {
    for (let index = 0; index < photos.length; index += 1) {
      const photoItem = photos[index]

      if (photoItem.kind === 'existing') {
        images.push(photoItem.image)
        continue
      }

      try {
        updateBusyMessage(`Otimizando foto ${index + 1} de ${photos.length}: ${photoItem.file?.name || 'imagem'}`)
        setStatus(`Otimizando e enviando foto ${index + 1} de ${photos.length}...`)

        const lowFile = await compressImage(photoItem.file, 800, 600, 0.74)
        const mediumFile = await compressImage(photoItem.file, 1440, 1080, 0.8)
        const highFile = await compressImage(photoItem.file, 1920, 1440, 0.84)

        const lowUpload = await uploadPlantPhoto(lowFile, form.id, index, 'low')
        const mediumUpload = await uploadPlantPhoto(mediumFile, form.id, index, 'medium')
        const highUpload = await uploadPlantPhoto(highFile, form.id, index, 'high')

        images.push({
          low: lowUpload.url,
          medium: mediumUpload.url,
          high: highUpload.url,
          lowPath: lowUpload.path,
          mediumPath: mediumUpload.path,
          highPath: highUpload.path,
          alt: form.commonName || form.scientificName || 'Imagem da especie',
        })
      } catch (err) {
        setStatus(`Erro ao enviar foto: ${err instanceof Error ? err.message : 'erro desconhecido'}`, true)
        return null
      }
    }
  } finally {
    popBusy()
  }

  return images.length > 0 ? images : []
}

function handleGeoLocationDetected(event) {
  if (isFiniteNumber(event.latitude) && isFiniteNumber(event.longitude)) {
    form.geoLocation.latitude = event.latitude
    form.geoLocation.longitude = event.longitude
    setStatus('Geolocalizacao importada da foto!')
  }
}

function patchForm(data) {
  suppressSnapshotTracking.value = true

  form.id = data.id || ''
  form.code = data.code || ''
  form.commonName = data.commonName || ''
  form.scientificName = data.scientificName || ''
  form.family = data.family || ''
  form.origin = data.origin || ''
  form.type = data.type || ''
  form.description = data.description || ''
  form.location = data.location || ''
  form.curatorNotes = data.curatorNotes || ''
  form.geoLocation.latitude = data.geoLocation?.latitude || null
  form.geoLocation.longitude = data.geoLocation?.longitude || null

  photoUploadRef.value?.setExistingPhotos?.(Array.isArray(data.images) ? data.images : [])
  photoSnapshot.value = JSON.stringify(photoUploadRef.value?.getSnapshot?.() || [])

  suppressSnapshotTracking.value = false
  formSnapshotVersion.value += 1
  resetBaselineSnapshot()
}

function startNewPlant() {
  selectedId.value = ''
  patchForm(createEmptyForm())
  clearStatus()
}

function selectPlant(item) {
  selectedId.value = item.id
  patchForm(item)
  clearStatus()
}

async function loadPlants() {
  pushBusy('Carregando especies...')

  try {
    plants.value = await fetchPlants()
    plants.value.sort((a, b) => {
      const left = (a.commonName || a.scientificName || a.id || '').toLowerCase()
      const right = (b.commonName || b.scientificName || b.id || '').toLowerCase()
      return left.localeCompare(right)
    })

    if (platePlantId.value && !plants.value.some((item) => item.id === platePlantId.value)) {
      platePlantId.value = ''
      clearCanvas()
    }
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao carregar especies.', true)
  } finally {
    popBusy()
  }
}

async function saveCurrentPlant() {
  clearStatus()

  if (!form.id.trim()) {
    setStatus('ID da especie eh obrigatorio.', true)
    return
  }

  try {
    const previousPlant = selectedId.value
      ? plants.value.find((item) => item.id === selectedId.value) || null
      : null
    const previousImages = Array.isArray(previousPlant?.images) ? previousPlant.images : []

    const images = await buildImagesFromUpload()

    if (images === null) {
      return
    }

    const latitude = parseCoordinate(form.geoLocation.latitude)
    const longitude = parseCoordinate(form.geoLocation.longitude)
    const geoLocation = latitude !== null && longitude !== null ? { latitude, longitude } : null

    await upsertPlant({
      ...form,
      images,
      geoLocation,
    })

    const removedPaths = collectStoragePaths(previousImages).filter(
      (path) => !collectStoragePaths(images).includes(path)
    )
    const failedRemovals = await removeStoragePaths(removedPaths)

    await loadPlants()
    selectedId.value = form.id.trim()
    const refreshed = plants.value.find((item) => item.id === selectedId.value)
    if (refreshed) {
      patchForm(refreshed)
    }

    if (failedRemovals.length) {
      setStatus('Registro salvo, mas algumas fotos antigas nao puderam ser removidas do Storage.', true)
      return
    }

    setStatus('Registro salvo com sucesso.')
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao salvar registro.', true)
  }
}

async function removeCurrentPlant() {
  if (!selectedId.value) {
    return
  }

  const confirmed = window.confirm(`Deseja excluir a especie ${selectedId.value}?`)
  if (!confirmed) {
    return
  }

  clearStatus()
  pushBusy('Excluindo registro e fotos associadas...')

  try {
    const selectedPlant = plants.value.find((item) => item.id === selectedId.value) || null
    const currentPaths = collectStoragePaths(selectedPlant?.images || [])

    await deletePlantById(selectedId.value)
    const failedRemovals = await removeStoragePaths(currentPaths)

    await loadPlants()
    startNewPlant()

    if (failedRemovals.length) {
      setStatus('Registro removido, mas algumas fotos nao puderam ser excluidas do Storage.', true)
      return
    }

    setStatus('Registro removido com sucesso.')
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao remover registro.', true)
  } finally {
    popBusy()
  }
}

async function handleCsvUpload(event) {
  clearStatus()

  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const parsed = await parseCsvFile(file)
    csvRows.value = parsed.rows
      .map((row) => normalizeCsvRow(row))
      .filter((row) => Boolean(row.id))

    setStatus(`${csvRows.value.length} registro(s) prontos para importacao.`)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao ler CSV.', true)
  }
}

function clearCsv() {
  csvRows.value = []
  if (csvInputRef.value) {
    csvInputRef.value.value = ''
  }
  clearStatus()
}

async function importCsvRows() {
  if (!csvRows.value.length) {
    return
  }

  clearStatus()
  pushBusy('Importando registros CSV...')

  try {
    const result = await importPlantsBatch(csvRows.value)
    await loadPlants()
    setStatus(`Importacao concluida: ${result.total} registro(s) em modo ${result.mode}.`)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao importar CSV.', true)
  } finally {
    popBusy()
  }
}

function getSpeciesUrl(plantId) {
  const origin = window.location.origin
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${origin}${normalizedBase}especie/${plantId}`
}

function clearCanvas() {
  const canvas = plateCanvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
}

function openTemplatePicker() {
  plateTemplateInputRef.value?.click()
}

function exportPlateTemplate() {
  const payload = {
    version: 1,
    width: plateWidth.value,
    height: plateHeight.value,
    colors: {
      background: plateTheme.background,
      accent: plateTheme.accent,
      text: plateTheme.text,
      qrDark: plateTheme.qrDark,
    },
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = 'template-placa-jbsm.json'
  link.click()
  URL.revokeObjectURL(link.href)
}

async function importPlateTemplate(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const raw = await file.text()
    const template = JSON.parse(raw)

    plateWidth.value = Number(template.width) || plateWidth.value
    plateHeight.value = Number(template.height) || plateHeight.value
    plateTheme.background = template.colors?.background || plateTheme.background
    plateTheme.accent = template.colors?.accent || plateTheme.accent
    plateTheme.text = template.colors?.text || plateTheme.text
    plateTheme.qrDark = template.colors?.qrDark || plateTheme.qrDark

    setStatus('Template de placa importado com sucesso.')
    await renderPlate()
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao importar template JSON.', true)
  } finally {
    if (plateTemplateInputRef.value) {
      plateTemplateInputRef.value.value = ''
    }
  }
}

function drawWrappedText(ctx, text, x, startY, maxWidth, lineHeight) {
  if (!text) {
    return startY
  }

  const words = text.split(/\s+/)
  let line = ''
  let y = startY

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      line = word
      y += lineHeight
    } else {
      line = testLine
    }
  }

  if (line) {
    ctx.fillText(line, x, y)
    y += lineHeight
  }

  return y
}

async function renderPlate() {
  const canvas = plateCanvasRef.value
  const plant = selectedPlatePlant.value

  if (!canvas || !plant) {
    clearCanvas()
    return
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return
  }

  canvas.width = plateWidth.value
  canvas.height = plateHeight.value

  ctx.fillStyle = plateTheme.background
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = plateTheme.accent
  ctx.fillRect(0, 0, canvas.width, 14)

  const qrSize = Math.min(canvas.height - 56, 240)
  const qrX = 28
  const qrY = Math.floor((canvas.height - qrSize) / 2)

  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, getSpeciesUrl(plant.id), {
    width: qrSize,
    margin: 2,
    color: {
      dark: plateTheme.qrDark,
      light: '#ffffff',
    },
  })

  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize)

  const textX = qrX + qrSize + 28
  const textMaxWidth = Math.max(180, canvas.width - textX - 20)
  let textY = qrY + 52

  ctx.fillStyle = plateTheme.text
  ctx.font = '700 34px Manrope, sans-serif'
  ctx.fillText('JBSM', textX, textY)

  textY += 48
  ctx.font = '700 30px Manrope, sans-serif'
  textY = drawWrappedText(
    ctx,
    plant.commonName || 'Sem nome popular',
    textX,
    textY,
    textMaxWidth,
    34
  )

  ctx.font = 'italic 24px Merriweather, serif'
  textY = drawWrappedText(
    ctx,
    plant.scientificName || 'Nome cientifico nao informado',
    textX,
    textY,
    textMaxWidth,
    30
  )

  ctx.font = '500 20px Manrope, sans-serif'
  ctx.fillStyle = plateTheme.accent
  ctx.fillText(`Codigo: ${plant.code || plant.id}`, textX, textY)

  textY += 28
  textY = drawWrappedText(ctx, `URL: ${getSpeciesUrl(plant.id)}`, textX, textY, textMaxWidth, 24)

  if (plant.family) {
    ctx.fillText(`Familia: ${plant.family}`, textX, textY + 4)
  }
}

function downloadPlate() {
  const canvas = plateCanvasRef.value
  if (!canvas || !selectedPlatePlant.value) {
    return
  }

  const link = document.createElement('a')
  link.href = canvas.toDataURL('image/png')
  link.download = `placa-${selectedPlatePlant.value.id}.png`
  link.click()
}

onMounted(async () => {
  await syncAdminTabQuery(activeTab.value)
  patchForm(createEmptyForm())
  await loadPlants()
  await nextTick()
  clearCanvas()
})

watch(
  form,
  () => {
    if (!suppressSnapshotTracking.value) {
      formSnapshotVersion.value += 1
    }
  },
  { deep: true }
)

watch(
  () => route.query.tab,
  (tab) => {
    const normalized = normalizeAdminTab(typeof tab === 'string' ? tab : 'records')
    if (normalized !== activeTab.value) {
      activeTab.value = normalized
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.edit-actions-bar {
  position: sticky;
  bottom: 0;
  z-index: 8;
  margin-top: 1rem;
  padding: 0.9rem 0 0.25rem;
  background: linear-gradient(180deg, rgba(255, 254, 249, 0), rgba(255, 254, 249, 0.96) 24%);
}
</style>
