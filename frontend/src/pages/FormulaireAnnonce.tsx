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
  const { utilisateur, jeton } = useAuth()
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
  const [longitude, setLongitude] = useState('')
  const [localisationEnCours, setLocalisationEnCours] = useState(false)
  const [messageCarte, setMessageCarte] = useState('')
  const [proprietaires, setProprietaires] = useState<ProprietaireOption[]>([])
  const [proprietaireId, setProprietaireId] = useState('')

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
        setInitial(a)
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

  if (!peutPublier(utilisateur?.role)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-2xl font-bold">Publier une annonce</h1>
        <p role="alert" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-slate-800">
          Seuls les comptes Propriétaire et Administrateur peuvent publier une annonce. Si vous êtes Client, demandez le rôle Propriétaire depuis votre tableau de bord ; un administrateur devra valider votre demande.
        </p>
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
    const adresseComplete = [data.get('adresse'), data.get('quartier'), data.get('ville'), 'Sénégal']
      .map(v => String(v ?? '').trim()).filter(Boolean).join(', ')
    if (!String(data.get('quartier') ?? '').trim() || !String(data.get('ville') ?? '').trim()) {
      setMessageCarte('Renseignez d’abord le quartier et la ville.')
      return
    }
    setLocalisationEnCours(true)
    setMessageCarte('Recherche de cette adresse sur la carte…')
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search')
      url.search = new URLSearchParams({ q: adresseComplete, format: 'jsonv2', limit: '1', countrycodes: 'sn' }).toString()
      const response = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('La recherche de l’adresse est momentanément indisponible.')
      const resultats = await response.json() as Array<{ lat: string; lon: string; display_name: string }>
      if (!resultats.length) throw new Error('Adresse introuvable. Essayez de préciser le quartier ou la rue.')
      setLatitude(resultats[0].lat)
      setLongitude(resultats[0].lon)
      setMessageCarte('Emplacement trouvé : ' + resultats[0].display_name + '. Vérifiez le repère sur la carte.')
    } catch (e) {
      setMessageCarte(e instanceof Error ? e.message : 'Impossible de localiser cette adresse.')
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
              ? "Votre annonce est publiée immédiatement et sa couverture actuelle va jusqu’au " + new Date(dateFinPublication + 'T00:00:00').toLocaleDateString('fr-FR') + ". Sans abonnement actif, les 30 premiers jours sont gratuits. Avant cette échéance, choisissez un abonnement ou négociez un mandat avec une agence pour maintenir la publication."
              : "Votre annonce est publiée dans le catalogue et sa publication est couverte par votre abonnement ou sa prise en charge. Vous pouvez maintenant ajouter jusqu'à 8 photos et, si vous le souhaitez, une vidéo de présentation."
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
    <div className="mx-auto max-w-2xl px-4 py-8">
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
        <Champ id="titre" name="titre" libelle="Titre" required maxLength={150} defaultValue={a?.titre} erreur={champs.titre} />
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea id="description" name="description" rows={4} maxLength={5000} defaultValue={a?.description ?? ''} className={classeSelect} />
          {champs.description && <p className="mt-1 text-sm text-red-700">{champs.description}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="transaction" className="mb-1 block text-sm font-medium text-slate-700">Transaction</label>
            <select id="transaction" name="transaction" defaultValue={a?.transaction ?? 'LOCATION'} className={classeSelect}>
              {(['LOCATION', 'VENTE'] as TypeTransaction[]).map((t) => (
                <option key={t} value={t}>{t === 'LOCATION' ? 'Location' : 'Vente'}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="typeBien" className="mb-1 block text-sm font-medium text-slate-700">Type de bien</label>
            <select id="typeBien" name="typeBien" defaultValue={a?.typeBien ?? 'APPARTEMENT'} className={classeSelect}>
              {(Object.keys(libelleTypeBien) as TypeBien[]).map((t) => (
                <option key={t} value={t}>{libelleTypeBien[t]}</option>
              ))}
            </select>
          </div>
          <Champ id="prix" name="prix" type="number" min={1} libelle="Prix (FCFA)" required defaultValue={a?.prix} erreur={champs.prix} />
          <Champ id="superficie" name="superficie" type="number" min={1} step="any" libelle="Superficie (m²)" required defaultValue={a?.superficie} erreur={champs.superficie} />
          <Champ id="pieces" name="pieces" type="number" min={0} libelle="Nombre de pièces" defaultValue={a?.pieces ?? ''} erreur={champs.pieces} />
          <Champ id="quartier" name="quartier" libelle="Quartier" required defaultValue={a?.quartier} erreur={champs.quartier} />
          <Champ id="ville" name="ville" libelle="Ville" required defaultValue={a?.ville ?? 'Ziguinchor'} erreur={champs.ville} />
          <Champ id="adresse" name="adresse" libelle="Adresse (facultatif)" defaultValue={a?.adresse ?? ''} erreur={champs.adresse} />
        </div>
        <section className="rounded-2xl border border-dore-200 bg-dore-50/60 p-4 sm:p-5" aria-labelledby="titre-position-bien">
          <div>
            <h2 id="titre-position-bien" className="font-semibold text-nuit-900">Localisation sur la carte</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">Placez le repère à l’emplacement du logement. Cette position sera visible sur sa fiche pour aider les visiteurs à préparer leur déplacement.</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => void localiserAdresse()} disabled={localisationEnCours} className="rounded-xl bg-nuit-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              {localisationEnCours ? 'Recherche…' : 'Localiser la maison sur la carte'}
            </button>
          </div>
          {messageCarte && <p role="status" className="mt-3 text-sm text-nuit-900">{messageCarte}</p>}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="latitude-bien" className="mb-1 block text-xs font-medium text-slate-600">Latitude GPS</label>
              <input id="latitude-bien" type="number" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} placeholder="Ex. 14.7167" className={classeSelect} />
            </div>
            <div>
              <label htmlFor="longitude-bien" className="mb-1 block text-xs font-medium text-slate-600">Longitude GPS</label>
              <input id="longitude-bien" type="number" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} placeholder="Ex. -17.4677" className={classeSelect} />
            </div>
          </div>
          <CarteSelection
            latitude={latitude}
            longitude={longitude}
            onChange={(lat, lng) => {
              setLatitude(String(lat))
              setLongitude(String(lng))
              setMessageCarte('Position GPS sélectionnée. Vous pouvez déplacer le repère pour ajuster l’emplacement.')
            }}
          />
          {!coordonneesValides && (
            <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs text-slate-600">Cliquez sur la carte pour choisir l’emplacement exact du logement. Vous pouvez aussi déplacer le repère après sa création.</p>
          )}
          <p className="mt-3 text-xs text-slate-500">Conseil : utilisez « Localiser la maison sur la carte » puis vérifiez les coordonnées. Le GPS de votre appareil correspond à votre position actuelle, pas forcément à celle du logement si vous êtes ailleurs.</p>
        </section>
        <Champ id="equipements" name="equipements" libelle="Équipements" aide="Séparés par des virgules : wifi, parking, climatisation" defaultValue={a?.equipements.join(', ')} erreur={champs.equipements} />
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
