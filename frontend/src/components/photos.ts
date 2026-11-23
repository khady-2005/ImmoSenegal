import { urlApi } from '../api'

/** Adresse publique d'une photo d'annonce. */
export function urlPhoto(annonceId: string, photoId: string, version?: string): string {
  const chemin = `/api/annonces/${encodeURIComponent(annonceId)}/photos/${encodeURIComponent(photoId)}`
  return urlApi(version ? `${chemin}?v=${encodeURIComponent(version)}` : chemin)
}

export const TAILLE_MAX_OCTETS = 5 * 1024 * 1024
export const PHOTOS_MAX = 8
