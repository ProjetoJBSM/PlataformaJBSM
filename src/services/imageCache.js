const sessionImageCache = new Map()
const pageImageCacheGlobal = new Map()
const reportedImageFetchFailures = new Set()

let sessionCleanupRegistered = false
let pageCleanupRegistered = false

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

    pageImageCacheGlobal.forEach((entry) => {
      if (entry?.objectUrl && entry.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entry.objectUrl)
      }
    })
    pageImageCacheGlobal.clear()
  })

  sessionCleanupRegistered = true
}

async function fetchImageAsObjectUrl(url) {
  const normalizedSource = normalizeSource(url)
  if (!normalizedSource) {
    return ''
  }

  if (isCrossOriginSource(normalizedSource)) {
    await warmBrowserImageCache(normalizedSource)
    return normalizedSource
  }

  try {
    const response = await fetch(normalizedSource, {
      cache: 'force-cache',
      credentials: 'omit',
    })
    if (!response.ok) {
      logImageFetchFailureOnce(normalizedSource, `status ${response.status}`)
      throw new Error(`Falha ao baixar imagem: ${response.status}`)
    }

    const imageBlob = await response.blob()
    return URL.createObjectURL(imageBlob)
  } catch (error) {
    logImageFetchFailureOnce(normalizedSource, error)
    throw error
  }
}

function isCrossOriginSource(source) {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    const parsed = new URL(source, window.location.href)
    return parsed.origin !== window.location.origin
  } catch {
    return false
  }
}

function warmBrowserImageCache(source) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(source)
      return
    }

    const image = new Image()
    image.decoding = 'async'

    const complete = () => {
      image.onload = null
      image.onerror = null
      resolve(source)
    }

    image.onload = complete
    image.onerror = complete
    image.src = source
  })
}

function logImageFetchFailureOnce(source, detail) {
  const key = `${source}`
  if (reportedImageFetchFailures.has(key)) {
    return
  }

  reportedImageFetchFailures.add(key)
  console.warn('Falha no cache de imagem, usando URL original:', source, detail)
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

export function getPageImageCache() {
  async function get(source) {
    const normalizedSource = normalizeSource(source)
    if (!normalizedSource) {
      return ''
    }

    const existing = pageImageCacheGlobal.get(normalizedSource)
    if (existing?.resolved) {
      return existing.resolved
    }

    if (existing?.promise) {
      return existing.promise
    }

    const loadPromise = fetchImageAsObjectUrl(normalizedSource)
      .then((objectUrl) => {
        pageImageCacheGlobal.set(normalizedSource, {
          resolved: objectUrl,
          objectUrl,
        })
        return objectUrl
      })
      .catch(() => {
        pageImageCacheGlobal.delete(normalizedSource)
        return normalizedSource
      })

    pageImageCacheGlobal.set(normalizedSource, { promise: loadPromise })
    return loadPromise
  }

  async function preload(sources = []) {
    const uniqueSources = [...new Set(sources.map(normalizeSource).filter(Boolean))]
    await Promise.allSettled(uniqueSources.map((source) => get(source)))
  }

  function clearAll() {
    pageImageCacheGlobal.forEach((entry) => {
      if (entry?.objectUrl && entry.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(entry.objectUrl)
      }
    })
    pageImageCacheGlobal.clear()
  }

  return {
    get,
    preload,
    clearAll,
  }
}
