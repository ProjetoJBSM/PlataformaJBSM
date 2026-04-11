<template>
  <div class="container fade-up">
    <section class="section admin-shell" style="margin-top: 0.5rem">
      <header class="section-header">
        <h1 class="section-title">Administração do acervo</h1>
        <p class="section-subtitle">
          Cadastre espécies, importe CSV para sincronização e gere placas com QR Code.
        </p>
      </header>

      <div class="admin-tabs">
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'records' }"
          type="button"
          @click="activeTab = 'records'"
        >
          Registros
        </button>
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'csv' }"
          type="button"
          @click="activeTab = 'csv'"
        >
          Importação CSV
        </button>
        <button
          class="admin-tab"
          :class="{ active: activeTab === 'plates' }"
          type="button"
          @click="activeTab = 'plates'"
        >
          Geração de placas
        </button>
      </div>

      <div v-if="statusMessage" class="state-box" :class="statusError ? 'state-error' : 'state-loading'">
        {{ statusMessage }}
      </div>

      <div v-if="activeTab === 'records'" class="split-layout">
        <aside class="panel">
          <h3>Espécies</h3>
          <div class="form-actions" style="margin-top: 0.6rem">
            <button class="btn btn-secondary" type="button" @click="startNewPlant">Nova espécie</button>
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

            <div v-if="!plants.length" class="empty-state">Nenhuma espécie cadastrada.</div>
          </div>
        </aside>

        <div class="panel">
          <h3>{{ selectedId ? 'Editar espécie' : 'Nova espécie' }}</h3>

          <form class="form-grid" style="margin-top: 0.85rem" @submit.prevent="saveCurrentPlant">
            <label>
              <span class="field-label">ID</span>
              <input v-model="form.id" class="input" required placeholder="Ex.: 01048" />
            </label>
            <label>
              <span class="field-label">Código</span>
              <input v-model="form.code" class="input" placeholder="Opcional" />
            </label>
            <label>
              <span class="field-label">Nome popular</span>
              <input v-model="form.commonName" class="input" />
            </label>
            <label>
              <span class="field-label">Nome científíco</span>
              <input v-model="form.scientificName" class="input" />
            </label>
            <label>
              <span class="field-label">Família</span>
              <input v-model="form.family" class="input" />
            </label>
            <label>
              <span class="field-label">Tipo</span>
              <input v-model="form.type" class="input" placeholder="Árvore, arbusto..." />
            </label>
            <label>
              <span class="field-label">Origem</span>
              <input v-model="form.origin" class="input" />
            </label>
            <label>
              <span class="field-label">Localização</span>
              <input v-model="form.location" class="input" />
            </label>
            <label class="field-full">
              <span class="field-label">URL imagem baixa (400px)</span>
              <input v-model="form.imageLow" class="input" type="url" placeholder="https://..." />
            </label>
            <label class="field-full">
              <span class="field-label">URL imagem media (800px)</span>
              <input v-model="form.imageMedium" class="input" type="url" placeholder="https://..." />
            </label>
            <label class="field-full">
              <span class="field-label">URL imagem alta (1920px)</span>
              <input v-model="form.imageHigh" class="input" type="url" placeholder="https://..." />
            </label>
            <label class="field-full">
              <span class="field-label">Descrição</span>
              <textarea v-model="form.description" class="textarea"></textarea>
            </label>
            <label class="field-full">
              <span class="field-label">Observações do curador</span>
              <textarea v-model="form.curatorNotes" class="textarea"></textarea>
            </label>

            <div class="field-full form-actions">
              <button class="btn btn-primary" type="submit">Salvar</button>
              <button class="btn btn-secondary" type="button" @click="startNewPlant">Limpar formulário</button>
              <button class="btn btn-danger" type="button" :disabled="!selectedId" @click="removeCurrentPlant">
                Excluir
              </button>
            </div>
          </form>
        </div>
      </div>

      <div v-else-if="activeTab === 'csv'" class="panel">
        <h3>Sincronizar por CSV</h3>
        <p style="margin-top: 0.45rem; color: var(--muted)">
          Envie um CSV com colunas conhecidas (id, código, nome popular, nome científíco, família,
          origem, tipo, descrição, localização, observações e imagens).
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
                <th>Nome científíco</th>
                <th>Família</th>
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
          Selecione uma espécie, gere a placa e baixe como imagem PNG para impressão.
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import QRCode from 'qrcode'

import { normalizeCsvRow, parseCsvFile } from '../services/csvUtils'
import {
  deletePlantById,
  fetchPlants,
  importPlantsBatch,
  upsertPlant,
} from '../services/plantsRepository'

const activeTab = ref('records')
const plants = ref([])
const selectedId = ref('')

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

const statusMessage = ref('')
const statusError = ref(false)

const form = reactive(createEmptyForm())

const selectedPlatePlant = computed(() => plants.value.find((item) => item.id === platePlantId.value) || null)

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
    imageLow: '',
    imageMedium: '',
    imageHigh: '',
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

function buildImagesFromForm() {
  const low = form.imageLow.trim()
  const medium = form.imageMedium.trim() || low
  const high = form.imageHigh.trim() || medium || low

  if (!low && !medium && !high) {
    return []
  }

  return [
    {
      low,
      medium,
      high,
      alt: form.commonName || form.scientificName || 'Imagem da especie',
    },
  ]
}

function patchForm(data) {
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
  form.imageLow = data.images?.[0]?.low || ''
  form.imageMedium = data.images?.[0]?.medium || ''
  form.imageHigh = data.images?.[0]?.high || ''
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
    setStatus(err instanceof Error ? err.message : 'Falha ao carregar espécies.', true)
  }
}

async function saveCurrentPlant() {
  clearStatus()

  try {
    await upsertPlant({
      ...form,
      images: buildImagesFromForm(),
    })

    await loadPlants()
    selectedId.value = form.id.trim()
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

  try {
    await deletePlantById(selectedId.value)
    await loadPlants()
    startNewPlant()
    setStatus('Registro removido com sucesso.')
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao remover registro.', true)
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

    setStatus(`${csvRows.value.length} registro(s) prontos para importação.`)
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

  try {
    const result = await importPlantsBatch(csvRows.value)
    await loadPlants()
    setStatus(`Importação concluída: ${result.total} registro(s) em modo ${result.mode}.`)
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Falha ao importar CSV.', true)
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
    plant.scientificName || 'Nome científíco não informado',
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
    ctx.fillText(`Família: ${plant.family}`, textX, textY + 4)
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
  await loadPlants()
  await nextTick()
  clearCanvas()
})
</script>
