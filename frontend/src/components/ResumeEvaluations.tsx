import { useEffect, useState } from 'react'
import { appelApi, ApiError } from '../api'
import { useAuth } from '../auth'

type Resume = { moyenne:number; nombreAvis:number }
export default function ResumeEvaluations(){
 const {jeton}=useAuth()
 const [resume,setResume]=useState<Resume|null>(null)
 const [erreur,setErreur]=useState('')
 useEffect(()=>{if(!jeton)return;appelApi<Resume>('/api/locations/evaluations/mon-resume',{token:jeton}).then(setResume).catch(e=>setErreur(e instanceof ApiError?e.message:'Résumé indisponible.'))},[jeton])
 if(erreur||!resume||resume.nombreAvis===0)return null
 return <section aria-label="Moyenne des évaluations reçues" className="mt-5 rounded-2xl border border-amber-200 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Votre réputation sur ImmoSénégal</p><div className="mt-1 flex items-baseline gap-2"><strong className="text-2xl text-nuit-900">{resume.moyenne.toLocaleString('fr-FR',{minimumFractionDigits:1,maximumFractionDigits:1})}/5</strong><span className="text-amber-600" aria-label="étoiles">★ ★ ★ ★ ★</span><span className="text-sm text-slate-500">({resume.nombreAvis} avis reçu{resume.nombreAvis>1?'s':''})</span></div><p className="mt-1 text-xs text-slate-500">Moyenne des évaluations laissées par les personnes avec lesquelles vous avez terminé une location.</p></section>
}
