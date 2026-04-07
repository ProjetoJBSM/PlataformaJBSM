import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

const STORAGE_PATH = 'species-images'

export async function uploadPlantPhoto(file, plantId, photoIndex = 0) {
  if (!storage) {
    throw new Error('Firebase Storage nao esta configurado')
  }

  if (!file || !(file instanceof File)) {
    throw new Error('Arquivo invalido')
  }

  if (!plantId) {
    throw new Error('ID da especie eh obrigatorio')
  }

  const timestamp = Date.now()
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const filename = `${plantId}-${photoIndex}-${timestamp}.${ext}`
  const storagePath = `${STORAGE_PATH}/${filename}`

  const fileRef = ref(storage, storagePath)

  const snapshot = await uploadBytes(fileRef, file, {
    contentType: file.type,
  })

  const downloadUrl = await getDownloadURL(snapshot.ref)

  return {
    url: downloadUrl,
    path: storagePath,
    name: filename,
    uploadedAt: new Date().toISOString(),
  }
}

export async function deletePlantPhoto(storagePath) {
  if (!storage) {
    throw new Error('Firebase Storage nao esta configurado')
  }

  if (!storagePath) {
    throw new Error('Caminho do arquivo eh obrigatorio')
  }

  const fileRef = ref(storage, storagePath)
  await deleteObject(fileRef)
}

export async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'))
      }

      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.naturalWidth
        let height = img.naturalHeight

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width)
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height)
            height = maxHeight
          }
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Nao foi possivel obter contexto 2D do canvas'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Falha ao criar blob comprimido'))
              return
            }

            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            })

            resolve(compressedFile)
          },
          file.type,
          quality
        )
      }

      img.src = e.target?.result
    }

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'))
    }

    reader.readAsDataURL(file)
  })
}

export function isImageFile(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  return file instanceof File && validTypes.includes(file.type)
}

export async function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      const img = new Image()

      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
        })
      }

      img.onerror = () => {
        reject(new Error('Falha ao carregar imagem'))
      }

      img.src = e.target?.result
    }

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'))
    }

    reader.readAsDataURL(file)
  })
}
