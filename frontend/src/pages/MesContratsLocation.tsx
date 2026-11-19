import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Contrat = { id:string; annonceId:string; annonceTitre:string; proprietaireNom:string; locataireNom:string; loyerMensuel:number; depotGarantie:number; dateDebut:string; dateFin:string|null; etat:string; resiliationDemandeeParId:string|null; resiliationDemandeeParNom:string|null; resiliationDemandeeLe:string|null; resiliationMotif?:string|null; dateFinSouhaitee?:string|null }
type Paiement = { id:string; montant:number; periode:string; datePaiement:string; reference:string|null; enregistrePar:string }
type Filtre = 'TOUS' | 'ACTIF' | 'RESILIATION_DEMANDEE' | 'RESILIATION_PLANIFIEE' | 'TERMINE' | 'RESILIE'

const monnaie = (valeur:number) => Number(valeur || 0).toLocaleString('fr-FR') + ' FCFA'

export default function MesContratsLocation(){
 const {jeton,utilisateur}=useAuth()
 const espaceLocataire=utilisateur?.role==='CLIENT'
 const espaceProprietaire=utilisateur?.role==='PROPRIETAIRE'
 const titreEspace=espaceLocataire?'Mon espace locataire':espaceProprietaire?'Mon espace propriétaire':'Mes contrats de location'
 const [contrats,setContrats]=useState<Contrat[]>([])
 const [selection,setSelection]=useState('')
 const [paiements,setPaiements]=useState<Paiement[]>([])
 const [montant,setMontant]=useState('')
 const [periode,setPeriode]=useState(new Date().toISOString().slice(0,7)+'-01')
 const [datePaiement,setDatePaiement]=useState(new Date().toISOString().slice(0,10))
 const [reference,setReference]=useState('')
 const [recherche,setRecherche]=useState('')
 const [filtre,setFiltre]=useState<Filtre>('TOUS')
 const [erreur,setErreur]=useState<string|null>(null)
 const [message,setMessage]=useState<string|null>(null)
 const [chargement,setChargement]=useState(true)

 const charger=useCallback(async()=>{
  if(!jeton)return
  setChargement(true)
  setErreur(null)
  try{
   const liste=await appelApi<Contrat[]>('/api/locations/mes-contrats',{token:jeton})
   setContrats(liste)
   if(selection && liste.some(c=>c.id===selection)){
    setPaiements(await appelApi<Paiement[]>(`/api/locations/${selection}/paiements`,{token:jeton}))
   }else if(selection){
    setSelection('')
    setPaiements([])
   }
  }catch(e){setErreur(e instanceof ApiError?e.message:'Impossible de charger les contrats.')}
  finally{setChargement(false)}
 },[jeton,selection])

 useEffect(()=>{void charger()},[charger])

 const contratsFiltres=useMemo(()=>contrats.filter(c=>{
  const statutOk=filtre==='TOUS'||c.etat===filtre
  const texte=recherche.trim().toLocaleLowerCase()
  const rechercheOk=!texte||[c.annonceTitre,c.proprietaireNom,c.locataireNom].some(v=>v.toLocaleLowerCase().includes(texte))
  return statutOk&&rechercheOk
 }),[contrats,filtre,recherche])

 const ouvrir=async(id:string)=>{
  setSelection(id);setErreur(null);setMessage(null)
  try{setPaiements(await appelApi<Paiement[]>(`/api/locations/${id}/paiements`,{token:jeton}))}
  catch(e){setErreur(e instanceof ApiError?e.message:'Impossible de charger les paiements.')}
 }

 const actionResiliation=async(id:string,action:'demander'|'accepter'|'refuser'|'annuler')=>{
  const confirmations={demander:'Envoyer une demande de résiliation à l’autre partie ?',accepter:'Accepter la date de fin proposée ? Le contrat prendra fin à la date convenue.',refuser:'Refuser cette demande ? Le contrat restera actif.',annuler:'Annuler votre demande de résiliation ?'}
  if(action==='demander'){
   const motif=window.prompt('Expliquez le motif de votre demande de résiliation :')?.trim()
   if(!motif)return
   const dateFinSouhaitee=window.prompt('Date de départ souhaitée (AAAA-MM-JJ) :')?.trim()
   if(!dateFinSouhaitee)return
   if(!/^\d{4}-\d{2}-\d{2}$/.test(dateFinSouhaitee)){setErreur('La date doit respecter le format AAAA-MM-JJ.');return}
   if(!window.confirm(confirmations[action]))return
   setErreur(null);setMessage(null)
   try{await appelApi(`/api/locations/${id}/resiliation-demande`,{method:'PATCH',token:jeton,body:{motif,dateFinSouhaitee}});setMessage('Demande envoyée avec son motif et sa date souhaitée. Le contrat reste actif en attendant la réponse.');await charger()}
   catch(e){setErreur(e instanceof ApiError?e.message:'Impossible d’envoyer la demande.')}
   return
  }
  if(!window.confirm(confirmations[action]))return
  setErreur(null);setMessage(null)
  try{
   if(action==='annuler') await appelApi(`/api/locations/${id}/resiliation-annulation`,{method:'PATCH',token:jeton})
   else await appelApi(`/api/locations/${id}/resiliation-decision`,{method:'PATCH',token:jeton,body:{accepter:action==='accepter'}})
   setMessage(action==='demander'?'Demande envoyée. Le contrat reste actif jusqu’à la réponse de l’autre partie.':action==='accepter'?'Demande acceptée : la résiliation prendra effet à la date convenue.':action==='refuser'?'Demande refusée : le contrat reste actif.':'Votre demande a été annulée.')
   await charger()
  }catch(e){setErreur(e instanceof ApiError?e.message:'Impossible de traiter la demande de résiliation.')}
 }

 const ajouter=async(e:FormEvent)=>{
  e.preventDefault();if(!selection)return
  setErreur(null);setMessage(null)
  try{
   await appelApi(`/api/locations/${selection}/paiements`,{method:'POST',token:jeton,body:{montant:Number(montant),periode,datePaiement,reference}})
   setMontant('');setReference('')
   setMessage('Paiement déclaré. L’autre partie a été notifiée.')
   await ouvrir(selection)
  }catch(e){setErreur(e instanceof ApiError?e.message:'Impossible d’enregistrer le paiement.')}
 }

 const actifs=contrats.filter(c=>c.etat==='ACTIF')
 const loyerActif=actifs.reduce((s,c)=>s+Number(c.loyerMensuel||0),0)
 const locatairesActifs=new Set(actifs.map(c=>c.locataireNom)).size
 const logementsActifs=new Set(actifs.map(c=>c.annonceId)).size

 return <main className="mx-auto max-w-5xl px-4 py-10">
  <header>
   <p className="text-xs font-bold uppercase tracking-widest text-amber-700">{espaceLocataire?'Suivi de votre location':espaceProprietaire?'Gestion de vos logements loués':'Gestion locative'}</p>
   <h1 className="mt-2 text-3xl font-bold text-nuit-900">{titreEspace}</h1>
   <p className="mt-2 text-sm text-slate-600">{espaceLocataire?'Retrouvez les informations de vos logements, vos contrats actifs et l’historique des loyers déclarés.':espaceProprietaire?'Suivez les logements loués, les contrats en cours et les paiements déclarés par vos locataires.':'Consultez les contrats de location auxquels votre compte participe.'}</p>
   <p className="mt-1 text-xs text-slate-500">Seuls les contrats auxquels votre compte participe sont affichés. Les paiements sont des déclarations enregistrées sur la plateforme, pas une vérification bancaire.</p>
  </header>

  {!chargement&&<section aria-label="Résumé des contrats" className="mt-6 grid gap-3 sm:grid-cols-3">
   <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">Contrats suivis</p><p className="mt-1 text-2xl font-bold text-nuit-900">{contrats.length}</p></div>
   <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{espaceProprietaire?'Locataires actifs':'Contrats actifs'}</p><p className="mt-1 text-2xl font-bold text-nuit-900">{espaceProprietaire?locatairesActifs:actifs.length}</p></div>
   <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{espaceProprietaire?'Logements actuellement loués':'Loyers mensuels de vos contrats actifs'}</p><p className="mt-1 text-xl font-bold text-nuit-900">{espaceProprietaire?logementsActifs:monnaie(loyerActif)}</p></div>
  </section>}

  {erreur&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
  {message&&<p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
  {chargement?<p className="mt-6">Chargement des contrats…</p>:contrats.length===0?
   <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6"><h2 className="font-semibold text-nuit-900">Aucun contrat pour le moment</h2><p className="mt-2 text-sm text-slate-600">Un contrat apparaîtra ici lorsqu’une réservation de location aura été acceptée et qu’un contrat aura été créé par le propriétaire.</p></section>:
   <>
    <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row">
     <label className="flex-1 text-sm font-medium text-slate-700">Rechercher un logement ou une personne<input value={recherche} onChange={e=>setRecherche(e.target.value)} placeholder="Nom du logement, propriétaire, locataire…" className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 font-normal"/></label>
     <label className="text-sm font-medium text-slate-700 sm:w-48">État du contrat<select value={filtre} onChange={e=>setFiltre(e.target.value as Filtre)} className="mt-1 w-full rounded-lg border border-slate-300 p-2.5"><option value="TOUS">Tous les contrats</option><option value="ACTIF">Actifs</option><option value="RESILIATION_DEMANDEE">Résiliation en attente</option><option value="RESILIATION_PLANIFIEE">Résiliation planifiée</option><option value="TERMINE">Terminés</option><option value="RESILIE">Résiliés</option></select></label>
    </section>
    {contratsFiltres.length===0?<p className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-600">Aucun contrat ne correspond à votre recherche.</p>:
     <div className="mt-5 grid gap-4">{contratsFiltres.map(c=><article key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-2"><div><h2 className="font-bold text-nuit-900">{c.annonceTitre}</h2><p className="mt-1 text-xs text-slate-500">Référence contrat : {c.id.slice(0,8).toUpperCase()}</p></div><span className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${c.etat==='ACTIF'?'bg-emerald-50 text-emerald-800':c.etat==='RESILIE'?'bg-red-50 text-red-800':c.etat==='RESILIATION_DEMANDEE'?'bg-amber-50 text-amber-800':c.etat==='RESILIATION_PLANIFIEE'?'bg-blue-50 text-blue-800':'bg-slate-100 text-slate-700'}`}>{c.etat==='RESILIATION_DEMANDEE'?'Résiliation en attente':c.etat==='RESILIATION_PLANIFIEE'?'Résiliation planifiée':c.etat==='ACTIF'?'Actif':c.etat==='RESILIE'?'Résilié':'Terminé'}</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Propriétaire</p><p className="mt-1 text-sm font-medium">{c.proprietaireNom}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Locataire</p><p className="mt-1 text-sm font-medium">{c.locataireNom}</p></div></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><p className="text-sm text-slate-700">Loyer mensuel : <strong>{monnaie(c.loyerMensuel)}</strong></p><p className="text-sm text-slate-700">Dépôt de garantie : <strong>{monnaie(c.depotGarantie)}</strong></p></div>
      <p className="mt-2 text-xs text-slate-500">Début : {c.dateDebut}{c.dateFin?' · Fin : '+c.dateFin:''}</p>{c.etat==='RESILIATION_PLANIFIEE'&&<p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Résiliation acceptée par les deux parties. Le contrat prendra fin le {c.dateFinSouhaitee||c.dateFin}. Les obligations contractuelles continuent jusqu’à cette date.</p>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>void ouvrir(c.id)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">{selection===c.id?'Actualiser les paiements':'Voir les paiements'}</button>{c.etat==='ACTIF'&&<button onClick={()=>void actionResiliation(c.id,'demander')} className="rounded-full border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">Demander la résiliation</button>}{c.etat==='RESILIATION_DEMANDEE'&&c.resiliationDemandeeParId===utilisateur?.id&&<button onClick={()=>void actionResiliation(c.id,'annuler')} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Annuler ma demande</button>}{c.etat==='RESILIATION_DEMANDEE'&&c.resiliationDemandeeParId!==utilisateur?.id&&<><button onClick={()=>void actionResiliation(c.id,'accepter')} className="rounded-full bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Accepter la résiliation</button><button onClick={()=>void actionResiliation(c.id,'refuser')} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Refuser</button></>}</div>{c.etat==='RESILIATION_DEMANDEE'&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Demande envoyée par {c.resiliationDemandeeParNom??'une des parties'} le {c.resiliationDemandeeLe?new Date(c.resiliationDemandeeLe).toLocaleString('fr-FR'):'date non disponible'}. {c.resiliationDemandeeParId===utilisateur?.id?'En attente de la réponse de l’autre partie.' :'Votre réponse est attendue. Le contrat reste actif tant que vous n’avez pas accepté.'}<br/>Motif : {c.resiliationMotif||'Non renseigné'} · Départ souhaité : {c.dateFinSouhaitee||'Non précisée'}</p>}
      {selection===c.id&&<div className="mt-5 border-t border-slate-100 pt-4"><h3 className="font-semibold text-nuit-900">Historique des paiements déclarés</h3>{paiements.length===0?<p className="mt-2 text-sm text-slate-500">Aucun paiement déclaré pour ce contrat.</p>:<ul className="mt-3 space-y-2">{paiements.map(p=><li key={p.id} className="rounded-lg bg-slate-50 p-3 text-sm"><strong>{monnaie(p.montant)}</strong> — période {p.periode} · déclaré le {p.datePaiement}<p className="mt-1 text-xs text-slate-500">Déclaré par {p.enregistrePar}{p.reference?' · Référence : '+p.reference:''}</p></li>)}</ul>}
       <form onSubmit={ajouter} className="mt-4 grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2"><h4 className="font-semibold text-nuit-900 sm:col-span-2">{espaceProprietaire?'Enregistrer un loyer reçu':'Déclarer le paiement de mon loyer'}</h4><label className="text-sm">Montant (FCFA)<input required type="number" min="1" step="0.01" value={montant} onChange={e=>setMontant(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm">Période du loyer<input required type="date" value={periode} onChange={e=>setPeriode(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm">Date du paiement<input required type="date" value={datePaiement} onChange={e=>setDatePaiement(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-sm">Référence facultative<input maxLength={500} value={reference} onChange={e=>setReference(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><button className="rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white sm:col-span-2">{espaceProprietaire?'Enregistrer le loyer reçu':'Déclarer mon paiement'}</button></form>
      </div>}
     </article>)}</div>}
   </>
  }
 </main>
}
