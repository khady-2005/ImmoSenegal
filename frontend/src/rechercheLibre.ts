/**
 * Recherche « en une phrase » : repère dans un texte libre le type de bien, la ville, le quartier, le budget
 * et le choix louer / acheter, puis les transforme en filtres du catalogue.
 *
 * Ce n'est PAS de l'intelligence artificielle : c'est de la reconnaissance de mots-clés, entièrement locale
 * (rien n'est envoyé nulle part avant d'ouvrir le catalogue). Les filtres sont ceux que le serveur connaît déjà.
 */

export type Transaction = 'LOCATION' | 'VENTE'
export type TypeBien = 'MAISON' | 'APPARTEMENT' | 'STUDIO' | 'VILLA' | 'TERRAIN'

export type CriteresLibres = {
  transaction: Transaction
  type?: TypeBien
  ville?: string
  quartier?: string
  prixMax?: number
  /** Libellés des critères trouvés dans la phrase, à afficher à la personne. */
  reconnus: string[]
  /** Vrai si au moins un critère a été reconnu dans la phrase. */
  trouve: boolean
}

const VILLES = [
  'Dakar', 'Ziguinchor', 'Thiès', 'Saint-Louis', 'Mbour', 'Kaolack', 'Touba', 'Saly', 'Rufisque', 'Pikine',
  'Guédiawaye', 'Cap Skirring', 'Kolda', 'Tambacounda', 'Fatick', 'Louga', 'Diourbel', 'Matam', 'Sédhiou',
  'Kédougou', 'Kaffrine', 'Mbacké', 'Tivaouane', 'Joal', 'Bignona', 'Oussouye',
]

const TYPES: { type: TypeBien; motif: RegExp; libelle: string }[] = [
  { type: 'MAISON', motif: /\bmaisons?\b/, libelle: 'Maison' },
  { type: 'APPARTEMENT', motif: /\b(?:appartements?|apparts?)\b/, libelle: 'Appartement' },
  { type: 'STUDIO', motif: /\bstudios?\b/, libelle: 'Studio' },
  { type: 'VILLA', motif: /\bvillas?\b/, libelle: 'Villa' },
  { type: 'TERRAIN', motif: /\b(?:terrains?|parcelles?)\b/, libelle: 'Terrain' },
]

/** Mots qui ne peuvent pas être un nom de quartier. */
const MOTS_VIDES = new Set([
  'a', 'au', 'aux', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'un', 'une', 'en', 'et', 'ou', 'pour', 'sur', 'dans',
  'vers', 'pres', 'proche', 'cote', 'moins', 'plus', 'max', 'maximum', 'budget', 'sous', 'jusqu', 'fcfa', 'cfa', 'louer',
  'location', 'vendre', 'vente', 'acheter', 'achat', 'loyer', 'studio', 'studios', 'maison', 'maisons', 'villa', 'villas',
  'appartement', 'appartements', 'terrain', 'terrains', 'parcelle', 'parcelles', 'avec', 'sans', 'pas', 'cher', 'chere',
  'petit', 'petite', 'grand', 'grande', 'quartier', 'cherche', 'je', 'veux', 'voudrais', 'trouver', 'ma', 'mon', 'mes',
  'million', 'millions', 'mille', 'piece', 'pieces', 'chambre', 'chambres',
])

/** Correspondance un pour un avec le texte d'origine : sans accents, en minuscules, apostrophes simplifiées. */
function normaliser(texte: string): { original: string[]; norm: string } {
  const original = Array.from(texte.normalize('NFC'))
  const norm = original
    .map((c) => {
      if (c.length > 1) return ' '
      if (c === '’' || c === '‘') return "'"
      const sans = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
      return sans.length > 0 ? sans[0] : c
    })
    .join('')
  return { original, norm }
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function montantTexte(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function valeur(brut: string, unite?: string): number {
  const milliers = /^\d{1,3}(?:[ .  ]\d{3})+$/.test(brut)
  let n = milliers ? Number(brut.replace(/[ .  ]/g, '')) : Number(brut.replace(',', '.'))
  if (unite && /^(?:millions?|m)$/.test(unite)) n *= 1_000_000
  else if (unite && /^(?:mille|k)$/.test(unite)) n *= 1000
  return Math.round(n)
}

const MONTANT = /(\d{1,3}(?:[ .  ]\d{3})+|\d+(?:[.,]\d+)?)\s*(millions?|mille|k|m|fcfa|cfa|f)?(?![a-z0-9])/g
const NON_MONTANT = /^\s*(?:m2|m²|metres?|pieces?|chambres?|ch\b|p\b|salons?|etages?|niveaux?)/
const PLANCHER = /(?:plus de|au moins|a partir de|minimum|min\.?)\s*$/
const PLAFOND = /(?:moins de|max(?:imum)?|budget|sous|jusqu'?a?|pas plus de|inferieur a|<)\s*(?:de |d')?$/

function trouverBudget(norm: string): number | undefined {
  const candidats: { n: number; plafond: boolean }[] = []
  for (const m of norm.matchAll(MONTANT)) {
    const debut = m.index ?? 0
    const fin = debut + m[0].length
    if (NON_MONTANT.test(norm.slice(fin))) continue
    const n = valeur(m[1], m[2])
    if (!Number.isFinite(n) || n < 1000) continue
    const avant = norm.slice(Math.max(0, debut - 30), debut)
    if (PLANCHER.test(avant)) continue
    candidats.push({ n, plafond: PLAFOND.test(avant) })
  }
  return (candidats.find((c) => c.plafond) ?? candidats[0])?.n
}

function trouverVille(norm: string): { nom: string; norm: string } | undefined {
  let meilleur: { nom: string; norm: string; index: number } | undefined
  for (const nom of VILLES) {
    const nomNorm = normaliser(nom).norm
    // Un tiret ou une espace dans le nom (Saint-Louis, Cap Skirring) s'accepte sous les deux formes.
    const motif = new RegExp(`\\b${echapper(nomNorm).replace(/[- ]/g, '[- ]')}\\b`)
    const index = norm.search(motif)
    if (index >= 0 && (!meilleur || index < meilleur.index)) meilleur = { nom, norm: nomNorm, index }
  }
  return meilleur && { nom: meilleur.nom, norm: meilleur.norm }
}

const PLACE =
  /\b(?:quartier|pres (?:de la|de l'|du|des|de|d')|a cote (?:de la|du|des|de|d')|proche (?:de la|du|des|de|d')|vers|dans (?:le |la |les |l')?|aux|au|a)\s+(?=([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2}))/g

function trouverQuartier(original: string[], norm: string): string | undefined {
  const villes = new Set(VILLES.map((v) => normaliser(v).norm))
  for (const m of norm.matchAll(PLACE)) {
    const debut = (m.index ?? 0) + m[0].length
    const mots = m[1].split(/\s+/)
    if (MOTS_VIDES.has(mots[0]) || villes.has(mots[0])) continue
    const gardes: string[] = []
    for (const mot of mots) {
      if (MOTS_VIDES.has(mot)) break
      gardes.push(mot)
    }
    if (gardes.length === 0) continue
    // On reprend le texte d'origine (avec ses accents) à la même position.
    const longueur = gardes.join(' ').length
    const brut = original.slice(debut, debut + longueur).join('').trim()
    if (brut.length < 2) continue
    return brut.charAt(0).toUpperCase() + brut.slice(1)
  }
  return undefined
}

export function analyser(texte: string, transactionParDefaut: Transaction = 'LOCATION'): CriteresLibres {
  const { original, norm } = normaliser(texte)
  const reconnus: string[] = []

  const iVente = norm.search(/\b(?:vendre|vente|acheter|achat|acquerir)\b/)
  const iLocation = norm.search(/\b(?:louer|location|loyer)\b/)
  let transaction = transactionParDefaut
  let transactionTrouvee = false
  if (iVente >= 0 || iLocation >= 0) {
    transactionTrouvee = true
    transaction = iVente >= 0 && (iLocation < 0 || iVente < iLocation) ? 'VENTE' : 'LOCATION'
    reconnus.push(transaction === 'VENTE' ? 'À vendre' : 'À louer')
  }

  let type: TypeBien | undefined
  let meilleurIndex = Infinity
  let libelleType = ''
  for (const t of TYPES) {
    const i = norm.search(t.motif)
    if (i >= 0 && i < meilleurIndex) {
      meilleurIndex = i
      type = t.type
      libelleType = t.libelle
    }
  }
  if (type) reconnus.push(libelleType)

  const ville = trouverVille(norm)
  if (ville) reconnus.push(ville.nom)

  const quartier = trouverQuartier(original, norm)
  if (quartier) reconnus.push(`Quartier ${quartier}`)

  const prixMax = trouverBudget(norm)
  if (prixMax) reconnus.push(`Budget max ${montantTexte(prixMax)} FCFA`)

  return {
    transaction,
    type,
    ville: ville?.nom,
    quartier,
    prixMax,
    reconnus,
    trouve: transactionTrouvee || Boolean(type || ville || quartier || prixMax),
  }
}

/** Adresse du catalogue avec les filtres reconnus (mêmes noms de paramètres que le formulaire de recherche). */
export function versCatalogue(c: CriteresLibres): string {
  const p = new URLSearchParams({ transaction: c.transaction })
  if (c.type) p.set('type', c.type)
  if (c.ville) p.set('ville', c.ville)
  if (c.quartier) p.set('quartier', c.quartier)
  if (c.prixMax) p.set('prixMax', String(c.prixMax))
  return `/catalogue?${p.toString()}`
}

/**
 * Champ unique « Ville ou quartier » du formulaire : une ville connue devient le filtre « ville »,
 * tout autre texte est cherché comme « quartier ».
 */
export function lieuVersFiltre(texte: string): { ville?: string; quartier?: string } {
  const propre = texte.trim()
  if (!propre) return {}
  const ville = trouverVille(normaliser(propre).norm)
  // « Dakar » ou « Saint Louis » seuls : c'est la ville. « Médina, Dakar » ou « Kandé » : on cherche le texte tel quel.
  if (ville && normaliser(propre).norm.replace(/[- ]/g, '') === ville.norm.replace(/[- ]/g, '')) return { ville: ville.nom }
  return { quartier: propre }
}
