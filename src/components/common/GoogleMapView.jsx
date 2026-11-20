import { useEffect, useRef, useState } from 'react'

let googleMapsPromise = null

function loadGoogleMaps(apiKey) {
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="true"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google.maps))
      existing.addEventListener('error', () =>
        reject(new Error('No se pudo cargar Google Maps.'))
      )
      return
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}`
    script.async = true
    script.defer = true
    script.dataset.googleMaps = 'true'
    script.onload = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps no se inicializó correctamente.'))
      }
    }
    script.onerror = () =>
      reject(new Error('Error al cargar el script de Google Maps.'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export default function GoogleMapView({
  center = { lat: -6.15, lng: -79.85 },
  zoom = 8,
  markers = [],
  polylines = [],
  onMapClick,
  fitToData = true,
  className = 'h-full w-full min-h-[250px]',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const overlaysRef = useRef([])
  const clickListenerRef = useRef(null)
  const onMapClickRef = useRef(onMapClick)
  const [mapError, setMapError] = useState('')
  const [ready, setReady] = useState(false)

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    if (!apiKey) return

    let cancelled = false
    window.gm_authFailure = () => {
      if (!cancelled) {
        setMapError(
          'Google Maps rechazó la clave API (revisa las restricciones o la facturación en Google Cloud).'
        )
      }
    }

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return
        if (!mapRef.current) {
          mapRef.current = new maps.Map(containerRef.current, {
            center,
            zoom,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
          })
          clickListenerRef.current = mapRef.current.addListener('click', (e) => {
            if (onMapClickRef.current && e.latLng) {
              onMapClickRef.current({
                lat: Number(e.latLng.lat().toFixed(6)),
                lng: Number(e.latLng.lng().toFixed(6)),
              })
            }
          })
        }
        setReady(true)
      })
      .catch((err) => {
        if (!cancelled) setMapError(err.message)
      })

    return () => {
      cancelled = true
      if (clickListenerRef.current && window.google?.maps) {
        window.google.maps.event.removeListener(clickListenerRef.current)
        clickListenerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  useEffect(() => {
    const maps = window.google?.maps
    const map = mapRef.current
    if (!ready || !maps || !map) return

    overlaysRef.current.forEach((o) => o.setMap(null))
    overlaysRef.current = []

    const bounds = new maps.LatLngBounds()
    let hasPoints = false

    polylines.forEach((line) => {
      if (!line.path || line.path.length < 2) return
      const poly = new maps.Polyline({
        path: line.path,
        geodesic: true,
        strokeColor: line.color || '#15803d',
        strokeOpacity: line.opacity ?? 0.92,
        strokeWeight: line.weight || 4,
        map,
      })
      overlaysRef.current.push(poly)
      line.path.forEach((pt) => {
        bounds.extend(pt)
        hasPoints = true
      })
    })

    markers.forEach((m) => {
      if (typeof m.lat !== 'number' || typeof m.lng !== 'number') return
      const pos = { lat: m.lat, lng: m.lng }
      const marker = new maps.Marker({
        position: pos,
        map,
        title: m.title || '',
        zIndex: m.zIndex || 1,
        label: m.label
          ? {
              text: String(m.label),
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '700',
            }
          : undefined,
        icon: m.color
          ? {
              path: maps.SymbolPath.CIRCLE,
              scale: m.scale || 10,
              fillColor: m.color,
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 2.5,
            }
          : undefined,
      })

      if (m.info) {
        const infoWindow = new maps.InfoWindow({ content: m.info })
        marker.addListener('click', () => {
          infoWindow.open({ anchor: marker, map })
        })
      }

      overlaysRef.current.push(marker)
      bounds.extend(pos)
      hasPoints = true
    })

    if (fitToData && hasPoints && (markers.length > 1 || polylines.length > 0)) {
      map.fitBounds(bounds, 48)
    } else if (fitToData && markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng })
      map.setZoom(12)
    } else if (!fitToData) {
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }, [ready, markers, polylines, center, zoom, fitToData])

  if (!apiKey) {
    return (
      <div className="flex h-full min-h-[250px] items-center justify-center rounded-xl bg-gray-100 p-4 text-center text-xs text-gray-600">
        Falta configurar VITE_GOOGLE_MAPS_API_KEY en .env.
      </div>
    )
  }

  if (mapError) {
    return (
      <div className="flex h-full min-h-[250px] items-center justify-center rounded-xl bg-amber-50 p-4 text-center text-xs text-amber-800 border border-amber-200">
        {mapError}
      </div>
    )
  }

  return <div ref={containerRef} className={className} />
}
