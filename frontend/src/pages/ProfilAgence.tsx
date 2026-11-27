import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Building2, Mail, MapPin, Phone, Star } from 'lucide-react'
import { appelApi, ApiError } from '../api'
import type { Annonce } from '../types'
import AnnonceCard from '../components/AnnonceCard'

interface AgenceProfilPublic {
  id: string
  nom: string
  slug: string
  type: 'INTERNE' | 'PARTENAIRE'
  description: string | null
  emailContact: string | null
  telephoneContact: string | null
  adresse: string | null
  logoUrl: string | null
  creeLe: string
  annonces: Annonce[]
}

interface AvisResume {
  moyenne: number
  nombreAvis: number
  avis: Array<{ id: string; auteurNom: string; note: number; commentaire: string; creeLe: string }>
}

export default function ProfilAgence() {
  const { slug = '' } = useParams()
  const [profil, setProfil] = useState<AgenceProfilPublic | null>(null)
  const [evaluations, setEvaluations] = useState<AvisResume | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    let actif = true
    setChargement(true)
    setErreur(null)
    appelApi<AgenceProfilPublic>(`/api/agence/profil/${encodeURIComponent(slug)}`)
      .then(async (data) => {
        if (!actif) return
        setProfil(data)
        try {
          const ev = await appelApi<AvisResume>(`/api/agence/${data.id}/evaluations`)
          if (actif) setEvaluations(ev)
        } catch {
          // Evaluations facultatives
        }
      })
      .catch((e) => {
        if (actif) setErreur(e instanceof ApiError ? e.message : 'Impossible de charger cette agence.')
      })
      .finally(() => {
        if (actif) setChargement(false)
      })
    return () => { actif = false }
  }, [slug])

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <Link to="/catalogue" className="inline-flex items-center gap-1.5 text-sm font-semibold text-emeraude-700 hover:underline">
        <ArrowLeft aria-hidden className="h-4 w-4" />
        Retour au catalogue
      </Link>

      {chargement && <p role="status" className="mt-8 text-center text-slate-600">Chargement du profil de l’agence…</p>}
      {erreur && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">{erreur}</p>}

      {profil && (
        <>
          <section className="mt-6 rounded-3xl bg-gradient-to-r from-nuit-950 via-nuit-900 to-nuit-800 p-6 text-white shadow-xl sm:p-10">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              {profil.logoUrl ? (
                <img src={profil.logoUrl} alt={`Logo de ${profil.nom}`} className="h-20 w-20 shrink-0 rounded-2xl border border-white/20 bg-white object-cover" />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-dore-400">
                  <Building2 className="h-9 w-9" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <span className="inline-flex rounded-full border border-dore-400/50 bg-dore-400/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-dore-300">
                  {profil.type === 'INTERNE' ? 'Agence ImmoSénégal' : 'Agence partenaire'}
                </span>
                <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{profil.nom}</h1>
                {profil.description && <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/90">{profil.description}</p>}
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-white/90">
                  {profil.adresse && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-dore-400" /> {profil.adresse}
                    </span>
                  )}
                  {profil.telephoneContact && (
                    <a href={`tel:${profil.telephoneContact}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Phone className="h-4 w-4 text-dore-400" /> {profil.telephoneContact}
                    </a>
                  )}
                  {profil.emailContact && (
                    <a href={`mailto:${profil.emailContact}`} className="inline-flex items-center gap-1.5 hover:underline">
                      <Mail className="h-4 w-4 text-dore-400" /> {profil.emailContact}
                    </a>
                  )}
                  {evaluations && evaluations.nombreAvis > 0 && (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-dore-300">
                      <Star className="h-4 w-4 fill-dore-400 text-dore-400" />
                      {evaluations.moyenne.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5 ({evaluations.nombreAvis} avis)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10" aria-labelledby="titre-biens-agence">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 id="titre-biens-agence" className="font-titre text-2xl font-bold text-nuit-900">
                Biens proposés par {profil.nom}
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {profil.annonces.length} annonce{profil.annonces.length > 1 ? 's' : ''}
              </span>
            </div>
            {profil.annonces.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Cette agence n’a aucune annonce publiée pour le moment.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {profil.annonces.map((a) => (
                  <AnnonceCard key={a.id} annonce={a} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
