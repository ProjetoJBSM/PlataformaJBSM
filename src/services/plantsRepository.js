import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore'

import { db } from './firebase'
import { mockPlants } from './mockPlants'

const COLLECTION_NAME = 'species'
const PLANTS_CACHE_KEY = 'jbsm-platform:species-cache:v1'
const PLANTS_CACHE_TTL_MS = 1000 * 60 * 60 * 12

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readPlantsCache({ allowStale = false } = {}) {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(PLANTS_CACHE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!parsed || !Array.isArray(parsed.plants) || !parsed.savedAt) {
      return []
    }

    const age = Date.now() - Number(parsed.savedAt)
    if (!allowStale && age > PLANTS_CACHE_TTL_MS) {
      return []
    }

    return parsed.plants
  } catch {
    return []
  }
}

function writePlantsCache(plants) {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(
      PLANTS_CACHE_KEY,
      JSON.stringify({
        plants,
        savedAt: Date.now(),
      })
    )
  } catch {
    // Ignora erro de quota/localStorage indisponivel.
  }
}

function normalizeText(value) {
  if (!value) return ''
  return String(value).trim()
}

function asKeywords(plant) {
  const source = [
    plant.id,
    plant.code,
    plant.commonName,
    plant.scientificName,
    plant.family,
    plant.origin,
    plant.type,
  ]

  return source
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .slice(0, 40)
}

function normalizePlant(plantInput) {
  const plant = {
    ...plantInput,
    id: normalizeText(plantInput.id || plantInput.code),
    code: normalizeText(plantInput.code || plantInput.id),
    commonName: normalizeText(plantInput.commonName),
    scientificName: normalizeText(plantInput.scientificName),
    family: normalizeText(plantInput.family),
    origin: normalizeText(plantInput.origin),
    type: normalizeText(plantInput.type),
    description: normalizeText(plantInput.description),
    location: normalizeText(plantInput.location),
    curatorNotes: normalizeText(plantInput.curatorNotes),
    images: Array.isArray(plantInput.images) ? plantInput.images : [],
    extra: plantInput.extra && typeof plantInput.extra === 'object' ? plantInput.extra : {},
    geoLocation: plantInput.geoLocation || null,
  }

  if (!plant.id) {
    throw new Error('Cada especie precisa de um ID (id ou code).')
  }

  plant.searchKeywords = asKeywords(plant)
  return plant
}

function localFilter(plants, filters = {}) {
  const term = filters.search?.trim().toLowerCase() || ''
  const family = filters.family?.trim().toLowerCase() || ''
  const type = filters.type?.trim().toLowerCase() || ''

  return plants.filter((plant) => {
    if (family && plant.family.toLowerCase() !== family) {
      return false
    }

    if (type && plant.type.toLowerCase() !== type) {
      return false
    }

    if (!term) {
      return true
    }

    const haystack = `${plant.id} ${plant.commonName} ${plant.scientificName} ${plant.family} ${plant.origin}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    const needle = term.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return haystack.includes(needle)
  })
}

export async function fetchPlants(filters = {}, options = {}) {
  const preferCache = Boolean(options.preferCache)
  const forceRefresh = Boolean(options.forceRefresh)
  const allowStaleCache = Boolean(options.allowStaleCache)

  if (!db) {
    return localFilter(mockPlants, filters)
  }

  if (preferCache && !forceRefresh) {
    const cachedPlants = readPlantsCache({ allowStale: allowStaleCache })
    if (cachedPlants.length) {
      return localFilter(cachedPlants, filters)
    }
  }

  try {
    const speciesRef = collection(db, COLLECTION_NAME)
    const q = query(speciesRef, orderBy('commonName'))
    const snapshot = await getDocs(q)
    const plants = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    }))

    writePlantsCache(plants)
    return localFilter(plants, filters)
  } catch (error) {
    const fallbackPlants = readPlantsCache({ allowStale: true })
    if (fallbackPlants.length) {
      return localFilter(fallbackPlants, filters)
    }

    throw error
  }
}

export async function getPlantById(id) {
  if (!db) {
    return mockPlants.find((plant) => plant.id === id) || null
  }

  const plantRef = doc(db, COLLECTION_NAME, id)
  const snapshot = await getDoc(plantRef)

  if (!snapshot.exists()) {
    return null
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  }
}

export async function upsertPlant(plantInput) {
  const plant = normalizePlant(plantInput)

  if (!db) {
    const index = mockPlants.findIndex((item) => item.id === plant.id)
    const payload = {
      ...plant,
      updatedAt: new Date().toISOString(),
    }

    if (index >= 0) {
      mockPlants[index] = payload
    } else {
      mockPlants.push(payload)
    }

    return payload
  }

  const plantRef = doc(db, COLLECTION_NAME, plant.id)
  await setDoc(
    plantRef,
    {
      ...plant,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )

  return plant
}

export async function deletePlantById(id) {
  if (!db) {
    const index = mockPlants.findIndex((item) => item.id === id)
    if (index >= 0) {
      mockPlants.splice(index, 1)
    }
    return
  }

  await deleteDoc(doc(db, COLLECTION_NAME, id))
}

export async function importPlantsBatch(plantsInput = []) {
  const normalized = plantsInput.map((item) => normalizePlant(item))

  if (!db) {
    normalized.forEach((plant) => {
      const index = mockPlants.findIndex((item) => item.id === plant.id)
      const payload = {
        ...plant,
        updatedAt: new Date().toISOString(),
      }

      if (index >= 0) {
        mockPlants[index] = payload
      } else {
        mockPlants.push(payload)
      }
    })

    return {
      total: normalized.length,
      mode: 'local-preview',
    }
  }

  const batch = writeBatch(db)

  normalized.forEach((plant) => {
    const plantRef = doc(db, COLLECTION_NAME, plant.id)
    batch.set(
      plantRef,
      {
        ...plant,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    )
  })

  await batch.commit()

  return {
    total: normalized.length,
    mode: 'firestore',
  }
}
