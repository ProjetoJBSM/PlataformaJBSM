import Papa from 'papaparse'

const aliases = {
  id: ['id', 'codigo', 'code', 'identificador'],
  code: ['codigo', 'code'],
  commonName: ['nomepopular', 'nome_popular', 'popularname', 'commonname'],
  scientificName: ['nomecientifico', 'nome_cientifico', 'scientificname', 'scientific_name'],
  family: ['familia', 'family'],
  origin: ['origem', 'origin'],
  type: ['tipo', 'tipo_planta', 'planttype', 'type'],
  description: ['descricao', 'descricao', 'description', 'resumo'],
  location: ['localizacao', 'location', 'setor'],
  curatorNotes: ['observacoes', 'notas', 'curatornotes'],
  imageLow: ['imagemlow', 'imagem_400', 'imagem_baixa'],
  imageMedium: ['imagemmedium', 'imagem_800', 'imagem_media'],
  imageHigh: ['imagemhigh', 'imagem_1920', 'imagem_alta'],
}

function normalizeKey(key) {
  return String(key || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function findField(row, aliasList) {
  if (!row || !aliasList) return ''

  const normalizedAlias = aliasList.map((item) => normalizeKey(item))

  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key)
    if (normalizedAlias.includes(normalized)) {
      return String(value ?? '').trim()
    }
  }

  return ''
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function parseCsvFile(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(result) {
        resolve({
          rows: result.data,
          headers: result.meta.fields || [],
        })
      },
      error(error) {
        reject(error)
      },
    })
  })
}

export function normalizeCsvRow(row) {
  const id = findField(row, aliases.id) || findField(row, aliases.code)
  const code = findField(row, aliases.code) || id
  const commonName = findField(row, aliases.commonName)
  const scientificName = findField(row, aliases.scientificName)
  const family = findField(row, aliases.family)
  const origin = findField(row, aliases.origin)
  const type = findField(row, aliases.type)
  const description = findField(row, aliases.description)
  const location = findField(row, aliases.location)
  const curatorNotes = findField(row, aliases.curatorNotes)

  const imageLow = findField(row, aliases.imageLow)
  const imageMedium = findField(row, aliases.imageMedium)
  const imageHigh = findField(row, aliases.imageHigh)

  const normalizedId = String(id || slugify(scientificName || commonName)).slice(0, 40)

  const extra = {}
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key)
    const known = Object.values(aliases)
      .flat()
      .map((item) => normalizeKey(item))
      .includes(normalized)

    if (!known && String(value || '').trim()) {
      extra[key] = String(value).trim()
    }
  }

  const images = []
  if (imageLow || imageMedium || imageHigh) {
    images.push({
      low: imageLow,
      medium: imageMedium || imageLow,
      high: imageHigh || imageMedium || imageLow,
      alt: commonName || scientificName || 'Imagem da especie',
    })
  }

  return {
    id: normalizedId,
    code: code || normalizedId,
    commonName,
    scientificName,
    family,
    origin,
    type,
    description,
    location,
    curatorNotes,
    images,
    extra,
  }
}
