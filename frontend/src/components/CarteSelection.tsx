import { useEffect } from 'react'
import L, { type LeafletEvent, type LatLng } from 'leaflet'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const iconeRepere = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

type Props = {
  ville?: string
  latitude: string
  longitude: string
  onChange: (latitude: number, longitude: number) => void
}

function ClicCarte({ onChange }: { onChange: Props['onChange'] }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function CentrerCarte({ position, zoom }: { position: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(position, zoom)
  }, [map, position[0], position[1], zoom])

  return null
}

function positionVille(ville: string): [number, number] {
  const nom = ville.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (nom.includes('ziguinchor')) return [12.568, -16.273]
  if (nom.includes('dakar')) return [14.7167, -17.4677]
  if (nom.includes('kaolack')) return [14.15, -16.07]
  if (nom.includes('saint')) return [16.0179, -16.4896]
  return [14.5, -14.5]
}

export default function CarteSelection({
  ville = 'Ziguinchor',
  latitude,
  longitude,
  onChange,
}: Props) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  const coordonneesValides =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180

  const position: [number, number] = coordonneesValides
    ? [lat, lng]
    : positionVille(ville)
  const zoom = coordonneesValides ? 16 : (position[0] === 14.5 ? 6 : 13)

  function deplacerRepere(e: LeafletEvent) {
    const nouvellePosition: LatLng = (e.target as L.Marker).getLatLng()
    onChange(nouvellePosition.lat, nouvellePosition.lng)
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={position}
        zoom={zoom}
        scrollWheelZoom
        className="h-80 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClicCarte onChange={onChange} />
        <CentrerCarte position={position} zoom={zoom} />
        {coordonneesValides && (
          <Marker
            position={position}
            icon={iconeRepere}
            draggable
            eventHandlers={{ dragend: deplacerRepere }}
          />
        )}
      </MapContainer>
    </div>
  )
}
