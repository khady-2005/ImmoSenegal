import { useRef, useState, type PointerEvent } from 'react'

type Props = { onSave:(signature:string)=>Promise<void> }

export default function SignaturePad({onSave}:Props){
 const canvas=useRef<HTMLCanvasElement>(null)
 const dessin=useRef(false)
 const [trace,setTrace]=useState(false)
 const [chargement,setChargement]=useState(false)
 const position=(e:PointerEvent<HTMLCanvasElement>)=>{
  const c=canvas.current
  if(!c)return {x:0,y:0}
  const r=c.getBoundingClientRect()
  return {x:(e.clientX-r.left)*c.width/r.width,y:(e.clientY-r.top)*c.height/r.height}
 }
 const commencer=(e:PointerEvent<HTMLCanvasElement>)=>{
  const c=canvas.current;if(!c)return
  c.setPointerCapture(e.pointerId)
  const ctx=c.getContext('2d');if(!ctx)return
  const p=position(e);ctx.beginPath();ctx.moveTo(p.x,p.y);dessin.current=true;setTrace(true)
 }
 const continuer=(e:PointerEvent<HTMLCanvasElement>)=>{
  if(!dessin.current)return
  const ctx=canvas.current?.getContext('2d');if(!ctx)return
  const p=position(e);ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#142b45';ctx.lineTo(p.x,p.y);ctx.stroke()
 }
 const terminer=()=>{dessin.current=false}
 const effacer=()=>{const c=canvas.current;if(!c)return;c.getContext('2d')?.clearRect(0,0,c.width,c.height);setTrace(false)}
 const enregistrer=async()=>{
  const c=canvas.current;if(!c||!trace||chargement)return
  setChargement(true)
  try{await onSave(c.toDataURL('image/png'))}finally{setChargement(false)}
 }
 return <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
  <p className="text-sm font-semibold text-slate-800">Dessinez votre signature dans la zone ci-dessous</p>
  <canvas ref={canvas} width={720} height={220} className="mt-2 block h-40 w-full touch-none rounded-lg border border-dashed border-slate-400 bg-white" onPointerDown={commencer} onPointerMove={continuer} onPointerUp={terminer} onPointerCancel={terminer} aria-label="Zone de dessin de la signature"/>
  <div className="mt-3 flex flex-wrap gap-2">
   <button type="button" onClick={effacer} disabled={!trace||chargement} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Effacer</button>
   <button type="button" onClick={()=>void enregistrer()} disabled={!trace||chargement} className="rounded-full bg-blue-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{chargement?'Enregistrement…':'Valider ma signature'}</button>
  </div>
  <p className="mt-2 text-xs leading-5 text-slate-500">En validant, vous confirmez signer ce contrat après en avoir vérifié les conditions. La signature enregistrée ne peut pas être remplacée depuis cette page.</p>
 </div>
}
