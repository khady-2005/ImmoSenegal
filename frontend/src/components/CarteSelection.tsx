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

function CentrerCarte({ position }: { position: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(position, map.getZoom())
  }, [map, position[0], position[1]])

  return null
}

export default function CarteSelection({
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
    : [14.5, -14.5]

  function deplacerRepere(e: LeafletEvent) {
    const nouvellePosition: LatLng = (e.target as L.Marker).getLatLng()
    onChange(nouvellePosition.lat, nouvellePosition.lng)
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={position}
        zoom={coordonneesValides ? 15 : 6}
        scrollWheelZoom
        className="h-80 w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClicCarte onChange={onChange} />
        <CentrerCarte position={position} />
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
