const sessionImageCache = new Map()

let sessionCleanupRegistered = false

function registerSessionCleanup() {
  if (sessionCleanupRegistered || typeof window === 'undefined') {
    return
  }

  window.addEventListener('beforeunload', () => {
    sessionImageCache.forEach((entry) => {
      if (entry?.objectUrl && entry.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entry.objectUrl)
      }
    })
    sessionImageCache.clear()
  })

  sessionCleanupRegistered = true
}

async function fetchImageAsObjectUrl(url) {
  const response = await fetch(url, { cache: 'force-cache' })
  if (!response.ok) {
    throw new Error(`Falha ao baixar imagem: ${response.status}`)
  }

  const imageBlob = await response.blob()
  return URL.createObjectURL(imageBlob)
}

function normalizeSource(source) {
  return typeof source === 'string' ? source.trim() : ''
}

export async function getSessionCachedImage(source) {
  const normalizedSource = normalizeSource(source)
  if (!normalizedSource) {
    return ''
  }

  const existing = sessionImageCache.get(normalizedSource)
  if (existing?.resolved) {
    return existing.resolved
  }

  if (existing?.promise) {
    return existing.promise
  }

  registerSessionCleanup()

  const loadPromise = fetchImageAsObjectUrl(normalizedSource)
    .then((objectUrl) => {
      sessionImageCache.set(normalizedSource, {
        resolved: objectUrl,
        objectUrl,
      })
      return objectUrl
    })
    .catch(() => {
      sessionImageCache.delete(normalizedSource)
      return normalizedSource
    })

  sessionImageCache.set(normalizedSource, { promise: loadPromise })
  return loadPromise
}

export async function preloadSessionImages(sources = []) {
  const uniqueSources = [...new Set(sources.map(normalizeSource).filter(Boolean))]
  await Promise.allSettled(uniqueSources.map((source) => getSessionCachedImage(source)))
}

export function createPageImageCache() {
  const pageImageCache = new Map()

  async function get(source) {
    const normalizedSource = normalizeSource(source)
    if (!normalizedSource) {
      return ''
    }

    const existing = pageImageCache.get(normalizedSource)
    if (existing?.resolved) {
      return existing.resolved
    }

    if (existing?.promise) {
      return existing.promise
    }

    const loadPromise = fetchImageAsObjectUrl(normalizedSource)
      .then((objectUrl) => {
        pageImageCache.set(normalizedSource, {
          resolved: objectUrl,
          objectUrl,
        })
        return objectUrl
      })
      .catch(() => {
        pageImageCache.delete(normalizedSource)
        return normalizedSource
      })

    pageImageCache.set(normalizedSource, { promise: loadPromise })
    return loadPromise
  }

  async function preload(sources = []) {
    const uniqueSources = [...new Set(sources.map(normalizeSource).filter(Boolean))]
    await Promise.allSettled(uniqueSources.map((source) => get(source)))
  }

  function clear() {
    pageImageCache.forEach((entry) => {
      if (entry?.objectUrl && entry.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entry.objectUrl)
      }
    })

    pageImageCache.clear()
  }

  return {
    get,
    preload,
    clear,
  }
}
