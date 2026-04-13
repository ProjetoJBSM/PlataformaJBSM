import { deleteObject, getDownloadURL, getMetadata, listAll, ref, uploadBytes } from 'firebase/storage'

import { storage } from './firebase'

const MODELS_STORAGE_PREFIX = 'plate-models'
const LOCAL_MODELS_KEY = 'jbsm-platform:plate-models:v1'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function sanitizeName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function readLocalModels() {
  if (!canUseLocalStorage()) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_MODELS_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

function writeLocalModels(models) {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(LOCAL_MODELS_KEY, JSON.stringify(models))
  } catch {
    // Ignore localStorage errors (quota/private mode).
  }
}

function sortModelsByDateDesc(models) {
  return [...models].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt || left.createdAt || 0)
    const rightTime = Date.parse(right.updatedAt || right.createdAt || 0)
    return rightTime - leftTime
  })
}

function toModelItem({ id, name, storagePath, updatedAt, model }) {
  return {
    id,
    name,
    storagePath,
    updatedAt,
    model,
  }
}

function isStoragePermissionError(error) {
  const code = String(error?.code || '')
  return code === 'storage/unauthorized' || code === 'storage/unauthenticated'
}

function getUniqueModelName(baseName, models) {
  const normalized = String(baseName || '').trim() || 'modelo-sem-nome'
  const existingNames = new Set(
    (models || [])
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

function upsertLocalModel(name, payload, updatedAt) {
  const current = readLocalModels()
  const uniqueName = getUniqueModelName(name, current)
  const normalizedPayload = {
    ...payload,
    name: uniqueName,
    updatedAt,
  }

  const entry = toModelItem({
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: uniqueName,
    storagePath: null,
    updatedAt,
    model: normalizedPayload,
  })

  writeLocalModels(sortModelsByDateDesc([entry, ...current]))
  return entry
}

function deleteLocalModel(modelItem) {
  const current = readLocalModels()
  const modelId = String(modelItem?.id || '')
  const modelStoragePath = String(modelItem?.storagePath || '')

  const filtered = current.filter((item) => {
    if (modelId && String(item?.id || '') === modelId) {
      return false
    }

    if (modelStoragePath && String(item?.storagePath || '') === modelStoragePath) {
      return false
    }

    return true
  })

  writeLocalModels(filtered)
}

export async function listPlateModels() {
  if (!storage) {
    return sortModelsByDateDesc(readLocalModels())
  }

  const rootRef = ref(storage, MODELS_STORAGE_PREFIX)
  let files = []

  try {
    const listing = await listAll(rootRef)
    files = listing.items || []
  } catch (error) {
    const code = error?.code || ''
    if (code === 'storage/object-not-found' || code === 'storage/invalid-root-operation') {
      return sortModelsByDateDesc(readLocalModels())
    }

    if (isStoragePermissionError(error)) {
      return sortModelsByDateDesc(readLocalModels())
    }

    throw error
  }

  const models = await Promise.all(
    files.map(async (itemRef) => {
      try {
        const [downloadUrl, metadata] = await Promise.all([
          getDownloadURL(itemRef),
          getMetadata(itemRef).catch(() => null),
        ])

        const response = await fetch(downloadUrl)
        if (!response.ok) {
          return null
        }

        const json = await response.json()
        const inferredName =
          json?.name || itemRef.name.replace(/\.json$/i, '') || `modelo-${Date.now()}`

        return toModelItem({
          id: itemRef.fullPath,
          name: inferredName,
          storagePath: itemRef.fullPath,
          updatedAt: metadata?.updated || metadata?.timeCreated || json?.updatedAt || '',
          model: json,
        })
      } catch {
        return null
      }
    })
  )

  const localModels = readLocalModels()
  return sortModelsByDateDesc([...models.filter(Boolean), ...localModels])
}

export async function savePlateModel(name, model) {
  const normalizedName = String(name || '').trim() || 'modelo-sem-nome'
  const nowIso = new Date().toISOString()
  const payload = {
    ...model,
    name: normalizedName,
    updatedAt: nowIso,
  }

  if (!storage) {
    return upsertLocalModel(normalizedName, payload, nowIso)
  }

  const safeName = sanitizeName(normalizedName) || 'modelo'
  const fileName = `${safeName}-${Date.now()}.json`
  const storagePath = `${MODELS_STORAGE_PREFIX}/${fileName}`
  const fileRef = ref(storage, storagePath)
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2))

  try {
    await uploadBytes(fileRef, bytes, {
      contentType: 'application/json',
    })
  } catch (error) {
    if (isStoragePermissionError(error)) {
      return upsertLocalModel(normalizedName, payload, nowIso)
    }

    throw error
  }

  return toModelItem({
    id: storagePath,
    name: normalizedName,
    storagePath,
    updatedAt: nowIso,
    model: payload,
  })
}

export async function deletePlateModel(modelItem) {
  if (!modelItem) {
    return
  }

  const isLocal = !modelItem.storagePath || String(modelItem.id || '').startsWith('local-')
  if (isLocal || !storage) {
    deleteLocalModel(modelItem)
    return
  }

  const fileRef = ref(storage, modelItem.storagePath)
  try {
    await deleteObject(fileRef)
    deleteLocalModel(modelItem)
  } catch (error) {
    if (isStoragePermissionError(error)) {
      throw new Error('Sem permissao para excluir este modelo no Storage.')
    }

    throw error
  }
}
