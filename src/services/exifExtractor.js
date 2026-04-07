import piexif from 'piexifjs'

export async function extractExifFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result

        if (!data || typeof data !== 'string') {
          resolve({
            hasExif: false,
            latitude: null,
            longitude: null,
            altitude: null,
            datetime: null,
          })
          return
        }

        const exif = piexif.load(data)
        const gpsIfd = exif?.GPS || {}

        const lat = gpsIfd[piexif.GPSIFD.GPSLatitude]
        const latRef = bytesToString(gpsIfd[piexif.GPSIFD.GPSLatitudeRef])
        const lng = gpsIfd[piexif.GPSIFD.GPSLongitude]
        const lngRef = bytesToString(gpsIfd[piexif.GPSIFD.GPSLongitudeRef])
        const alt = gpsIfd[piexif.GPSIFD.GPSAltitude]
        const datetime =
          exif?.Exif?.[piexif.ExifIFD.DateTimeOriginal] || exif?.['0th']?.[piexif.ImageIFD.DateTime]

        const latitude = lat ? convertDMStoDD(lat, latRef) : null
        const longitude = lng ? convertDMStoDD(lng, lngRef) : null
        const altitude = alt ? rationalToNumber(alt) : null
        const datetimeStr = datetime ? bytesToString(datetime) : null

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          resolve({
            hasExif: false,
            latitude: null,
            longitude: null,
            altitude,
            datetime: datetimeStr,
          })
          return
        }

        resolve({
          hasExif: true,
          latitude,
          longitude,
          altitude,
          datetime: datetimeStr,
        })
      } catch (err) {
        resolve({
          hasExif: false,
          latitude: null,
          longitude: null,
          altitude: null,
          datetime: null,
          error: err instanceof Error ? err.message : 'Erro ao extrair EXIF',
        })
      }
    }

    reader.onerror = () => {
      reject(new Error('Falha ao ler arquivo'))
    }

    reader.readAsDataURL(file)
  })
}

function rationalToNumber(rational) {
  if (!Array.isArray(rational) || rational.length < 2) {
    return null
  }

  const [num, den] = rational
  if (!den) {
    return null
  }

  return num / den
}

function convertDMStoDD(dms, ref) {
  if (!dms || dms.length < 3) {
    return null
  }

  const degrees = rationalToNumber(dms[0])
  const minutes = rationalToNumber(dms[1])
  const seconds = rationalToNumber(dms[2])

  if (![degrees, minutes, seconds].every((value) => Number.isFinite(value))) {
    return null
  }

  let decimal = degrees + minutes / 60 + seconds / 3600
  const normalizedRef = bytesToString(ref)

  if (normalizedRef === 'S' || normalizedRef === 'W') {
    decimal = -decimal
  }

  return decimal
}

function bytesToString(bytes) {
  if (typeof bytes === 'string') {
    return bytes
  }

  if (Array.isArray(bytes)) {
    return String.fromCharCode(...bytes)
  }

  return null
}

export function formatCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return {
    lat: Number(lat).toFixed(6),
    lng: Number(lng).toFixed(6),
  }
}

export function getGoogleMapsUrl(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null
  }

  return `https://maps.google.com/?q=${lat},${lng}`
}
