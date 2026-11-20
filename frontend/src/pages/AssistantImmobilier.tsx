import { useState, type FormEvent } from 'react'
import { Bot, Search, Sparkles } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import AnnonceCard from '../components/AnnonceCard'
import type { Annonce, PagePaginee, TypeBien, TypeTransaction } from '../types'

type Message = { role: 'assistant' | 'user'; content: string }

type Criteres = {
  transaction: TypeTransaction
  type: TypeBien | ''
  ville: string
  quartier: string
  prixMax: string
  piecesMin: string
  equipements: string
}

const initial: Criteres = {
  transaction: 'LOCATION',
  type: '',
  ville: '',
  quartier: '',
  prixMax: '',
  piecesMin: '',
  equipements: '',
}

export default function AssistantImmobilier() {
  const [criteres, setCriteres] = useState<Criteres>(initial)
  const [annonces, setAnnonces] = useState<Annonce[]>([])
  const [rechercheFaite, setRechercheFaite] = useState(false)
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis l’assistant immobilier d’ImmoSénégal. Je peux vous guider pour louer ou acheter un logement et vous aider à rechercher dans les annonces publiées. Quel est votre projet ?" },
  ])
  const [message, setMessage] = useState('')

  function envoyerMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const texte = message.trim()
    if (!texte) return
    const bas = texte.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const nouveaux: Criteres = { ...criteres }
    const changements: string[] = []

    if (/\b(louer|location|locataire)\b/.test(bas)) {
      nouveaux.transaction = 'LOCATION'
      changements.push('location')
    } else if (/\b(acheter|achat|vente|acquerir)\b/.test(bas)) {
      nouveaux.transaction = 'VENTE'
      changements.push('achat')
    }

    const types: [RegExp, TypeBien][] = [
      [/\b(maison|maisons)\b/, 'MAISON'],
      [/\b(appartement|appartements)\b/, 'APPARTEMENT'],
      [/\b(studio|studios)\b/, 'STUDIO'],
      [/\b(villa|villas)\b/, 'VILLA'],
      [/\b(terrain|terrains)\b/, 'TERRAIN'],
    ]
    const typeTrouve = types.find(([regex]) => regex.test(bas))?.[1]
    if (typeTrouve) {
      nouveaux.type = typeTrouve
      changements.push('type de bien')
    }

    const villes = ['Dakar', 'Thies', 'Saint-Louis', 'Ziguinchor', 'Kaolack', 'Mbour', 'Rufisque']
    const villeTrouvee = villes.find((ville) => bas.includes(ville.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
    if (villeTrouvee) {
      nouveaux.ville = villeTrouvee === 'Thies' ? 'Thiès' : villeTrouvee
      changements.push('ville')
    }

    const quartier = texte.match(/quartier\s+(?:de\s+)?([\p{L} -]{2,30})/iu)
    if (quartier?.[1]) {
      nouveaux.quartier = quartier[1].trim().replace(/[.,!?].*$/, '')
      changements.push('quartier')
    }

    const budgetMentionne = /budget|maximum|max|prix|fcfa|francs?|mille/.test(bas)
    const montant = texte.match(/(\d[\d\s.,]*)(?:\s*(mille|millions?))?/i)
    if (budgetMentionne && montant) {
      const nombre = Number(montant[1].replace(/[\s.,]/g, '')) * (montant[2]?.toLowerCase().startsWith('mill') ? 1000000 : montant[2] ? 1000 : 1)
      if (Number.isFinite(nombre) && nombre > 0) {
        nouveaux.prixMax = String(nombre)
        changements.push('budget')
      }
    }

    const pieces = bas.match(/(\d+)\s*(?:pieces?|chambres?)/)
    if (pieces) {
      nouveaux.piecesMin = pieces[1]
      changements.push('nombre de pièces')
    }

    const equipements = ['parking', 'climatisation', 'wifi', 'jardin', 'garage', 'meuble', 'terrasse', 'piscine']
    const equipementsTrouves = equipements.filter((item) => bas.includes(item))
    if (equipementsTrouves.length) {
      nouveaux.equipements = [...new Set([...(criteres.equipements ? criteres.equipements.split(',').map((x) => x.trim().toLowerCase()) : []), ...equipementsTrouves])].join(', ')
      changements.push('équipements')
    }

    setCriteres(nouveaux)
    let reponse: string
    if (/\b(bonjour|salut|bonsoir)\b/.test(bas) && changements.length === 0) {
      reponse = "Bonjour ! Je peux vous accompagner pour louer ou acheter un logement au Sénégal. Décrivez-moi votre projet avec vos mots."
    } else if (/mot de passe|mot de passe oublie|connexion|compte bloque/.test(bas)) {
      reponse = "Pour récupérer votre compte, ouvrez « Connexion », puis « Mot de passe oublié ? ». Vous recevrez un lien temporaire par e-mail si votre compte est actif. Pensez à vérifier les courriers indésirables."
    } else if (/resiliation|resilier|fin du contrat/.test(bas)) {
      reponse = "Pour demander la résiliation, ouvrez « Mes contrats de location », sélectionnez le contrat actif et envoyez une demande avec un motif et une date souhaitée. L’autre partie doit répondre. En cas de désaccord, vous pouvez signaler un incident ou demander un suivi à l’administration."
    } else if (/litige|desaccord|incident|reparation|probleme dans le logement/.test(bas)) {
      reponse = "Pendant une location, ouvrez « Incidents et réparations » pour décrire le problème. L’autre partie sera notifiée et pourra suivre son traitement. L’administration dispose aussi d’un espace de supervision des dossiers."
    } else if (/abonnement|publier|publication|commission|mandat|agence/.test(bas)) {
      reponse = "Un propriétaire peut publier avec un abonnement actif. S’il confie plutôt le bien à ImmoSénégal ou à une agence et que le mandat est accepté, il n’a pas besoin d’abonnement pour ce bien. Le taux de commission mensuel doit être convenu et enregistré dans le mandat avant son acceptation."
    } else if (/paiement|loyer|payer/.test(bas)) {
      reponse = "Dans « Mes contrats de location », les parties peuvent déclarer les paiements de loyer et consulter leur historique. Une déclaration de paiement n’est pas une confirmation bancaire : vérifiez toujours le règlement avec l’autre partie."
    } else if (/visite|visiter/.test(bas)) {
      reponse = "Ouvrez la fiche du logement dans le catalogue et envoyez une demande de visite. Le propriétaire ou l’agence chargée du bien pourra la consulter et vous répondre."
    } else if (/conseil|dossier|document|arnaque|frais/.test(bas)) {
      reponse = "Quelques précautions utiles : visitez le logement, vérifiez l’identité de votre interlocuteur et demandez un document écrit indiquant le prix, les frais et les conditions. Ne versez pas d’argent avant d’avoir vérifié l’annonce et les documents. Pour une question juridique précise, demandez l’avis d’un professionnel."
    } else if (/\bmerci\b/.test(bas) && changements.length === 0) {
      reponse = "Avec plaisir ! Vous pouvez me décrire votre recherche, même en une seule phrase."
    } else {
      const manquants: string[] = []
      if (!nouveaux.type) manquants.push('le type de logement')
      if (!nouveaux.ville) manquants.push('la ville')
      if (!nouveaux.prixMax) manquants.push('votre budget maximum')
      if (changements.length) {
        reponse = "J’ai compris : " + changements.join(', ') + ". "
        reponse += manquants.length
          ? "Pour affiner votre recherche, pouvez-vous préciser " + manquants.slice(0, 2).join(' et ') + " ?"
          : "Vos critères sont renseignés. Cliquez sur « Trouver mes logements » pour consulter les annonces publiées correspondantes."
      } else {
        reponse = "Je peux vous aider à préparer une recherche immobilière. Dites-moi par exemple : « Je cherche une maison à louer à Dakar avec un budget de 150 000 FCFA »."
      }
    }

    setMessages((anciens) => [...anciens, { role: 'user', content: texte }, { role: 'assistant', content: reponse }])
    setMessage('')
  }

  function modifier<K extends keyof Criteres>(cle: K, valeur: Criteres[K]) {
    setCriteres((actuels) => ({ ...actuels, [cle]: valeur }))
  }

  async function rechercher(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setChargement(true)
    setErreur('')
    setRechercheFaite(false)
    const params = new URLSearchParams({ transaction: criteres.transaction, page: '0', taille: '12' })
    if (criteres.type) params.set('type', criteres.type)
    if (criteres.ville.trim()) params.set('ville', criteres.ville.trim())
    if (criteres.quartier.trim()) params.set('quartier', criteres.quartier.trim())
    if (criteres.prixMax && Number(criteres.prixMax) > 0) params.set('prixMax', criteres.prixMax)
    if (criteres.piecesMin && Number(criteres.piecesMin) > 0) params.set('piecesMin', criteres.piecesMin)
    if (criteres.equipements.trim()) params.set('equipements', criteres.equipements.trim())
    try {
      const page = await appelApi<PagePaginee<Annonce>>(`/api/annonces?${params.toString()}`)
      setAnnonces(page.contenu)
      setRechercheFaite(true)
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : 'La recherche a échoué. Réessayez.')
    } finally {
      setChargement(false)
    }
  }

  function reinitialiser() {
    setCriteres(initial)
    setAnnonces([])
    setRechercheFaite(false)
    setErreur('')
  }

  const champ = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-encre shadow-sm outline-none transition focus:border-[#d99a00] focus:ring-2 focus:ring-[#f2b800]/25'
  const label = 'block text-sm font-semibold text-[#173b63]'

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#102b49] via-[#173b63] to-[#245783] p-6 text-white shadow-xl sm:p-10">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-[#f2b800] p-3 text-[#102b49]"><Bot aria-hidden className="h-7 w-7" /></span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#ffdc72]">ImmoSénégal</p>
            <h1 className="font-titre text-3xl font-semibold sm:text-4xl">Assistant immobilier</h1>
          </div>
        </div>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
          Décrivez le logement que vous recherchez. Je vous aide à préciser vos critères et à retrouver les annonces publiées qui correspondent à votre projet.
        </p>
        <div className="mt-5 flex items-center gap-2 text-sm text-[#ffdc72]">
          <Sparkles aria-hidden className="h-4 w-4" />
          Recherche basée sur les annonces réelles du catalogue
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-white/70 bg-white/95 shadow-xl backdrop-blur-sm" aria-label="Conversation avec l’assistant immobilier">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-titre text-xl font-semibold text-[#102b49]">Discutons de votre projet</h2><p className="text-xs text-slate-500">Assistant gratuit · réponses guidées, sans clé API</p></div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">Disponible</span>
          </div>
        </div>
        <div className="max-h-80 space-y-3 overflow-y-auto p-5 sm:px-7" aria-live="polite">
          {messages.map((item, index) => <div key={index} className={item.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <p className={item.role === 'user' ? 'max-w-[88%] rounded-2xl rounded-br-md bg-[#173b63] px-4 py-3 text-sm leading-relaxed text-white' : 'max-w-[88%] rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-relaxed text-slate-800'}>{item.content}</p>
          </div>)}
        </div>
        <form onSubmit={envoyerMessage} className="flex gap-2 border-t border-slate-200 p-4 sm:p-5">
          <label className="sr-only" htmlFor="assistant-message">Votre message</label>
          <input id="assistant-message" value={message} onChange={(e) => setMessage(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#d99a00] focus:ring-2 focus:ring-[#f2b800]/25" placeholder="Ex. Je cherche une maison à louer à Dakar…" maxLength={500} />
          <button type="submit" disabled={!message.trim()} className="rounded-xl bg-[#f2b800] px-5 py-3 text-sm font-bold text-[#102b49] transition hover:bg-[#ffcf35] disabled:cursor-not-allowed disabled:opacity-50">Envoyer</button>
        </form>
        <div className="flex flex-wrap gap-2 px-4 pb-5 sm:px-5">
          {['Je veux louer', 'Je veux acheter', 'Je cherche une maison', 'J’ai besoin de conseils'].map((suggestion) => <button key={suggestion} type="button" onClick={() => setMessage(suggestion)} className="rounded-full border border-[#d7e1ec] px-3 py-1.5 text-xs font-medium text-[#173b63] transition hover:border-[#d99a00] hover:bg-amber-50">{suggestion}</button>)}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-white/70 bg-white/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
        <div className="mb-6">
          <h2 className="font-titre text-2xl font-semibold text-[#102b49]">Commençons par votre recherche</h2>
          <p className="mt-1 text-sm text-slate-600">Renseignez les informations que vous connaissez. Les champs facultatifs peuvent rester vides.</p>
        </div>
        <form onSubmit={rechercher}>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className={label} htmlFor="assistant-transaction">Votre projet</label>
              <select id="assistant-transaction" className={champ} value={criteres.transaction} onChange={(e) => modifier('transaction', e.target.value as TypeTransaction)}>
                <option value="LOCATION">Louer un logement</option>
                <option value="VENTE">Acheter un bien</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="assistant-type">Type de bien</label>
              <select id="assistant-type" className={champ} value={criteres.type} onChange={(e) => modifier('type', e.target.value as TypeBien | '')}>
                <option value="">Tous les types</option>
                <option value="MAISON">Maison</option>
                <option value="APPARTEMENT">Appartement</option>
                <option value="STUDIO">Studio</option>
                <option value="VILLA">Villa</option>
                <option value="TERRAIN">Terrain</option>
              </select>
            </div>
            <div>
              <label className={label} htmlFor="assistant-ville">Ville</label>
              <input id="assistant-ville" className={champ} value={criteres.ville} onChange={(e) => modifier('ville', e.target.value)} placeholder="Ex. Dakar, Ziguinchor…" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-quartier">Quartier</label>
              <input id="assistant-quartier" className={champ} value={criteres.quartier} onChange={(e) => modifier('quartier', e.target.value)} placeholder="Ex. Almadies, Kandé…" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-budget">Budget maximum (FCFA)</label>
              <input id="assistant-budget" type="number" min="1" inputMode="numeric" className={champ} value={criteres.prixMax} onChange={(e) => modifier('prixMax', e.target.value)} placeholder="Ex. 150000" />
            </div>
            <div>
              <label className={label} htmlFor="assistant-pieces">Nombre minimum de pièces</label>
              <input id="assistant-pieces" type="number" min="1" className={champ} value={criteres.piecesMin} onChange={(e) => modifier('piecesMin', e.target.value)} placeholder="Ex. 3" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={label} htmlFor="assistant-equipements">Équipements souhaités</label>
              <input id="assistant-equipements" className={champ} value={criteres.equipements} onChange={(e) => modifier('equipements', e.target.value)} placeholder="Ex. climatisation, wifi, parking (séparés par des virgules)" />
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <button type="submit" disabled={chargement} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2b800] px-6 py-3 font-bold text-[#102b49] shadow-sm transition hover:bg-[#ffcf35] disabled:cursor-wait disabled:opacity-60">
              <Search aria-hidden className="h-5 w-5" />
              {chargement ? 'Recherche en cours…' : 'Trouver mes logements'}
            </button>
            <button type="button" onClick={reinitialiser} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50">Réinitialiser</button>
          </div>
        </form>
        {erreur && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{erreur}</p>}
      </section>

      {rechercheFaite && (
        <section className="mt-10" aria-live="polite">
          <div className="mb-5">
            <h2 className="font-titre text-2xl font-semibold text-[#102b49]">Les annonces qui correspondent</h2>
            <p className="mt-1 text-slate-600">{annonces.length ? `${annonces.length} résultat(s) affiché(s) parmi les annonces publiées.` : 'Aucune annonce ne correspond exactement à ces critères.'}</p>
          </div>
          {annonces.length ? (
            <>
              {annonces.some((annonce) => annonce.exemple) && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Certains résultats sont des annonces de démonstration.</p>}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{annonces.map((annonce) => <AnnonceCard key={annonce.id} annonce={annonce} />)}</div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-7 text-center shadow-sm">
              <p className="font-semibold text-[#173b63]">Essayons avec des critères plus larges.</p>
              <p className="mt-2 text-sm text-slate-600">Vous pouvez retirer le quartier, augmenter le budget ou choisir « Tous les types ».</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
