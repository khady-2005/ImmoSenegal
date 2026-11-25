import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, appelApi } from '../api'
import { useAuth } from '../auth'
import Champ from '../components/Champ'
import GestionPhotos from '../components/GestionPhotos'
import GestionVideo from '../components/GestionVideo'
import CarteSelection from '../components/CarteSelection'
import { libelleStatut, libelleTypeBien, statutsCommerciaux, type Annonce, type TypeBien, type TypeTransaction } from '../types'

const classeSelect = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900'

interface ProprietaireOption {
  id: string
  nomComplet: string
  email: string
  role: string
  actif: boolean
}

/** Rôles autorisés par le serveur à publier. Le serveur reste seul juge : ceci évite seulement un écran inutile. */
export function peutPublier(role: string | undefined) {
  return role === 'PROPRIETAIRE' || role === 'ADMIN'
}

export default function FormulaireAnnonce() {
  const { id } = useParams()
  const edition = Boolean(id)
  const { utilisateur, jeton, majUtilisateur } = useAuth()
  const [profilVerifie, setProfilVerifie] = useState(false)
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<string[]>([])
  const [annonceCreeeId, setAnnonceCreeeId] = useState<string | null>(null)
  const [annonceCreeeStatut, setAnnonceCreeeStatut] = useState<Annonce['statut'] | null>(null)
  const [dateFinPublication, setDateFinPublication] = useState<string | null>(null)
  const [initial, setInitial] = useState<Annonce | null>(null)
  const [chargement, setChargement] = useState(edition)
  const [erreur, setErreur] = useState<string | null>(null)
  const [champs, setChamps] = useState<Record<string, string>>({})
  const [envoi, setEnvoi] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')\n  const [villeCarte, setVilleCarte] = useState('Ziguinchor')
  const [localisationEnCours, setLocalisationEnCours] = useState(false)
  const [messageCarte, setMessageCarte] = useState('')
  const [proprietaires, setProprietaires] = useState<ProprietaireOption[]>([])
  const [proprietaireId, setProprietaireId] = useState('')

  // Recharge le rôle depuis le serveur avant d'autoriser la publication.
  // Cela évite de bloquer un propriétaire dont le statut vient d'être approuvé.
  useEffect(() => {
    if (!jeton) {
      setProfilVerifie(true)
      return
    }
    let annule = false
    appelApi<import('../types').Utilisateur>('/api/auth/me', { token: jeton })
      .then((profil) => {
        if (!annule) majUtilisateur(profil)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!annule) setProfilVerifie(true)
      })
    return () => { annule = true }
  }, [jeton, majUtilisateur])

  useEffect(() => {
    if (utilisateur?.role !== 'ADMIN' || edition) return
    let annule = false
    appelApi<ProprietaireOption[]>('/api/admin/users', { token: jeton })
      .then((comptes) => {
        if (!annule) setProprietaires(comptes.filter((u) => u.role === 'PROPRIETAIRE' && u.actif))
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof ApiError ? e.message : 'Impossible de charger les propriétaires.')
      })
    return () => { annule = true }
  }, [utilisateur?.role, edition, jeton])

  useEffect(() => {
    if (!id) return
    let annule = false
    appelApi<Annonce>(`/api/annonces/${id}`, { token: jeton })
      .then((a) => {
        if (annule) return
        setInitial(a)\n        setVilleCarte(a.ville || 'Ziguinchor')
        setPhotos(a.photos)
        setLatitude(a.latitude == null ? '' : String(a.latitude))
        setLongitude(a.longitude == null ? '' : String(a.longitude))
      })
      .catch((e: unknown) => !annule && setErreur(e instanceof ApiError ? e.message : 'Chargement impossible.'))
      .finally(() => !annule && setChargement(false))
    return () => {
      annule = true
    }
  }, [id, jeton])

  if (!profilVerifie) return <p role="status" className="p-8 text-center text-slate-500">Vérification de votre compte…</p>
  if (!peutPublier(utilisateur?.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">Publier une annonce</h1>
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-slate-800">
          Votre compte est actuellement enregistré comme « {utilisateur?.role ?? 'non identifié'} ». La publication est réservée aux comptes Propriétaire et Administrateur. Ouvrez votre tableau de bord pour demander le statut Propriétaire. Si votre demande vient d’être approuvée, déconnectez-vous puis reconnectez-vous avant de réessayer.
        </p>
        <Link to="/tableau-de-bord" className="mt-4 inline-flex rounded-lg bg-nuit-900 px-5 py-3 font-semibold text-white">Ouvrir mon tableau de bord</Link>
      </div>
    )
  }
  if (chargement) return <p role="status" className="p-8 text-center text-slate-500">Chargement…</p>
  if (edition && !initial) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur ?? 'Annonce introuvable.'}</p>
      </div>
    )
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const texte = (k: string) => String(f.get(k) ?? '').trim()
    const nombre = (k: string) => (texte(k) === '' ? null : Number(texte(k)))
    const corps = {
      titre: texte('titre'),
      description: texte('description') || null,
      typeBien: texte('typeBien'),
      transaction: texte('transaction'),
      prix: nombre('prix'),
      superficie: nombre('superficie'),
      pieces: nombre('pieces'),
      quartier: texte('quartier'),
      ville: texte('ville'),
      adresse: texte('adresse') || null,
      latitude: latitude.trim() === '' ? null : Number(latitude),
      longitude: longitude.trim() === '' ? null : Number(longitude),
      equipements: texte('equipements') === '' ? [] : texte('equipements').split(',').map((x) => x.trim()).filter(Boolean),
      // Le statut n'est envoyé que s'il se choisit ici (annonce déjà validée) ; sinon il relève de la modération.
      ...(edition && initial && statutsCommerciaux.includes(initial.statut) ? { statut: texte('statut') } : {}),
    }
    setEnvoi(true)
    setErreur(null)
    setChamps({})
    try {
      if (!edition && utilisateur?.role === 'ADMIN' && !proprietaireId) {
        setErreur('Choisissez le propriétaire de cette annonce.')
        setEnvoi(false)
        return
      }
      const url = edition ? `/api/annonces/${id}` :
        utilisateur?.role === 'ADMIN' ? `/api/annonces?proprietaireId=${encodeURIComponent(proprietaireId)}` : '/api/annonces'
      const reponse = await appelApi<Annonce>(url, {
        method: edition ? 'PUT' : 'POST',
        body: corps,
        token: jeton,
      })
      if (edition) {
        navigate('/mes-annonces')
      } else {
        // On conserve l'utilisateur sur cette page pour qu'il ajoute immédiatement les photos.
        setAnnonceCreeeId(reponse.id)
        setAnnonceCreeeStatut(reponse.statut)
        setDateFinPublication(reponse.dateFinPublication ?? null)
        setPhotos(reponse.photos ?? [])
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setErreur(err.message)
        setChamps(err.details)
      } else setErreur('Une erreur inattendue est survenue.')
      setEnvoi(false)
    }
  }

  const a = initial

  async function localiserAdresse() {
    const form = document.querySelector<HTMLFormElement>('form[aria-label="Formulaire d\'annonce"]')
    if (!form) return
    const data = new FormData(form)
    const ville = String(data.get('ville') ?? '').trim()
    const quartier = String(data.get('quartier') ?? '').trim()
    const adresse = String(data.get('adresse') ?? '').trim()
    if (!quartier || !ville) {
      setMessageCarte('Renseignez d’abord le quartier et la ville.')
      return
    }

    setLocalisationEnCours(true)
    setMessageCarte('Recherche de l’adresse, puis de la ville si nécessaire…')
    try {
      const requetes = [
        [adresse, quartier, ville, 'Sénégal'].filter(Boolean).join(', '),
        [ville, 'Sénégal'].join(', '),
      ]
      let latitudeTrouvee = ''
      let longitudeTrouvee = ''
      let libelleTrouve = ''
      let villeSeulement = false

      // Photon est essayé d'abord, avec une seconde recherche sur la ville
      // si le quartier ou l'adresse précise ne figure pas dans la carte.
      for (let i = 0; i < requetes.length && !latitudeTrouvee; i++) {
        const photonUrl = new URL('https://photon.komoot.io/api/')
        const parametresPhoton: Record<string, string> = { q: requetes[i], limit: '5', lang: 'fr' }\n        // Biais de recherche vers Ziguinchor : cela aide à distinguer ses quartiers\n        // des lieux homonymes situés dans d'autres régions.\n        if (/ziguinchor/i.test(ville)) {\n          parametresPhoton.lat = '12.568';\n          parametresPhoton.lon = '-16.273';\n          parametresPhoton.zoom = '13';\n        }\n        photonUrl.search = new URLSearchParams(parametresPhoton).toString()
        const response = await fetch(photonUrl, { headers: { Accept: 'application/json' } })
        if (response.ok) {
          const photon = await response.json() as {
            features?: Array<{ geometry?: { coordinates?: [number, number] }; properties?: { name?: string; city?: string; district?: string; country?: string } }>
          }
          const resultat = photon.features?.find((item) => {
            const coords = item.geometry?.coordinates
            return Array.isArray(coords) && Number.isFinite(coords[0]) && Number.isFinite(coords[1])
          })
          if (resultat?.geometry?.coordinates) {
            const [lng, lat] = resultat.geometry.coordinates
            longitudeTrouvee = String(lng)
            latitudeTrouvee = String(lat)
            libelleTrouve = [resultat.properties?.name, resultat.properties?.district, resultat.properties?.city, resultat.properties?.country].filter(Boolean).join(', ')
            villeSeulement = i === 1
          }
        }
      }

      // Nominatim sert de deuxième fournisseur et suit les mêmes deux étapes.
      for (let i = 0; i < requetes.length && !latitudeTrouvee; i++) {
        const url = new URL('https://nominatim.openstreetmap.org/search')
        url.search = new URLSearchParams({ q: requetes[i], format: 'jsonv2', limit: '1', countrycodes: 'sn', addressdetails: '1' }).toString()
        const response = await fetch(url, { headers: { Accept: 'application/json' } })
        if (response.ok) {
          const resultats = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
          if (resultats.length) {
            latitudeTrouvee = resultats[0].lat
            longitudeTrouvee = resultats[0].lon
            libelleTrouve = resultats[0].display_name
            villeSeulement = i === 1
          }
        }
      }

      if (!latitudeTrouvee || !longitudeTrouvee) {
        throw new Error('Ville introuvable. Vérifiez son orthographe ou placez directement le repère sur la carte.')
      }
      setLatitude(latitudeTrouvee)
      setLongitude(longitudeTrouvee)
      setMessageCarte(villeSeulement
        ? 'La ville a été localisée (' + (libelleTrouve || ville) + '). Le quartier n’étant pas référencé, déplacez le repère sur la carte jusqu’au logement.'
        : 'Emplacement trouvé : ' + (libelleTrouve || requetes[0]) + '. Vérifiez et ajustez le repère sur la carte.')
    } catch (e) {
      setMessageCarte(e instanceof Error ? e.message : 'Impossible de localiser cette adresse. Vous pouvez placer le repère directement sur la carte.')
    } finally {
      setLocalisationEnCours(false)
    }
  }

  const coordonneesValides = latitude.trim() !== '' && longitude.trim() !== '' &&
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)) &&
    Number(latitude) >= -90 && Number(latitude) <= 90 &&
    Number(longitude) >= -180 && Number(longitude) <= 180
  if (annonceCreeeId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold">Ajoutez les photos de votre bien</h1>
        <p role="status" className="mt-4 rounded-xl bg-dore-100 p-4 text-sm leading-6 text-nuit-900">
          {annonceCreeeStatut === 'PUBLIEE'
            ? dateFinPublication
              ? "Votre annonce est publiée immédiatement et sa couverture actuelle va jusqu’au " + new Date(dateFinPublication + 'T00:00:00').toLocaleDateString('fr-FR') + ". Sans abonnement actif, les 15 premiers jours sont gratuits. Avant cette échéance, choisissez un abonnement ou négociez un mandat avec une agence pour maintenir la publication."
              : "Votre annonce est publiée dans le catalogue et sa publication est couverte par votre abonnement ou sa prise en charge. Vous pouvez maintenant ajouter jusqu'à 15 photos et, si vous le souhaitez, une vidéo de présentation."
            : "Votre bien est enregistré, mais reste invisible du catalogue. Vous pouvez ajouter ses photos et sa vidéo, puis demander sa prise en charge à une agence depuis « Mes annonces »."} Vous gardez la main sur votre bien ; l’administration peut intervenir en cas de signalement ou de non-respect des règles.
        </p>
        <GestionPhotos annonceId={annonceCreeeId} photos={photos} onChange={setPhotos} />
        <GestionVideo annonceId={annonceCreeeId} />
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => navigate('/mes-annonces')} className="rounded-lg bg-nuit-900 px-5 py-2.5 font-semibold text-white">
            Terminer et voir mes annonces
          </button>
          <button type="button" onClick={() => navigate(`/annonces/${annonceCreeeId}/modifier`)} className="rounded-lg border border-slate-300 px-5 py-2.5 font-medium text-slate-700">
            Modifier les informations
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="formulaire-annonce-page mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">{edition ? "Modifier l'annonce" : 'Publier une annonce'}</h1>
      {!edition && (
        <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-blue-900">
          Préparez les informations du logement. Après l'enregistrement, vous pourrez ajouter plusieurs photos des pièces et une vidéo facultative.
        </p>
      )}
      <form onSubmit={soumettre} noValidate aria-label="Formulaire d'annonce" className="mt-6 space-y-4 rounded-2xl bg-white p-5 shadow">
        {erreur && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
        {!edition && utilisateur?.role === 'ADMIN' && (
          <div>
            <label htmlFor="proprietaire-annonce" className="mb-1 block text-sm font-medium text-slate-700">Propriétaire de cette annonce</label>
            <select id="proprietaire-annonce" value={proprietaireId} onChange={(e) => setProprietaireId(e.target.value)} required className={classeSelect}>
              <option value="">Choisir un propriétaire</option>
              {proprietaires.map((p) => <option key={p.id} value={p.id}>{p.nomComplet} — {p.email}</option>)}
            </select>
            {proprietaires.length === 0 && <p className="mt-1 text-sm text-amber-800">Aucun compte propriétaire actif. Il faut d'abord qu'un compte soit inscrit puis validé avec le rôle Propriétaire.</p>}
            <p className="mt-1 text-xs text-slate-500">Les demandes de visite pour cette annonce seront envoyées à ce propriétaire. L'administration conservera l'accès de suivi.</p>
          </div>
        )}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="titre-infos-annonce">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-dore-300">1</span>
            <div><h2 id="titre-infos-annonce" className="font-semibold text-nuit-900">Informations du bien</h2><p className="text-xs text-slate-500">Présentez le logement et fixez son prix.</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Champ id="titre" name="titre" libelle="Titre de l’annonce" required maxLength={150} defaultValue={a?.titre} erreur={champs.titre} /></div>
            <div>
              <label htmlFor="typeBien" className="mb-1 block text-sm font-medium text-slate-700">Type de bien</label>
              <select id="typeBien" name="typeBien" defaultValue={a?.typeBien ?? 'APPARTEMENT'} className={classeSelect}>
                {(Object.keys(libelleTypeBien) as TypeBien[]).map((t) => <option key={t} value={t}>{libelleTypeBien[t]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="transaction" className="mb-1 block text-sm font-medium text-slate-700">Transaction</label>
              <select id="transaction" name="transaction" defaultValue={a?.transaction ?? 'LOCATION'} className={classeSelect}>
                {(['LOCATION', 'VENTE'] as TypeTransaction[]).map((t) => <option key={t} value={t}>{t === 'LOCATION' ? 'Location' : 'Vente'}</option>)}
              </select>
            </div>
            <Champ id="prix" name="prix" type="number" min={1} libelle="Prix (FCFA)" required defaultValue={a?.prix} erreur={champs.prix} />
            <Champ id="superficie" name="superficie" type="number" min={1} step="any" libelle="Superficie (m²)" required defaultValue={a?.superficie} erreur={champs.superficie} />
            <Champ id="pieces" name="pieces" type="number" min={0} libelle="Nombre de pièces" defaultValue={a?.pieces ?? ''} erreur={champs.pieces} />
          </div>
          <div className="mt-4">
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description du bien</label>
            <textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={a?.description ?? ''} placeholder="Décrivez les pièces, les espaces, l’état du logement et ses points forts…" className={classeSelect} />
            {champs.description && <p className="mt-1 text-sm text-red-700">{champs.description}</p>}
          </div>
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-semibold text-nuit-900">Équipements</h3>
            <p className="mb-3 text-sm text-slate-600">Séparez les équipements par des virgules : Wi-Fi, parking, climatisation, piscine…</p>
            <Champ id="equipements" name="equipements" libelle="Équipements disponibles" aide="Ex. : Wi-Fi, parking, climatisation" defaultValue={a?.equipements.join(', ')} erreur={champs.equipements} />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-labelledby="titre-adresse-bien">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-dore-300">2</span>
            <div><h2 id="titre-adresse-bien" className="font-semibold text-nuit-900">Adresse du bien</h2><p className="text-xs text-slate-500">Indiquez où se trouve le logement.</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Champ id="ville" name="ville" libelle="Ville" required defaultValue={a?.ville ?? 'Ziguinchor'} onChange={(e) => setVilleCarte(e.target.value)} erreur={champs.ville} />
            <Champ id="quartier" name="quartier" libelle="Quartier" required defaultValue={a?.quartier} erreur={champs.quartier} />
            <div className="sm:col-span-2"><Champ id="adresse" name="adresse" libelle="Adresse précise (facultatif)" defaultValue={a?.adresse ?? ''} erreur={champs.adresse} /></div>
          </div>
        </section>

        <section className="rounded-2xl border border-dore-200 bg-dore-50/60 p-4 sm:p-5" aria-labelledby="titre-position-bien">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-dore-300">3</span>
            <div><h2 id="titre-position-bien" className="font-semibold text-nuit-900">Position sur la carte</h2><p className="text-xs text-slate-600">Aidez les visiteurs à repérer le bien.</p></div>
          </div>
          <p className="text-sm leading-relaxed text-slate-600">Placez le repère à l’emplacement du logement. Cette position sera visible sur sa fiche pour aider les visiteurs à préparer leur déplacement.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void localiserAdresse()} disabled={localisationEnCours} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-nuit-900 px-5 py-2.5 text-sm font-bold !text-white shadow-sm transition hover:bg-nuit-800 disabled:cursor-not-allowed disabled:opacity-60">
              {localisationEnCours ? 'Recherche…' : 'Localiser le bien sur la carte'}
            </button>
          </div>
          {messageCarte && <p role="status" className="mt-3 text-sm text-nuit-900">{messageCarte}</p>}
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-sm font-semibold text-nuit-900">Coordonnées GPS automatiques</p>
            <p className="mt-1 text-sm text-slate-600">Elles se remplissent dès que vous recherchez l’adresse ou cliquez sur la carte. Vous n’avez pas besoin de les saisir.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="block text-xs font-semibold text-slate-600">Latitude</span>
                <output className="mt-1 block break-all text-base font-bold text-nuit-900">{coordonneesValides ? Number(latitude).toFixed(6) : 'À sélectionner sur la carte'}</output>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <span className="block text-xs font-semibold text-slate-600">Longitude</span>
                <output className="mt-1 block break-all text-base font-bold text-nuit-900">{coordonneesValides ? Number(longitude).toFixed(6) : 'À sélectionner sur la carte'}</output>
              </div>
            </div>
          </div>
          <CarteSelection ville={villeCarte} latitude={latitude} longitude={longitude} onChange={(lat, lng) => { setLatitude(String(lat)); setLongitude(String(lng)); setMessageCarte('Position enregistrée automatiquement. Vous pouvez déplacer le repère pour ajuster l’emplacement.') }} />
          {!coordonneesValides && <p className="mt-3 rounded-xl bg-white p-3 text-sm font-medium text-slate-700">Sur la carte, cliquez directement à l’endroit où se trouve le logement. Le repère et les coordonnées seront ajoutés automatiquement.</p>}
          <p className="mt-3 text-sm text-slate-600">Astuce : recherchez d’abord le quartier et la ville avec le bouton ci-dessus, puis ajustez le repère sur la carte si nécessaire.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-dore-300">4</span>
            <div><h2 className="font-semibold text-nuit-900">Photos et vidéo</h2><p className="text-xs text-slate-500">Après l’enregistrement, ajoutez jusqu’à 15 photos et une vidéo facultative.</p></div>
          </div>
        </section>
        {edition && a && statutsCommerciaux.includes(a.statut) && (
          <div>
            <label htmlFor="statut" className="mb-1 block text-sm font-medium text-slate-700">Statut</label>
            <select id="statut" name="statut" defaultValue={a.statut} className={classeSelect}>
              {statutsCommerciaux.map((s) => (
                <option key={s} value={s}>{libelleStatut[s]}</option>
              ))}
            </select>
            <p className="mt-1 text-sm text-slate-600">
              Seule une annonce « Publiée » apparaît dans le catalogue. Vous pouvez modifier son contenu et ses photos sans interrompre sa publication. L’administration peut toutefois intervenir en cas de signalement ou de non-respect des règles.
            </p>
          </div>
        )}
        {edition && a && !statutsCommerciaux.includes(a.statut) && (
          <div role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-slate-800">
            <p><strong>Statut : {libelleStatut[a.statut]}.</strong>{' '}
              {a.statut === 'EN_ATTENTE' && "La période de couverture est terminée. L'annonce reste dans votre espace, mais n'est plus visible dans le catalogue. Souscrivez un abonnement ou faites accepter un mandat par une agence pour la republier."}
              {a.statut === 'A_CORRIGER' && "Corrigez ce qui est demandé : en enregistrant, elle repart en attente de validation."}
              {a.statut === 'REFUSEE' && "Elle ne peut plus être modifiée : créez une nouvelle annonce."}
              {a.statut === 'SUSPENDUE' && "Elle est retirée du catalogue : contactez l'administration."}
            </p>
            {a.motifModeration && <p className="mt-1"><strong>Motif :</strong> {a.motifModeration}</p>}
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={envoi} className="rounded-lg bg-nuit-900 px-4 py-2.5 font-semibold text-white hover:bg-nuit-800 disabled:opacity-60">
            {envoi ? 'Envoi…' : edition ? 'Enregistrer' : 'Enregistrer et ajouter les photos'}
          </button>
          <Link to="/mes-annonces" className="rounded-lg border border-slate-300 px-4 py-2.5 font-medium">
            Annuler
          </Link>
        </div>
      </form>
      {edition && id && <GestionPhotos annonceId={id} photos={photos} onChange={setPhotos} />}
      {edition && id && <GestionVideo annonceId={id} />}
    </div>
  )
}
