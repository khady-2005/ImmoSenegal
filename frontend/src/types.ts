export type Role = 'CLIENT' | 'PROPRIETAIRE' | 'AGENT' | 'ADMIN'

export interface Utilisateur {
  id: string
  email: string
  nomComplet: string
  telephone: string | null
  role: Role
  creeLe: string
}

export interface ReponseConnexion {
  accessToken: string
  tokenType: string
  expiresInSeconds: number
  user: Utilisateur
}

export const libelleRole: Record<Role, string> = {
  CLIENT: 'Client',
  PROPRIETAIRE: 'Propriétaire',
  AGENT: 'Agent immobilier',
  ADMIN: 'Administrateur',
}

// ---------- Annonces ----------

export type TypeBien = 'MAISON' | 'APPARTEMENT' | 'STUDIO' | 'VILLA' | 'TERRAIN'
export type TypeTransaction = 'LOCATION' | 'VENTE'
export type StatutAnnonce = 'EN_ATTENTE' | 'PUBLIEE' | 'A_CORRIGER' | 'REFUSEE' | 'SUSPENDUE' | 'RESERVE' | 'VENDU' | 'LOUE'

export interface Annonce {
  id: string
  titre: string
  description: string | null
  typeBien: TypeBien
  transaction: TypeTransaction
  prix: number
  superficie: number
  pieces: number | null
  quartier: string
  ville: string
  adresse: string | null
  latitude: number | null
  longitude: number | null
  equipements: string[]
  statut: StatutAnnonce
  proprietaire: { id: string; nomComplet: string }
  creeLe: string
  modifieLe: string
  /** Date de fin de la période gratuite de 30 jours, absente si abonnement actif. */
  dateFinGratuite?: string | null
  /** Identifiants des photos, la première sert de couverture. */
  photos: string[]
  /** Motif de la dernière décision de modération : fourni seulement au propriétaire et aux administrateurs. */
  motifModeration?: string | null
  /** Vrai pour une annonce de démonstration : ses données sont simulées et doivent être présentées comme telles. */
  exemple: boolean
}

export interface PagePaginee<T> {
  contenu: T[]
  page: number
  taille: number
  totalElements: number
  totalPages: number
}

export const libelleTypeBien: Record<TypeBien, string> = {
  MAISON: 'Maison',
  APPARTEMENT: 'Appartement',
  STUDIO: 'Studio',
  VILLA: 'Villa',
  TERRAIN: 'Terrain',
}

export const libelleStatut: Record<StatutAnnonce, string> = {
  EN_ATTENTE: 'En attente d’abonnement ou de mandat',
  PUBLIEE: 'Publiée',
  A_CORRIGER: 'À corriger',
  REFUSEE: 'Refusée',
  SUSPENDUE: 'Suspendue',
  RESERVE: 'Réservé',
  VENDU: 'Vendu',
  LOUE: 'Loué',
}

/**
 * Statuts que le propriétaire choisit lui-même, sur une annonce déjà validée. Les autres (en attente, à corriger,
 * refusée, suspendue) relèvent de la modération par un administrateur ; le serveur reste seul juge.
 */
export const statutsCommerciaux: StatutAnnonce[] = ['PUBLIEE', 'RESERVE', 'VENDU', 'LOUE']


// ---------- Demandes de visite ----------
export type StatutVisite = 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE' | 'PROPOSEE' | 'ANNULEE'

export interface DemandeVisite {
  id: string
  annonceId: string
  annonceTitre: string
  ville: string
  quartier: string
  clientId: string
  clientNom: string
  clientEmail: string
  clientTelephone: string | null
  proprietaireNom: string
  dateVisite: string
  message: string | null
  statut: StatutVisite
  reponseProprietaire: string | null
  creeLe: string
  modifieLe: string
}
