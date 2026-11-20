import { useEffect, useState, type FormEvent } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Evaluation = { id:string; contratId:string; auteurNom:string; evalueNom:string; note:number; commentaire:string; creeLe:string }
export default function EvaluationContrat({contratId,termine}:{contratId:string;termine:boolean}) {
 const {jeton}=useAuth()
 const [lignes,setLignes]=useState<Evaluation[]>([])
 const [note,setNote]=useState('5')
 const [commentaire,setCommentaire]=useState('')
 const [erreur,setErreur]=useState('')
 const [message,setMessage]=useState('')
 const [envoi,setEnvoi]=useState(false)
 useEffect(()=>{if(!jeton||!termine)return;appelApi<Evaluation[]>(`/api/locations/${contratId}/evaluations`,{token:jeton}).then(setLignes).catch(e=>setErreur(e instanceof ApiError?e.message:'Impossible de charger les évaluations.'))},[jeton,contratId,termine])
 async function soumettre(e:FormEvent){e.preventDefault();setErreur('');setMessage('');setEnvoi(true);try{const v=await appelApi<Evaluation>(`/api/locations/${contratId}/evaluations`,{method:'POST',token:jeton,body:{note:Number(note),commentaire:commentaire.trim()}});setLignes(p=>[v,...p]);setCommentaire('');setMessage('Votre évaluation a été publiée.')}catch(e){setErreur(e instanceof ApiError?e.message:'Impossible de publier votre évaluation.')}finally{setEnvoi(false)}}
 if(!termine)return null
 const dejaEvalue=erreur.includes('déjà évalué')
 return <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4"><h3 className="font-semibold text-nuit-900">Évaluation de la location</h3><p className="mt-1 text-xs text-slate-600">Après la fin du contrat, le propriétaire et le locataire peuvent chacun évaluer leur expérience.</p>
 {lignes.length>0&&<div className="mt-3 space-y-2">{lignes.map(v=><article key={v.id} className="rounded-lg bg-white p-3 text-sm"><div className="flex justify-between gap-2"><strong>{v.auteurNom} → {v.evalueNom}</strong><span className="font-semibold text-amber-700">{v.note}/5</span></div><p className="mt-2 text-slate-700">{v.commentaire}</p><time className="mt-1 block text-xs text-slate-500">{new Date(v.creeLe).toLocaleDateString('fr-FR')}</time></article>)}</div>}
 {!dejaEvalue&&<form onSubmit={soumettre} className="mt-3 grid gap-3"><label className="text-sm font-medium">Votre note<select value={note} onChange={e=>setNote(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2"><option value="5">5 — Excellent</option><option value="4">4 — Très bien</option><option value="3">3 — Bien</option><option value="2">2 — À améliorer</option><option value="1">1 — Décevant</option></select></label><label className="text-sm font-medium">Votre commentaire<textarea required maxLength={1200} rows={3} value={commentaire} onChange={e=>setCommentaire(e.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3" placeholder="Partagez votre expérience avec l’autre partie…"/></label><button disabled={envoi||!commentaire.trim()} className="w-fit rounded-full bg-nuit-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{envoi?'Publication…':'Publier mon évaluation'}</button></form>}
 {erreur&&<p role="alert" className="mt-2 text-sm text-red-700">{erreur}</p>}{message&&<p role="status" className="mt-2 text-sm text-emerald-700">{message}</p>}</section>
}
