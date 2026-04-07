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
        const gps = exif['0th']?.[piexif.ImageIFD.GPSInfo]

        if (!gps) {
          resolve({
            hasExif: false,
            latitude: null,
            longitude: null,
            altitude: null,
            datetime: null,
          })
          return
        }

        const gpsData = piexif.load(exif)['Exif']
        const ifd = piexif.load(exif)

        // Extract latitude
        const lat = ifd.GPS?.[piexif.GPSIFD.GPSLatitude]
        const latRef = ifd.GPS?.[piexif.GPSIFD.GPSLatitudeRef]

        // Extract longitude
        const lng = ifd.GPS?.[piexif.GPSIFD.GPSLongitude]
        const lngRef = ifd.GPS?.[piexif.GPSIFD.GPSLongitudeRef]

        // Extract altitude
        const alt = ifd.GPS?.[piexif.GPSIFD.GPSAltitude]

        // Extract datetime
        const datetime = ifd['0th']?.[piexif.ImageIFD.DateTime]

        const latitude = lat ? convertDMStoDD(lat, latRef) : null
        const longitude = lng ? convertDMStoDD(lng, lngRef) : null
        const altitude = alt ? alt[0] / alt[1] : null
        const datetimeStr = datetime ? bytesToString(datetime) : null

        resolve({
          hasExif: !!(latitude && longitude),
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

    reader.readAsArrayBuffer(file)
  })
}

function convertDMStoDD(dms, ref) {
  if (!dms || dms.length < 3) {
    return null
  }

  const degrees = dms[0][0] / dms[0][1]
  const minutes = dms[1][0] / dms[1][1]
  const seconds = dms[2][0] / dms[2][1]

  let decimal = degrees + minutes / 60 + seconds / 3600

  if (ref === 'S' || ref === 'W') {
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
  if (!lat || !lng) {
    return null
  }

  return {
    lat: Number(lat).toFixed(6),
    lng: Number(lng).toFixed(6),
  }
}

export function getGoogleMapsUrl(lat, lng) {
  if (!lat || !lng) {
    return null
  }

  return `https://maps.google.com/?q=${lat},${lng}`
}
