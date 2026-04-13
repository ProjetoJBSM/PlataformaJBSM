<template>
  <div class="plate-generator-layout">
    <div class="panel plate-config-panel">
      <h3>Gerador de placas QR</h3>

      <div class="species-selector" ref="speciesPickerRef" @mousedown.stop @click.stop>
        <span class="field-label">Especies</span>
        <button class="input species-selector-trigger" type="button" @click.stop="toggleSpeciesPicker">
          {{ selectedCodesSummary }}
        </button>

        <div v-if="speciesPickerOpen" class="species-selector-menu" @mousedown.stop @click.stop>
          <label class="species-option all">
            <input
              ref="selectAllCheckboxRef"
              type="checkbox"
              :checked="allSpeciesSelected"
              @change="toggleSelectAllSpecies"
            />
            Selecionar tudo
          </label>

          <div class="species-options-list">
            <label v-for="plant in sortedPlantsByCode" :key="plant.id" class="species-option">
              <input
                type="checkbox"
                :checked="selectedSpeciesIdSet.has(plant.id)"
                @change="toggleSpeciesSelection(plant.id, $event.target.checked)"
              />
              <span class="species-code">{{ getSpeciesCode(plant) }}</span>
              <small class="species-name">{{ plant.commonName || plant.scientificName || 'Sem nome' }}</small>
            </label>

            <div v-if="!sortedPlantsByCode.length" class="empty-state">
              Nenhuma especie registrada.
            </div>
          </div>
        </div>
      </div>

      <div class="plate-subtabs" role="tablist" aria-label="Abas de customizacao de placas">
        <button
          class="subtab-btn"
          :class="{ active: plateSubTab === 'models' }"
          :disabled="!hasSelectedSpecies"
          type="button"
          @click="setSubTab('models')"
        >
          Modelos
        </button>
        <button
          class="subtab-btn"
          :class="{ active: plateSubTab === 'customize' }"
          :disabled="!hasSelectedSpecies"
          type="button"
          @click="setSubTab('customize')"
        >
          Customizar
        </button>
        <button
          class="subtab-btn"
          :class="{ active: plateSubTab === 'export' }"
          :disabled="!hasSelectedSpecies"
          type="button"
          @click="setSubTab('export')"
        >
          Exportar
        </button>
      </div>

      <p v-if="!hasSelectedSpecies" class="subtab-hint">
        Selecione ao menos uma especie para habilitar as abas de modelos, customizacao e exportacao.
      </p>

      <section v-if="plateSubTab === 'models'" class="subtab-panel" :aria-disabled="!hasSelectedSpecies">
        <div class="form-actions">
          <button class="btn btn-secondary" type="button" @click="startNewModel" :disabled="!hasSelectedSpecies">
            Criar modelo
          </button>
          <button class="btn btn-secondary" type="button" @click="openModelFilePicker" :disabled="!hasSelectedSpecies">
            Carregar modelo
          </button>
          <button class="btn btn-secondary" type="button" @click="refreshStoredModels" :disabled="loadingModels">
            Atualizar lista
          </button>
          <input
            ref="modelFileInputRef"
            class="sr-only"
            type="file"
            accept="application/json,.json"
            @change="handleModelFileUpload"
          />
        </div>

        <div class="models-toolbar">
          <label class="field-full">
            <span class="field-label">Nome do modelo</span>
            <input v-model="modelName" class="input" placeholder="Ex.: modelo-placa-padrao" />
          </label>
          <button class="btn btn-primary" type="button" @click="saveCurrentModelToPlatform" :disabled="!hasSelectedSpecies">
            Salvar modelo na plataforma
          </button>
        </div>

        <div class="models-list" :class="{ loading: loadingModels }">
          <div v-for="item in availableModels" :key="item.id" class="model-item-row">
            <button
              class="model-item"
              :class="{ active: selectedModelId === item.id }"
              type="button"
              @click="selectStoredModel(item)"
              :disabled="!hasSelectedSpecies"
            >
              <strong>{{ item.name }}</strong>
              <span>{{ formatDate(item.updatedAt) }}</span>
            </button>

            <button
              class="btn btn-danger model-delete-btn"
              type="button"
              @click.stop="removeStoredModel(item)"
              :disabled="loadingModels || isWorking"
            >
              Excluir
            </button>
          </div>

          <div v-if="!availableModels.length && !loadingModels" class="empty-state">
            Nenhum modelo salvo ainda.
          </div>
        </div>
      </section>

      <section v-else-if="plateSubTab === 'customize'" class="subtab-panel customize-panel">
        <div class="customize-subtabs" role="tablist" aria-label="Categorias de customizacao">
          <button
            class="subtab-btn"
            :class="{ active: customizeTab === 'background' }"
            type="button"
            @click="setCustomizeTab('background')"
          >
            Fundo
          </button>
          <button
            class="subtab-btn"
            :class="{ active: customizeTab === 'qrcode' }"
            type="button"
            @click="setCustomizeTab('qrcode')"
          >
            QRCode
          </button>
          <button
            class="subtab-btn"
            :class="{ active: customizeTab === 'texts' }"
            type="button"
            @click="setCustomizeTab('texts')"
          >
            Textos
          </button>
          <button
            class="subtab-btn"
            :class="{ active: customizeTab === 'images' }"
            type="button"
            @click="setCustomizeTab('images')"
          >
            Imagens
          </button>
        </div>

        <div class="customize-tab-body">
          <section v-show="customizeTab === 'background'" class="customize-pane">
            <div class="background-grid">
              <label>
                <span class="field-label">Modelo de pagina</span>
                <select v-model="pageSize" class="select">
                  <option value="A4">A4</option>
                  <option value="Letter">Letter</option>
                  <option value="Custom">Personalizado</option>
                </select>
              </label>

              <label>
                <span class="field-label">Rotacao da pagina</span>
                <div class="inline-controls">
                  <input class="input" :value="`${pageRotation}°`" disabled />
                  <button class="btn btn-secondary" type="button" @click="rotatePage">Rotacionar</button>
                </div>
              </label>

              <div class="custom-size-cell" :class="{ 'is-disabled': pageSize !== 'Custom' }">
                <span class="field-label">Dimensoes personalizadas (pt)</span>
                <div class="dimension-inline">
                  <input
                    v-model.number="customW"
                    class="input"
                    type="number"
                    min="100"
                    placeholder="Largura"
                    :disabled="pageSize !== 'Custom'"
                  />
                  <input
                    v-model.number="customH"
                    class="input"
                    type="number"
                    min="100"
                    placeholder="Altura"
                    :disabled="pageSize !== 'Custom'"
                  />
                </div>
              </div>

              <label>
                <span class="field-label">Cor de fundo</span>
                <input v-model="backgroundColor" class="input" type="color" />
              </label>

              <label>
                <span class="field-label">Margem direita do texto (pt)</span>
                <input v-model.number="textRightMargin" class="input" type="number" min="0" max="500" step="5" />
              </label>

              <label>
                <span class="field-label">Template de fundo (PDF, PNG ou JPG)</span>
                <div class="inline-controls">
                  <button class="btn btn-secondary" type="button" @click="openTemplatePicker">Escolher arquivo</button>
                  <button class="btn btn-secondary" type="button" @click="clearTemplate">Limpar</button>
                </div>
                <small class="template-info">{{ templateState.info || 'Nenhum template carregado.' }}</small>
                <input
                  ref="templateFileInputRef"
                  class="sr-only"
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  @change="handleTemplateFile"
                />
              </label>
            </div>
          </section>

          <section v-show="customizeTab === 'qrcode'" class="customize-pane">
            <div class="qr-rows">
              <div class="qr-row qr-source-row" :class="{ 'with-text': qrSettings.contentMode === 'text' }">
                <label class="qr-source-mode">
                  <span class="field-label">Conteudo do QR</span>
                  <select v-model="qrSettings.contentMode" class="select">
                    <option value="url">URL da especie</option>
                    <option value="field">Campo da planta</option>
                    <option value="text">Texto personalizado</option>
                  </select>
                </label>

                <label v-if="qrSettings.contentMode === 'text'" class="qr-source-text">
                  <span class="field-label">Texto do QR</span>
                  <input
                    v-model="qrSettings.customText"
                    class="input"
                    type="text"
                    placeholder="Digite o texto para codificar"
                  />
                </label>
              </div>

              <div v-if="qrSettings.contentMode === 'field'" class="qr-row">
                <label>
                  <span class="field-label">Campo da planta</span>
                  <select v-model="qrSettings.fieldSource" class="select">
                    <option v-for="option in qrPayloadFieldOptions" :key="option.value" :value="option.value">
                      {{ option.label }}
                    </option>
                  </select>
                </label>
              </div>

              <div class="qr-row two-columns">
                <label class="slider-control">
                  <span class="field-label">Tamanho do QR (pt)</span>
                  <div class="slider-with-input">
                    <input v-model.number="qrSettings.size" type="range" min="50" :max="qrMaxSize" step="1" />
                    <input v-model.number="qrSettings.size" class="input slider-number" type="number" min="50" :max="qrMaxSize" step="1" />
                  </div>
                </label>

                <label>
                  <span class="field-label">Cor do QR</span>
                  <input v-model="qrSettings.color" class="input" type="color" />
                </label>
              </div>

              <div class="qr-row two-columns">
                <label class="slider-control">
                  <span class="field-label">Posicao X (pt)</span>
                  <div class="slider-with-input">
                    <input v-model.number="qrSettings.x" type="range" min="0" :max="qrMaxX" step="1" />
                    <input v-model.number="qrSettings.x" class="input slider-number" type="number" min="0" :max="qrMaxX" step="1" />
                  </div>
                </label>

                <label class="slider-control">
                  <span class="field-label">Posicao Y (pt)</span>
                  <div class="slider-with-input">
                    <input v-model.number="qrSettings.y" type="range" min="0" :max="qrMaxY" step="1" />
                    <input v-model.number="qrSettings.y" class="input slider-number" type="number" min="0" :max="qrMaxY" step="1" />
                  </div>
                </label>
              </div>

              <div class="qr-row two-columns">
                <label>
                  <span class="field-label">Nivel ECC</span>
                  <select v-model="qrSettings.ecc" class="select">
                    <option value="L">L - Baixo</option>
                    <option value="M">M - Medio</option>
                    <option value="Q">Q - Alto</option>
                    <option value="H">H - Muito alto</option>
                  </select>
                </label>

                <label>
                  <span class="field-label">Quiet zones (modulos)</span>
                  <input v-model.number="qrSettings.margin" class="input" type="number" min="0" max="20" />
                </label>
              </div>

              <div class="qr-row toggle-row">
                <label class="checkbox-line compact">
                  <input v-model="qrSettings.background" type="checkbox" />
                  Fundo branco
                </label>
                <label class="checkbox-line compact">
                  <input v-model="qrSettings.showText" type="checkbox" />
                  Mostrar conteudo
                </label>
              </div>

              <div v-if="qrSettings.showText" class="qr-row two-columns">
                <label>
                  <span class="field-label">Fonte do texto (pt)</span>
                  <input v-model.number="qrSettings.fontSize" class="input" type="number" min="8" max="24" />
                </label>

                <label>
                  <span class="field-label">Maximo de caracteres</span>
                  <input v-model.number="qrSettings.maxChars" class="input" type="number" min="20" max="200" />
                </label>
              </div>
            </div>
          </section>

          <section v-show="customizeTab === 'texts'" class="customize-pane">
            <div class="form-actions">
              <button class="btn btn-secondary" type="button" @click="addTextField">Adicionar campo de texto</button>
              <button class="btn btn-secondary" type="button" @click="openFontPicker">Adicionar fonte TTF/OTF</button>
              <input
                ref="fontFileInputRef"
                class="sr-only"
                type="file"
                accept=".ttf,.otf"
                @change="loadCustomFontFile"
              />
            </div>

            <div v-if="customFonts.length" class="chips">
              <span v-for="font in customFonts" :key="font.name" class="chip">{{ font.name }}</span>
            </div>

            <div class="custom-items-scroll">
              <div v-if="!textFields.length" class="empty-state">Nenhum campo de texto configurado.</div>

              <div v-for="(field, index) in textFields" :key="field.id" class="custom-item">
                <div class="custom-item-header">
                  <strong>Texto {{ index + 1 }}</strong>
                  <button class="btn btn-danger" type="button" @click="removeTextField(index)">Remover</button>
                </div>

                <div class="item-line item-line-main">
                  <label class="checkbox-line compact">
                    <input v-model="field.useDatabase" type="checkbox" />
                    Usar base de dados
                  </label>

                  <label class="item-main-field">
                    <span class="field-label">{{ field.useDatabase ? 'Variavel da planta' : 'Texto padrao' }}</span>
                    <select v-if="field.useDatabase" v-model="field.source" class="select">
                      <option value="" disabled>Selecione uma variavel</option>
                      <option v-for="opt in speciesFieldOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                    <input
                      v-else
                      v-model="field.text"
                      class="input"
                      placeholder="Ex.: &#123;&#123;commonName&#125;&#125;"
                    />
                  </label>
                </div>

                <div class="item-line">
                  <label class="slider-control">
                    <span class="field-label">Posicao X (pt)</span>
                    <div class="slider-with-input">
                      <input v-model.number="field.x" type="range" min="0" :max="Math.round(currentPageDimensions.width)" step="1" />
                      <input v-model.number="field.x" class="input slider-number" type="number" min="0" :max="Math.round(currentPageDimensions.width)" step="1" />
                    </div>
                  </label>

                  <label class="slider-control">
                    <span class="field-label">Posicao Y (pt)</span>
                    <div class="slider-with-input">
                      <input v-model.number="field.y" type="range" min="0" :max="Math.round(currentPageDimensions.height)" step="1" />
                      <input v-model.number="field.y" class="input slider-number" type="number" min="0" :max="Math.round(currentPageDimensions.height)" step="1" />
                    </div>
                  </label>
                </div>

                <div class="item-line item-style-grid">
                  <label>
                    <span class="field-label">Fonte</span>
                    <select v-model="field.fontFamily" class="select">
                      <option value="Helvetica">Helvetica</option>
                      <option value="Times">Times</option>
                      <option value="Courier">Courier</option>
                      <option v-for="font in customFonts" :key="font.name" :value="font.name">
                        {{ font.name }}
                      </option>
                    </select>
                  </label>

                  <label>
                    <span class="field-label">Tamanho</span>
                    <input v-model.number="field.size" class="input" type="number" min="6" max="72" />
                  </label>

                  <label>
                    <span class="field-label">Cor</span>
                    <input v-model="field.color" class="input" type="color" />
                  </label>

                  <label class="checkbox-line compact style-toggle">
                    <input v-model="field.bold" type="checkbox" />
                    Negrito
                  </label>

                  <label class="checkbox-line compact style-toggle">
                    <input v-model="field.underline" type="checkbox" />
                    Sublinhado
                  </label>

                  <label class="checkbox-line compact style-toggle">
                    <input v-model="field.italic" type="checkbox" />
                    Italico
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section v-show="customizeTab === 'images'" class="customize-pane">
            <div class="form-actions">
              <button class="btn btn-secondary" type="button" @click="addImageField">Adicionar imagem</button>
            </div>

            <div class="custom-items-scroll">
              <div v-if="!imageFields.length" class="empty-state">Nenhuma imagem adicionada.</div>

              <div v-for="(field, index) in imageFields" :key="field.id" class="custom-item">
                <div class="custom-item-header">
                  <strong>Imagem {{ index + 1 }}</strong>
                  <button class="btn btn-danger" type="button" @click="removeImageField(index)">Remover</button>
                </div>

                <div class="item-line image-upload-row">
                  <label class="item-main-field">
                    <span class="field-label">Imagem do modelo</span>
                    <div class="inline-controls">
                      <button class="btn btn-secondary" type="button" @click="openImagePicker(index)">
                        Escolher imagem
                      </button>
                      <span class="filename filename-truncated" :title="field.fileName || 'Nenhuma imagem'">
                        {{ formatFileName(field.fileName, 30) || 'Nenhuma imagem' }}
                      </span>
                    </div>
                    <input
                      :ref="(el) => setImageFieldInputRef(index, el)"
                      class="sr-only"
                      type="file"
                      accept="image/png,image/jpeg"
                      @change="(event) => handleImageUpload(event, index)"
                    />
                  </label>

                  <label class="slider-control">
                    <span class="field-label">Escala (%)</span>
                    <div class="slider-with-input">
                      <input v-model.number="field.scale" type="range" min="1" max="400" step="1" />
                      <input v-model.number="field.scale" class="input slider-number" type="number" min="1" max="400" step="1" />
                    </div>
                  </label>
                </div>

                <div class="item-line">
                  <label class="slider-control">
                    <span class="field-label">Posicao X (pt)</span>
                    <div class="slider-with-input">
                      <input v-model.number="field.x" type="range" min="0" :max="Math.round(currentPageDimensions.width)" step="1" />
                      <input v-model.number="field.x" class="input slider-number" type="number" min="0" :max="Math.round(currentPageDimensions.width)" step="1" />
                    </div>
                  </label>

                  <label class="slider-control">
                    <span class="field-label">Posicao Y (pt)</span>
                    <div class="slider-with-input">
                      <input v-model.number="field.y" type="range" min="0" :max="Math.round(currentPageDimensions.height)" step="1" />
                      <input v-model.number="field.y" class="input slider-number" type="number" min="0" :max="Math.round(currentPageDimensions.height)" step="1" />
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section v-else class="subtab-panel">
        <div class="custom-grid">
          <label class="field-full">
            <span class="field-label">Formato de saida</span>
            <select v-model="exportMode" class="select">
              <option value="multiple_pdfs_zip">ZIP com um PDF por especie</option>
              <option value="single_pdf">PDF unico com todas as placas</option>
            </select>
          </label>
        </div>

        <div class="form-actions" style="margin-top: 0.8rem">
          <button class="btn btn-primary" type="button" @click="exportSelectedPlates" :disabled="!hasSelectedSpecies">
            Exportar placas
          </button>
          <button class="btn btn-secondary" type="button" @click="downloadCurrentModelJson">
            Exportar modelo
          </button>
        </div>
      </section>
    </div>

    <div class="panel plate-preview-panel">
      <h3>Preview do modelo</h3>
      <p class="preview-subtitle">
        O preview usa os dados da primeira especie selecionada:
        <strong>{{ previewPlant ? getSpeciesCode(previewPlant) : '-' }}</strong>
      </p>

      <div class="preview-wrapper">
        <iframe
          v-if="previewUrl"
          :src="`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`"
          title="Preview da placa"
        ></iframe>
        <div v-else class="empty-state preview-empty">
          Selecione especies e configure o modelo para visualizar a placa.
        </div>
      </div>
    </div>

    <div v-if="statusMessage" class="state-box" style="max-height: fit-content;" :class="statusError ? 'state-error' : 'state-loading'">
      {{ statusMessage }}
    </div>

    <div v-if="isWorking" class="loading-overlay" role="status" aria-live="polite">
      <div class="loading-dialog">
        <div class="spinner" aria-hidden="true"></div>
        <strong>Aguarde</strong>
        <p>{{ workingMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import JSZip from 'jszip'
import QRCode from 'qrcode'

import { deletePlateModel, listPlateModels, savePlateModel } from '../services/plateModels'

const props = defineProps({
  plants: {
    type: Array,
    default: () => [],
  },
})

const speciesPickerRef = ref(null)
const selectAllCheckboxRef = ref(null)
const speciesPickerOpen = ref(false)
const selectedSpeciesIds = ref([])

const plateSubTab = ref('models')
const customizeTab = ref('background')
const availableModels = ref([])
const loadingModels = ref(false)
const selectedModelId = ref('')

const modelName = ref('modelo-padrao-jbsm')
const modelFileInputRef = ref(null)
const templateFileInputRef = ref(null)
const fontFileInputRef = ref(null)
const imageFieldInputRefs = ref({})

const exportMode = ref('multiple_pdfs_zip')
const isWorking = ref(false)
const workingMessage = ref('')
const statusMessage = ref('')
const statusError = ref(false)
const previewUrl = ref('')

const pageSize = ref('A4')
const customW = ref(595)
const customH = ref(842)
const pageRotation = ref(0)
const backgroundColor = ref('#f8fbf6')
const textRightMargin = ref(40)

const templateState = reactive({
  bytes: null,
  type: null,
  pdf: null,
  imageBytes: null,
  imageElement: null,
  info: '',
  fileName: '',
})

const qrSettings = reactive({
  contentMode: 'url',
  fieldSource: 'code',
  customText: '',
  size: 180,
  x: 48,
  y: 68,
  ecc: 'M',
  margin: 2,
  color: '#1d3d1f',
  background: true,
  showText: false,
  fontSize: 10,
  maxChars: 90,
})

const textFields = ref([])
const imageFields = ref([])
const customFonts = ref([])

let textFieldIdCounter = 0
let imageFieldIdCounter = 0
let previewTimer = null

const speciesFieldOptions = [
  { value: 'id', label: 'ID da especie' },
  { value: 'code', label: 'Codigo' },
  { value: 'commonName', label: 'Nome popular' },
  { value: 'scientificName', label: 'Nome cientifico' },
  { value: 'family', label: 'Familia' },
  { value: 'type', label: 'Tipo' },
  { value: 'origin', label: 'Origem' },
  { value: 'location', label: 'Localizacao' },
  { value: 'description', label: 'Descricao' },
  { value: 'url', label: 'URL da especie' },
]

const qrPayloadFieldOptions = speciesFieldOptions.filter((option) => option.value !== 'url')

const selectedSpeciesIdSet = computed(() => new Set(selectedSpeciesIds.value))

const sortedPlantsByCode = computed(() => {
  return [...(props.plants || [])].sort((left, right) => {
    const leftCode = getSpeciesCode(left)
    const rightCode = getSpeciesCode(right)
    return leftCode.localeCompare(rightCode, 'pt-BR', { numeric: true, sensitivity: 'base' })
  })
})

const selectedSpecies = computed(() => {
  if (!selectedSpeciesIds.value.length) {
    return []
  }

  const selectedIds = selectedSpeciesIdSet.value
  return sortedPlantsByCode.value.filter((plant) => selectedIds.has(plant.id))
})

const hasSelectedSpecies = computed(() => selectedSpecies.value.length > 0)
const previewPlant = computed(() => selectedSpecies.value[0] || null)
const currentPageDimensions = computed(() => getConfiguredPageDimensions())
const qrMaxSize = computed(() => {
  const width = Math.max(50, Math.round(currentPageDimensions.value.width || 595))
  const height = Math.max(50, Math.round(currentPageDimensions.value.height || 842))
  return Math.max(50, Math.min(width, height))
})
const qrMaxX = computed(() => {
  const width = Math.max(50, Math.round(currentPageDimensions.value.width || 595))
  const qrSize = Math.max(50, Math.round(Number(qrSettings.size) || 180))
  return Math.max(0, width - qrSize)
})
const qrMaxY = computed(() => {
  const height = Math.max(50, Math.round(currentPageDimensions.value.height || 842))
  const qrSize = Math.max(50, Math.round(Number(qrSettings.size) || 180))
  return Math.max(0, height - qrSize)
})

const allSpeciesSelected = computed(() => {
  return Boolean(sortedPlantsByCode.value.length) &&
    sortedPlantsByCode.value.length === selectedSpeciesIds.value.length
})

const selectedCodesSummary = computed(() => {
  const currentSelection = selectedSpecies.value
  if (!currentSelection.length) {
    return 'Selecione especies...'
  }

  const visibleLimit = 8
  const visibleCodes = currentSelection
    .slice(0, visibleLimit)
    .map((plant) => getSpeciesCode(plant))
  const remaining = currentSelection.length - visibleLimit

  if (remaining > 0) {
    return `${visibleCodes.join(', ')} +${remaining}`
  }

  return visibleCodes.join(', ')
})

function areArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false
    }
  }

  return true
}

function setStatus(message, isError = false) {
  statusMessage.value = message
  statusError.value = isError
}

function clearStatus() {
  statusMessage.value = ''
  statusError.value = false
}

function setWorking(message) {
  isWorking.value = true
  workingMessage.value = message
}

function clearWorking() {
  isWorking.value = false
  workingMessage.value = ''
}

function getSpeciesCode(plant) {
  return String(plant?.code || plant?.id || '').trim()
}

function getSpeciesUrl(plantId) {
  const origin = window.location.origin
  const basePath = import.meta.env.BASE_URL || '/'
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`
  return `${origin}${normalizedBase}especie/${plantId}`
}

function toggleSpeciesPicker() {
  speciesPickerOpen.value = !speciesPickerOpen.value
}

function toggleSpeciesSelection(plantId, checked) {
  const current = new Set(selectedSpeciesIds.value)

  if (checked) {
    current.add(plantId)
  } else {
    current.delete(plantId)
  }

  selectedSpeciesIds.value = [...current]
}

function toggleSelectAllSpecies(event) {
  const shouldSelectAll = Boolean(event?.target?.checked)
  selectedSpeciesIds.value = shouldSelectAll
    ? sortedPlantsByCode.value.map((plant) => plant.id)
    : []
}

function updateSelectAllIndeterminate() {
  const selectAll = selectAllCheckboxRef.value
  if (!selectAll) {
    return
  }

  const selectedCount = selectedSpeciesIds.value.length
  const total = sortedPlantsByCode.value.length
  selectAll.indeterminate = selectedCount > 0 && selectedCount < total
}

function handleDocumentClick(event) {
  if (!speciesPickerOpen.value) {
    return
  }

  if (speciesPickerRef.value && !speciesPickerRef.value.contains(event.target)) {
    speciesPickerOpen.value = false
  }
}

function setSubTab(tab) {
  if (!hasSelectedSpecies.value) {
    return
  }

  plateSubTab.value = tab
  if (tab === 'customize' && !customizeTab.value) {
    customizeTab.value = 'background'
  }
}

function setCustomizeTab(tab) {
  customizeTab.value = tab
}

function rotatePage() {
  pageRotation.value = (pageRotation.value + 90) % 360
}

function openTemplatePicker() {
  templateFileInputRef.value?.click()
}

async function clearTemplate() {
  templateState.bytes = null
  templateState.type = null
  templateState.pdf = null
  templateState.imageBytes = null
  templateState.imageElement = null
  templateState.info = ''
  templateState.fileName = ''
  if (templateFileInputRef.value) {
    templateFileInputRef.value.value = ''
  }
  schedulePreviewRender()
}

async function handleTemplateFile(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())

    templateState.bytes = bytes
    templateState.fileName = file.name
    templateState.pdf = null
    templateState.imageElement = null
    templateState.imageBytes = null

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      templateState.type = 'pdf'
      templateState.pdf = await PDFDocument.load(bytes)
      const firstPage = templateState.pdf.getPages()[0]
      templateState.info =
        `Template PDF carregado: ${file.name} (${Math.round(firstPage.getWidth())} x ${Math.round(firstPage.getHeight())} pt)`
    } else {
      templateState.type = 'image'
      templateState.imageBytes = bytes
      templateState.imageElement = await bytesToImage(bytes)
      templateState.info =
        `Template de imagem carregado: ${file.name} (${templateState.imageElement.naturalWidth} x ${templateState.imageElement.naturalHeight} px)`
    }

    schedulePreviewRender()
  } catch (error) {
    setStatus(`Falha ao carregar template: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}

function createTextField(overrides = {}) {
  return {
    id: textFieldIdCounter += 1,
    useDatabase: false,
    source: '',
    text: '',
    x: 260,
    y: 82,
    size: 24,
    fontFamily: 'Helvetica',
    bold: false,
    italic: false,
    underline: false,
    color: '#1f3220',
    ...overrides,
  }
}

function createDefaultTextFields() {
  return [
    createTextField({ useDatabase: true, source: 'commonName', size: 30, bold: true, y: 84, color: '#1f3220' }),
    createTextField({ useDatabase: true, source: 'scientificName', size: 24, italic: true, y: 124, color: '#2b4a2e' }),
    createTextField({ text: 'Codigo: {{code}}', size: 18, y: 162, color: '#2b4a2e' }),
    createTextField({ text: 'Familia: {{family}}', size: 16, y: 188, color: '#2b4a2e' }),
  ]
}

function addTextField() {
  textFields.value.push(createTextField())
}

function removeTextField(index) {
  textFields.value.splice(index, 1)
}

function createImageField(overrides = {}) {
  return {
    id: imageFieldIdCounter += 1,
    fileName: '',
    imageBytes: null,
    x: 40,
    y: 40,
    scale: 100,
    originalWidth: 100,
    originalHeight: 100,
    ...overrides,
  }
}

function addImageField() {
  imageFields.value.push(createImageField())
}

function removeImageField(index) {
  imageFields.value.splice(index, 1)
}

function setImageFieldInputRef(index, element) {
  if (!element) {
    delete imageFieldInputRefs.value[index]
    return
  }

  imageFieldInputRefs.value[index] = element
}

function openImagePicker(index) {
  imageFieldInputRefs.value[index]?.click()
}

async function handleImageUpload(event, index) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const image = await bytesToImage(bytes)

    imageFields.value[index] = {
      ...imageFields.value[index],
      fileName: file.name,
      imageBytes: bytes,
      originalWidth: image.naturalWidth,
      originalHeight: image.naturalHeight,
    }

    schedulePreviewRender()
  } catch (error) {
    setStatus(`Falha ao carregar imagem: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}

function openFontPicker() {
  fontFileInputRef.value?.click()
}

async function loadCustomFontFile(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    if (!/\.(ttf|otf)$/i.test(file.name)) {
      setStatus('Somente arquivos .ttf ou .otf podem ser adicionados como fonte.', true)
      return
    }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const name = file.name.replace(/\.(ttf|otf)$/i, '')

    if (customFonts.value.some((font) => font.name === name)) {
      setStatus(`A fonte ${name} ja foi carregada.`, true)
      return
    }

    customFonts.value.push({ name, bytes })
    setStatus(`Fonte ${name} carregada com sucesso.`)
    schedulePreviewRender()
  } catch (error) {
    setStatus(`Falha ao carregar fonte: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}

function startNewModel() {
  plateSubTab.value = 'customize'
  selectedModelId.value = ''
  modelName.value = `modelo-${Date.now()}`
  resetDesignerState()
  schedulePreviewRender()
}

function resetDesignerState() {
  customizeTab.value = 'background'
  pageSize.value = 'A4'
  customW.value = 595
  customH.value = 842
  pageRotation.value = 0
  backgroundColor.value = '#f8fbf6'
  textRightMargin.value = 40

  qrSettings.contentMode = 'url'
  qrSettings.fieldSource = 'code'
  qrSettings.customText = ''
  qrSettings.size = 180
  qrSettings.x = 48
  qrSettings.y = 68
  qrSettings.ecc = 'M'
  qrSettings.margin = 2
  qrSettings.color = '#1d3d1f'
  qrSettings.background = true
  qrSettings.showText = false
  qrSettings.fontSize = 10
  qrSettings.maxChars = 90

  textFields.value = createDefaultTextFields()
  imageFields.value = []
  customFonts.value = []

  void clearTemplate()
}

function openModelFilePicker() {
  modelFileInputRef.value?.click()
}

function getUniqueModelName(baseName) {
  const normalized = String(baseName || '').trim() || 'modelo-sem-nome'
  const existingNames = new Set(
    availableModels.value
      .map((item) => String(item?.name || '').trim().toLowerCase())
      .filter(Boolean)
  )

  if (!existingNames.has(normalized.toLowerCase())) {
    return normalized
  }

  let suffix = 1
  let candidate = `${normalized}_${suffix}`

  while (existingNames.has(candidate.toLowerCase())) {
    suffix += 1
    candidate = `${normalized}_${suffix}`
  }

  return candidate
}

async function handleModelFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  try {
    const parsed = JSON.parse(await file.text())
    const importedName = String(parsed?.name || file.name.replace(/\.json$/i, '')).trim() || `modelo-${Date.now()}`
    modelName.value = importedName
    selectedModelId.value = ''

    await applyModelPayload(parsed)
    setStatus(`Modelo ${importedName} carregado no editor. Clique em "Salvar modelo na plataforma" para persistir.`)
  } catch (error) {
    setStatus(`Falha ao carregar modelo: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    if (event.target) {
      event.target.value = ''
    }
  }
}

async function saveCurrentModelToPlatform() {
  if (!hasSelectedSpecies.value) {
    setStatus('Selecione ao menos uma especie para salvar o modelo.', true)
    return
  }

  const normalizedName = modelName.value.trim()
  if (!normalizedName) {
    setStatus('Informe um nome para o modelo.', true)
    return
  }

  const uniqueName = getUniqueModelName(normalizedName)

  try {
    setWorking('Salvando modelo na plataforma...')
    clearStatus()
    modelName.value = uniqueName

    const saved = await savePlateModel(uniqueName, buildModelPayload())
    await refreshStoredModels()

    selectedModelId.value = saved.id
    if (saved?.storagePath) {
      if (uniqueName !== normalizedName) {
        setStatus(`Nome ja existente. Modelo salvo como ${uniqueName}.`)
      } else {
        setStatus(`Modelo ${uniqueName} salvo na plataforma com sucesso.`)
      }
    } else {
      if (uniqueName !== normalizedName) {
        setStatus(`Nome ja existente. Modelo salvo localmente como ${uniqueName}.`)
      } else {
        setStatus(`Modelo ${uniqueName} salvo localmente (sem permissao no Storage).`)
      }
    }
  } catch (error) {
    setStatus(`Falha ao salvar modelo: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    clearWorking()
  }
}

async function refreshStoredModels() {
  loadingModels.value = true

  try {
    availableModels.value = await listPlateModels()
  } catch (error) {
    setStatus(`Falha ao listar modelos: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    loadingModels.value = false
  }
}

async function selectStoredModel(item) {
  if (!item?.model) {
    return
  }

  try {
    selectedModelId.value = item.id
    modelName.value = item.name || modelName.value
    await applyModelPayload(item.model)
    setStatus(`Modelo ${item.name} aplicado.`)
  } catch (error) {
    setStatus(`Falha ao aplicar modelo: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  }
}

async function removeStoredModel(item) {
  if (!item) {
    return
  }

  const confirmed = window.confirm(`Excluir o modelo ${item.name}?`)
  if (!confirmed) {
    return
  }

  try {
    setWorking('Excluindo modelo...')
    clearStatus()

    await deletePlateModel(item)
    await refreshStoredModels()

    if (selectedModelId.value === item.id) {
      selectedModelId.value = ''
    }

    setStatus(`Modelo ${item.name} excluido com sucesso.`)
  } catch (error) {
    setStatus(`Falha ao excluir modelo: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    clearWorking()
  }
}

function buildModelPayload() {
  const nowIso = new Date().toISOString()

  return {
    version: '1.0',
    exportDate: nowIso,
    name: modelName.value.trim() || 'modelo-sem-nome',
    updatedAt: nowIso,
    pageSettings: {
      pageSize: pageSize.value,
      customWidth: customW.value,
      customHeight: customH.value,
      pageRotation: pageRotation.value,
      backgroundColor: backgroundColor.value,
    },
    templateSettings: {
      templateType: templateState.type,
      templateFileName: templateState.fileName,
      templateInfo: templateState.info,
      templateBytes: arrayToBase64(templateState.bytes),
    },
    qrSettings: {
      contentMode: qrSettings.contentMode,
      fieldSource: qrSettings.fieldSource,
      customText: qrSettings.customText,
      qrSize: qrSettings.size,
      posX: qrSettings.x,
      posY: qrSettings.y,
      ecc: qrSettings.ecc,
      margin: qrSettings.margin,
      renderText: qrSettings.showText ? 'yes' : 'no',
      fontSize: qrSettings.fontSize,
      maxChars: qrSettings.maxChars,
      qrColor: qrSettings.color,
      qrBackground: qrSettings.background,
      textRightMargin: textRightMargin.value,
    },
    textFields: textFields.value.map((field) => ({
      text: field.text,
      x: field.x,
      y: field.y,
      size: field.size,
      fontFamily: field.fontFamily,
      bold: field.bold,
      italic: field.italic,
      underline: field.underline,
      color: field.color,
      bindColumn: field.useDatabase ? (field.source || null) : null,
      useColumn: Boolean(field.useDatabase),
    })),
    imageFields: imageFields.value.map((field) => ({
      fileName: field.fileName,
      imageData: null,
      imageBytes: arrayToBase64(field.imageBytes),
      x: field.x,
      y: field.y,
      scale: field.scale,
      originalWidth: field.originalWidth,
      originalHeight: field.originalHeight,
    })),
    customFonts: customFonts.value.map((font) => ({
      name: font.name,
      bytes: arrayToBase64(font.bytes),
    })),
    exportOption: exportMode.value,
  }
}

async function applyModelPayload(model) {
  const page = model?.pageSettings || {}
  const qr = model?.qrSettings || {}
  const template = model?.templateSettings || {}

  const importedQrSize = qr.size ?? qr.qrSize
  const importedQrX = qr.x ?? qr.posX
  const importedQrY = qr.y ?? qr.posY
  const importedQrColor = qr.color ?? qr.qrColor
  const importedQrBackground =
    qr.background !== undefined ? qr.background : qr.qrBackground !== undefined ? qr.qrBackground : true
  const importedShowText =
    qr.showText !== undefined ? qr.showText : qr.renderText === 'yes'
  const importedContentMode = qr.contentMode || qr.sourceMode || qr.qrContentMode || 'url'
  const importedFieldSource = qr.fieldSource || qr.sourceField || qr.qrFieldSource || 'code'
  const importedCustomText = qr.customText || qr.sourceText || qr.qrCustomText || ''

  pageSize.value = page.pageSize || 'A4'
  customW.value = Number(page.customWidth) || 595
  customH.value = Number(page.customHeight) || 842
  pageRotation.value = Number(page.pageRotation) || 0
  backgroundColor.value = page.backgroundColor || '#f8fbf6'
  textRightMargin.value = Number(page.textRightMargin ?? qr.textRightMargin) || 40

  qrSettings.contentMode = ['url', 'field', 'text'].includes(importedContentMode) ? importedContentMode : 'url'
  qrSettings.fieldSource = String(importedFieldSource || 'code')
  qrSettings.customText = String(importedCustomText || '')
  qrSettings.size = Number(importedQrSize) || 180
  qrSettings.x = Number(importedQrX) || 48
  qrSettings.y = Number(importedQrY) || 68
  qrSettings.ecc = ['L', 'M', 'Q', 'H'].includes(qr.ecc) ? qr.ecc : 'M'
  qrSettings.margin = Number.isFinite(Number(qr.margin)) ? Number(qr.margin) : 2
  qrSettings.color = importedQrColor || '#1d3d1f'
  qrSettings.background = importedQrBackground !== false
  qrSettings.showText = Boolean(importedShowText)
  qrSettings.fontSize = Number(qr.fontSize) || 10
  qrSettings.maxChars = Number(qr.maxChars) || 90

  textFields.value = Array.isArray(model?.textFields)
    ? model.textFields.map((field) => {
        const source = field.source || field.bindColumn || ''
        const useDatabase = field.useDatabase !== undefined
          ? Boolean(field.useDatabase)
          : field.useColumn !== undefined
            ? Boolean(field.useColumn)
            : Boolean(source)

        return createTextField({
          useDatabase,
          source,
          text: field.text || '',
          x: Number(field.x) || 0,
          y: Number(field.y) || 0,
          size: Number(field.size) || 14,
          fontFamily: field.fontFamily || 'Helvetica',
          bold: Boolean(field.bold),
          italic: Boolean(field.italic),
          underline: Boolean(field.underline),
          color: field.color || '#1f3220',
        })
      })
    : createDefaultTextFields()

  imageFields.value = Array.isArray(model?.imageFields)
    ? model.imageFields.map((field) => {
        const bytesFromImageData = field.imageBytes ? null : dataUrlToUint8Array(field.imageData)

        return createImageField({
          fileName: field.fileName || '',
          imageBytes: base64ToArray(field.imageBytes) || bytesFromImageData,
          x: Number(field.x) || 0,
          y: Number(field.y) || 0,
          scale: Number(field.scale) || 100,
          originalWidth: Number(field.originalWidth) || 100,
          originalHeight: Number(field.originalHeight) || 100,
        })
      })
    : []

  customFonts.value = Array.isArray(model?.customFonts)
    ? model.customFonts
        .map((font) => ({
          name: font.name,
          bytes: base64ToArray(font.bytes),
        }))
        .filter((font) => font.name && font.bytes)
    : []

  exportMode.value = model?.exportOption === 'single_pdf' ? 'single_pdf' : 'multiple_pdfs_zip'

  templateState.type = template.templateType || null
  templateState.fileName = template.templateFileName || ''
  templateState.info = template.templateInfo || ''
  templateState.bytes = base64ToArray(template.templateBytes)
  templateState.pdf = null
  templateState.imageBytes = null
  templateState.imageElement = null

  if (templateState.bytes) {
    if (templateState.type === 'pdf') {
      templateState.pdf = await PDFDocument.load(templateState.bytes)
    } else if (templateState.type === 'image') {
      templateState.imageBytes = templateState.bytes
      templateState.imageElement = await bytesToImage(templateState.bytes)
    }
  }

  schedulePreviewRender()
}

function downloadCurrentModelJson() {
  try {
    const payload = buildModelPayload()
    const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2))
    downloadBlob(bytes, `${payload.name || 'modelo-placa'}.json`, 'application/json')
    setStatus('Modelo exportado para JSON com sucesso.')
  } catch (error) {
    setStatus(`Falha ao exportar modelo: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  }
}

async function exportSelectedPlates() {
  if (!hasSelectedSpecies.value) {
    setStatus('Selecione ao menos uma especie para exportar.', true)
    return
  }

  clearStatus()

  try {
    if (exportMode.value === 'single_pdf') {
      setWorking('Gerando PDF unico com todas as placas...')
      const bytes = await generateSinglePdf(selectedSpecies.value)
      downloadBlob(bytes, 'placas-jbsm.pdf', 'application/pdf')
      setStatus(`${selectedSpecies.value.length} placa(s) exportada(s) em um PDF unico.`)
      return
    }

    setWorking('Gerando ZIP com um PDF por especie...')
    const zip = new JSZip()

    for (const plant of selectedSpecies.value) {
      const bytes = await generateSinglePdf([plant])
      const code = getSpeciesCode(plant) || plant.id
      zip.file(`placa-${code}.pdf`, bytes)
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    downloadBlob(zipBlob, 'placas-jbsm.zip', 'application/zip')
    setStatus(`${selectedSpecies.value.length} placa(s) exportada(s) em um ZIP.`)
  } catch (error) {
    setStatus(`Falha ao exportar placas: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  } finally {
    clearWorking()
  }
}

async function renderPreview() {
  if (!previewPlant.value) {
    clearPreviewUrl()
    return
  }

  try {
    const bytes = await generateSinglePdf([previewPlant.value])
    setPreviewBytes(bytes)
  } catch (error) {
    setStatus(`Falha ao renderizar preview: ${error instanceof Error ? error.message : 'erro desconhecido'}`, true)
  }
}

function schedulePreviewRender() {
  if (previewTimer) {
    window.clearTimeout(previewTimer)
  }

  previewTimer = window.setTimeout(() => {
    void renderPreview()
  }, 220)
}

function clearPreviewUrl() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

function setPreviewBytes(bytes) {
  clearPreviewUrl()
  const blob = new Blob([bytes], { type: 'application/pdf' })
  previewUrl.value = URL.createObjectURL(blob)
}

async function generateSinglePdf(speciesList) {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  for (const plant of speciesList) {
    await drawPlatePage(pdfDoc, plant)
  }

  return pdfDoc.save()
}

function getConfiguredPageDimensions() {
  let width = 595
  let height = 842

  if (pageSize.value === 'Letter') {
    width = 612
    height = 792
  } else if (pageSize.value === 'Custom') {
    width = Number(customW.value) || 595
    height = Number(customH.value) || 842
  }

  if (pageRotation.value === 90 || pageRotation.value === 270) {
    return { width: height, height: width }
  }

  return { width, height }
}

async function drawPlatePage(pdfDoc, plant) {
  if (templateState.type === 'pdf' && templateState.bytes) {
    const srcPdf = templateState.pdf || (await PDFDocument.load(templateState.bytes))
    const firstPage = srcPdf.getPages()[0]

    const baseW = firstPage.getWidth()
    const baseH = firstPage.getHeight()

    let pageW = baseW
    let pageH = baseH

    if (pageRotation.value === 90 || pageRotation.value === 270) {
      pageW = baseH
      pageH = baseW
    }

    const [embedded] = await pdfDoc.embedPdf(templateState.bytes, [0])
    const page = pdfDoc.addPage([pageW, pageH])

    const drawOptions = {
      x: 0,
      y: 0,
      width: baseW,
      height: baseH,
    }

    if (pageRotation.value !== 0) {
      drawOptions.rotate = degrees(pageRotation.value)

      if (pageRotation.value === 90) {
        drawOptions.x = pageW
      } else if (pageRotation.value === 180) {
        drawOptions.x = pageW
        drawOptions.y = pageH
      } else if (pageRotation.value === 270) {
        drawOptions.y = pageH
      }
    }

    page.drawPage(embedded, drawOptions)
    await drawPlateOverlay(pdfDoc, page, plant)
    return
  }

  const pageDimensions = getConfiguredPageDimensions()
  const page = pdfDoc.addPage([pageDimensions.width, pageDimensions.height])

  const bgRgb = hexToRgb(backgroundColor.value)
  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageDimensions.width,
    height: pageDimensions.height,
    color: rgb(bgRgb.r / 255, bgRgb.g / 255, bgRgb.b / 255),
  })

  if (templateState.type === 'image' && templateState.imageBytes) {
    const templateImage = await embedImage(pdfDoc, templateState.imageBytes, templateState.fileName)
    const fit = fitInside(pageDimensions.width, pageDimensions.height, templateImage.width, templateImage.height)

    page.drawImage(templateImage, {
      x: (pageDimensions.width - fit.width) / 2,
      y: (pageDimensions.height - fit.height) / 2,
      width: fit.width,
      height: fit.height,
    })
  }

  await drawPlateOverlay(pdfDoc, page, plant)
}

async function drawPlateOverlay(pdfDoc, page, plant) {
  await drawQrOnPage(pdfDoc, page, plant)
  await drawImageFieldsOnPage(pdfDoc, page)
  await drawTextFieldsOnPage(pdfDoc, page, plant)
}

async function drawQrOnPage(pdfDoc, page, plant) {
  const qrText = getQrPayloadText(plant)
  const qrSize = Math.max(50, Number(qrSettings.size) || 180)
  const qrX = Math.max(0, Number(qrSettings.x) || 0)
  const qrY = Math.max(0, Number(qrSettings.y) || 0)

  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: Math.round(qrSize),
    margin: Math.max(0, Number(qrSettings.margin) || 0),
    errorCorrectionLevel: qrSettings.ecc,
    color: {
      dark: qrSettings.color || '#000000',
      light: qrSettings.background ? '#ffffff' : '#00000000',
    },
  })

  const qrImage = await pdfDoc.embedPng(qrDataUrl)
  page.drawImage(qrImage, {
    x: qrX,
    y: page.getHeight() - qrY - qrSize,
    width: qrSize,
    height: qrSize,
  })

  if (qrSettings.showText) {
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const text = ellipsize(qrText, Number(qrSettings.maxChars) || 90)
    const textSize = Math.max(8, Number(qrSettings.fontSize) || 10)

    page.drawText(text, {
      x: qrX,
      y: page.getHeight() - qrY - qrSize - (textSize + 5),
      size: textSize,
      font,
      color: rgb(0.14, 0.14, 0.14),
    })
  }
}

function getQrPayloadText(plant) {
  if (qrSettings.contentMode === 'text') {
    const customText = String(qrSettings.customText || '').trim()
    return customText || getSpeciesUrl(plant?.id)
  }

  if (qrSettings.contentMode === 'field') {
    const fieldKey = String(qrSettings.fieldSource || '').trim()
    const plantMap = getPlantDataMap(plant)
    const fieldValue = plantMap[fieldKey]
    return String(fieldValue || '').trim() || getSpeciesUrl(plant?.id)
  }

  return getSpeciesUrl(plant?.id)
}

async function drawImageFieldsOnPage(pdfDoc, page) {
  for (const field of imageFields.value) {
    if (!field.imageBytes) {
      continue
    }

    const image = await embedImage(pdfDoc, field.imageBytes, field.fileName || '')
    const scale = Math.max(1, Number(field.scale) || 100) / 100
    const sourceWidth = Math.max(1, Number(field.originalWidth) || image.width || 100)
    const sourceHeight = Math.max(1, Number(field.originalHeight) || image.height || 100)
    const width = sourceWidth * scale
    const height = sourceHeight * scale

    page.drawImage(image, {
      x: Math.max(0, Number(field.x) || 0),
      y: page.getHeight() - (Number(field.y) || 0) - height,
      width,
      height,
    })
  }
}

async function drawTextFieldsOnPage(pdfDoc, page, plant) {
  const fontCache = new Map()
  const plantMap = getPlantDataMap(plant)

  for (const field of textFields.value) {
    const displayText = resolveTextFieldValue(field, plantMap)
    if (!displayText) {
      continue
    }

    const font = await resolveFontForField(pdfDoc, field, fontCache)
    const baseSize = Math.max(6, Number(field.size) || 12)
    const x = Math.max(0, Number(field.x) || 0)
    const topY = Math.max(0, Number(field.y) || 0)
    const color = hexToRgb(field.color || '#1f3220')

    const maxWidth = Math.max(40, page.getWidth() - x - Math.max(0, Number(textRightMargin.value) || 0))

    let adjustedSize = baseSize
    let textWidth = font.widthOfTextAtSize(displayText, adjustedSize)

    while (textWidth > maxWidth && adjustedSize > 6) {
      adjustedSize -= 0.5
      textWidth = font.widthOfTextAtSize(displayText, adjustedSize)
    }

    const y = page.getHeight() - topY - adjustedSize

    page.drawText(displayText, {
      x,
      y,
      size: adjustedSize,
      font,
      color: rgb(color.r / 255, color.g / 255, color.b / 255),
    })

    if (field.underline) {
      page.drawLine({
        start: { x, y: y - 2 },
        end: { x: x + textWidth, y: y - 2 },
        thickness: Math.max(1, adjustedSize / 14),
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
      })
    }
  }
}

async function resolveFontForField(pdfDoc, field, fontCache) {
  const family = field.fontFamily || 'Helvetica'
  const isBold = Boolean(field.bold)
  const isItalic = Boolean(field.italic)

  const cacheKey = `${family}:${isBold}:${isItalic}`
  if (fontCache.has(cacheKey)) {
    return fontCache.get(cacheKey)
  }

  let font
  const customFont = customFonts.value.find((item) => item.name === family)

  if (customFont?.bytes) {
    font = await pdfDoc.embedFont(customFont.bytes)
  } else if (family === 'Times') {
    if (isBold && isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic)
    } else if (isBold) {
      font = await pdfDoc.embedFont(StandardFonts.TimesBold)
    } else if (isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
    } else {
      font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    }
  } else if (family === 'Courier') {
    if (isBold && isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.CourierBoldOblique)
    } else if (isBold) {
      font = await pdfDoc.embedFont(StandardFonts.CourierBold)
    } else if (isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.CourierOblique)
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Courier)
    }
  } else {
    if (isBold && isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique)
    } else if (isBold) {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    } else if (isItalic) {
      font = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
    } else {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    }
  }

  fontCache.set(cacheKey, font)
  return font
}

function getPlantDataMap(plant) {
  return {
    id: String(plant?.id || ''),
    code: getSpeciesCode(plant),
    commonName: String(plant?.commonName || ''),
    scientificName: String(plant?.scientificName || ''),
    family: String(plant?.family || ''),
    type: String(plant?.type || ''),
    origin: String(plant?.origin || ''),
    location: String(plant?.location || ''),
    description: String(plant?.description || ''),
    url: getSpeciesUrl(plant?.id || ''),
  }
}

function resolveTextFieldValue(field, plantMap) {
  if (!field) {
    return ''
  }

  if ((field.useDatabase || (field.useDatabase === undefined && field.source)) && field.source && plantMap[field.source] !== undefined) {
    return String(plantMap[field.source] || '').trim()
  }

  if (!field.text) {
    return ''
  }

  return String(field.text)
    .replace(/{{\s*([^}]+)\s*}}/g, (_match, key) => {
      return plantMap[key] !== undefined ? String(plantMap[key] || '') : ''
    })
    .trim()
}

async function embedImage(pdfDoc, bytes, fileName = '') {
  const lower = String(fileName || '').toLowerCase()

  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
    return pdfDoc.embedJpg(bytes)
  }

  if (lower.endsWith('.png')) {
    return pdfDoc.embedPng(bytes)
  }

  try {
    return await pdfDoc.embedPng(bytes)
  } catch {
    return pdfDoc.embedJpg(bytes)
  }
}

function fitInside(containerW, containerH, sourceW, sourceH) {
  const ratio = Math.min(containerW / sourceW, containerH / sourceH)
  return {
    width: sourceW * ratio,
    height: sourceH * ratio,
  }
}

function hexToRgb(hex) {
  const cleaned = String(hex || '#000000').replace('#', '')
  const normalized = cleaned.length === 3
    ? cleaned
        .split('')
        .map((char) => `${char}${char}`)
        .join('')
    : cleaned.padEnd(6, '0').slice(0, 6)

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function ellipsize(value, maxChars) {
  const text = String(value || '')
  if (text.length <= maxChars) {
    return text
  }

  return `${text.slice(0, Math.max(1, maxChars - 1))}...`
}

function arrayToBase64(uint8Array) {
  if (!uint8Array || !uint8Array.length) {
    return null
  }

  const chunkSize = 8192
  let binary = ''

  for (let index = 0; index < uint8Array.length; index += chunkSize) {
    const chunk = uint8Array.subarray(index, Math.min(index + chunkSize, uint8Array.length))
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function base64ToArray(base64String) {
  if (!base64String) {
    return null
  }

  const binary = atob(base64String)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function dataUrlToUint8Array(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') {
    return null
  }

  const commaIndex = dataUrl.indexOf(',')
  if (commaIndex < 0) {
    return null
  }

  const base64Payload = dataUrl.slice(commaIndex + 1)
  try {
    return base64ToArray(base64Payload)
  } catch {
    return null
  }
}

async function bytesToImage(bytes) {
  const blob = new Blob([bytes])
  const url = URL.createObjectURL(blob)

  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Nao foi possivel carregar a imagem'))
      img.src = url
    })

    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function downloadBlob(blobOrBytes, fileName, type) {
  const blob = blobOrBytes instanceof Blob ? blobOrBytes : new Blob([blobOrBytes], { type })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

function formatFileName(fileName, maxChars = 30) {
  const normalized = String(fileName || '').trim()
  if (!normalized) {
    return ''
  }

  if (normalized.length <= maxChars) {
    return normalized
  }

  return `${normalized.slice(0, Math.max(1, maxChars - 3))}...`
}

function formatDate(value) {
  if (!value) {
    return 'sem data'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'sem data'
  }

  return date.toLocaleString('pt-BR')
}

watch(
  [currentPageDimensions, () => qrSettings.size],
  () => {
    const maxSize = qrMaxSize.value
    qrSettings.size = Math.min(Math.max(50, Number(qrSettings.size) || 180), maxSize)

    const maxX = qrMaxX.value
    const maxY = qrMaxY.value

    qrSettings.x = Math.min(Math.max(0, Number(qrSettings.x) || 0), maxX)
    qrSettings.y = Math.min(Math.max(0, Number(qrSettings.y) || 0), maxY)
  },
  { deep: false }
)

watch(
  [selectedSpeciesIds, sortedPlantsByCode],
  () => {
    updateSelectAllIndeterminate()

    const availableIds = new Set(sortedPlantsByCode.value.map((plant) => plant.id))
    const sanitizedSelection = selectedSpeciesIds.value.filter((id) => availableIds.has(id))
    if (!areArraysEqual(sanitizedSelection, selectedSpeciesIds.value)) {
      selectedSpeciesIds.value = sanitizedSelection
      return
    }

    if (!hasSelectedSpecies.value) {
      plateSubTab.value = 'models'
      clearPreviewUrl()
    }
  },
  { deep: false }
)

watch(
  [
    previewPlant,
    pageSize,
    customW,
    customH,
    pageRotation,
    backgroundColor,
    textRightMargin,
    qrSettings,
    textFields,
    imageFields,
    customFonts,
    () => templateState.bytes,
  ],
  () => {
    if (hasSelectedSpecies.value) {
      schedulePreviewRender()
    }
  },
  { deep: true }
)

onMounted(async () => {
  resetDesignerState()
  await refreshStoredModels()
  document.addEventListener('mousedown', handleDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', handleDocumentClick)

  if (previewTimer) {
    window.clearTimeout(previewTimer)
  }

  clearPreviewUrl()
})
</script>

<style scoped>
.plate-generator-layout {
  display: grid;
  grid-template-columns: minmax(40%, 55%) minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
  min-height: 0;
}

.plate-config-panel,
.plate-preview-panel {
  min-width: 0;
  min-height: 0;
}

.plate-intro,
.preview-subtitle,
.subtab-hint,
.template-info {
  color: var(--muted);
  margin-top: 0.45rem;
}

.species-selector {
  position: relative;
  margin-top: 0.9rem;
}

.species-selector-trigger {
  margin-top: 0.35rem;
  text-align: left;
  cursor: pointer;
}

.species-selector-menu {
  position: absolute;
  top: calc(100% + 0.35rem);
  left: 0;
  right: 0;
  z-index: 2200;
  border: 1px solid rgba(77, 99, 57, 0.24);
  border-radius: 12px;
  background: #ffffff;
  box-shadow: var(--shadow-soft);
  padding: 0.55rem;
}

.species-options-list {
  max-height: 260px;
  overflow: auto;
  margin-top: 0.4rem;
  border-top: 1px solid rgba(77, 99, 57, 0.12);
  padding-top: 0.35rem;
}

.species-option {
  display: grid;
  grid-template-columns: 20px auto 1fr;
  gap: 0.45rem;
  align-items: center;
  padding: 0.35rem 0.3rem;
  border-radius: 8px;
}

.species-option:hover {
  background: rgba(183, 205, 169, 0.16);
}

.species-option.all {
  font-weight: 700;
  grid-template-columns: 20px 1fr;
}

.species-code {
  font-weight: 700;
  color: var(--green-900);
}

.species-name {
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plate-subtabs {
  margin-top: 0.9rem;
  display: flex;
  gap: 0.5rem;
}

.subtab-btn {
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  border: 1px solid rgba(77, 99, 57, 0.2);
  background: #ffffff;
  color: var(--green-900);
  font-weight: 700;
  cursor: pointer;
}

.subtab-btn.active {
  background: rgba(183, 205, 169, 0.44);
  border-color: rgba(77, 99, 57, 0.4);
}

.subtab-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.subtab-panel {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.8rem;
  min-height: 0;
}

.field-full {
  grid-column: 1 / -1;
}

.custom-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.models-toolbar {
  display: grid;
  gap: 0.6rem;
}

.models-list {
  display: grid;
  gap: 0.45rem;
  max-height: 240px;
  overflow: auto;
}

.model-item-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
}

.model-item {
  border: 1px solid rgba(77, 99, 57, 0.2);
  border-radius: 10px;
  padding: 0.55rem 0.6rem;
  background: #ffffff;
  text-align: left;
  display: grid;
  gap: 0.16rem;
}

.model-item.active {
  border-color: rgba(77, 99, 57, 0.5);
  background: rgba(183, 205, 169, 0.26);
}

.model-item span {
  font-size: 0.8rem;
  color: var(--muted);
}

.model-delete-btn {
  padding: 0.5rem 0.75rem;
}

.customize-panel {
  min-height: 0;
}

.customize-subtabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
}

.customize-tab-body {
  border: 1px solid rgba(77, 99, 57, 0.22);
  border-radius: 12px;
  padding: 0.72rem;
  background: #fcfdfb;
  min-height: 360px;
  max-height: min(72vh, 760px);
  overflow: hidden;
}

.customize-pane {
  display: grid;
  gap: 0.65rem;
  min-height: 0;
  height: 100%;
}

.background-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  align-items: start;
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.background-grid > :last-child {
  grid-column: 1 / -1;
}

.custom-size-cell {
  display: grid;
  gap: 0.35rem;
}

.custom-size-cell.is-disabled {
  opacity: 0.65;
}

.dimension-inline {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.qr-rows {
  display: grid;
  gap: 0.6rem;
  min-height: 0;
  overflow: auto;
  padding-right: 0.2rem;
}

.qr-row {
  display: grid;
  gap: 0.65rem;
  align-items: end;
}

.qr-row.two-columns {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.qr-source-row {
  grid-template-columns: 1fr;
}

.qr-source-row.with-text {
  grid-template-columns: minmax(0, 30%) minmax(0, 70%);
}

.qr-source-mode,
.qr-source-text {
  display: grid;
  gap: 0.35rem;
}

.toggle-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.slider-control {
  display: grid;
  gap: 0.35rem;
}

.slider-with-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 0.45rem;
  align-items: center;
}

.slider-with-input input[type='range'] {
  width: 100%;
  accent-color: var(--green-700);
}

.slider-number {
  text-align: right;
}

.custom-items-scroll {
  min-height: 0;
  max-height: min(70vh, 350px);
  overflow: auto;
  padding-right: 0.2rem;
}

.custom-item {
  border: 1px solid rgba(77, 99, 57, 0.16);
  border-radius: 10px;
  padding: 0.65rem;
  margin-top: 0.55rem;
  background: #ffffff;
}

.custom-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.55rem;
}

.item-line {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  align-items: center;
  margin-top: 0.55rem;
}

.item-line-main {
  grid-template-columns: 180px minmax(0, 1fr);
}

.image-upload-row {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
}

.item-main-field {
  min-width: 0;
}

.item-style-grid {
  grid-template-columns: minmax(140px, 1.3fr) 110px 100px repeat(3, minmax(90px, 1fr));
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.2rem;
}

.checkbox-line.compact {
  margin-top: 0;
  white-space: nowrap;
}

.style-toggle {
  align-self: center;
}

.inline-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filename {
  color: var(--muted);
  font-size: 0.86rem;
}

.filename-truncated {
  display: inline-block;
  max-width: 30ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.5rem;
}

.chip {
  border: 1px solid rgba(77, 99, 57, 0.25);
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  background: rgba(183, 205, 169, 0.2);
  font-size: 0.8rem;
}

.preview-wrapper {
  margin-top: 0.8rem;
  border: 1px solid rgba(77, 99, 57, 0.18);
  border-radius: 12px;
  background: #ffffff;
  min-height: 420px;
  overflow: hidden;
}

.preview-wrapper iframe {
  width: 100%;
  min-height: 540px;
  border: 0;
  display: block;
}

.preview-empty {
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}

@media (max-width: 1180px) {
  .plate-generator-layout {
    grid-template-columns: 1fr;
  }

  .preview-wrapper iframe {
    min-height: 460px;
  }
}

@media (max-width: 680px) {
  .customize-subtabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .background-grid,
  .custom-grid,
  .model-item-row,
  .qr-source-row.with-text,
  .qr-row.two-columns,
  .toggle-row,
  .item-line,
  .item-line-main,
  .item-style-grid,
  .dimension-inline {
    grid-template-columns: 1fr;
  }

  .customize-tab-body {
    max-height: none;
  }
}
</style>
