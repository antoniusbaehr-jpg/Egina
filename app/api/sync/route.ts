import { env } from 'cloudflare:workers';
const origins = new Set(['https://antoniusbaehr-jpg.github.io','https://egina-urlaub.brownslug16.chatgpt.site']);
function response(req:Request, data:unknown, status=200) {
 const origin=req.headers.get('origin')||'';
 return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(origins.has(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
}
export async function OPTIONS(req:Request){return response(req,{});}
export async function GET(req:Request){
 try { const data=await env.DB!.prepare('SELECT * FROM records ORDER BY created, id').all(); return response(req,{records:data.results.map((r:any)=>({...r,body:JSON.parse(r.body)}))}); }
 catch {return response(req,{error:'Die Verbindung zum gemeinsamen Speicher ist gerade nicht möglich.'},503);}
}
const idOK=(s:any)=>typeof s==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(s);
const str=(s:any,max=120)=>typeof s==='string'&&s.trim().length>0&&s.trim().length<=max;
export async function POST(req:Request){
 if(req.headers.get('origin')&&!origins.has(req.headers.get('origin')!)) return response(req,{error:'Unbekannte Herkunft.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return response(req,{error:'JSON erforderlich.'},415);
 try {
 const raw=await req.text(); if(raw.length>24000)return response(req,{error:'Eintrag zu lang.'},413);
 const p=JSON.parse(raw); if(!idOK(p.id))throw Error('Ungültiger Eintrag.');
 const db=env.DB!;
 if(p.action==='create'){
  const b=p.body; let body:any;
  if(p.kind==='person'&&str(b?.name,60))body={name:b.name.trim()};
  if(p.kind==='item'&&str(b?.text,240))body={text:b.text.trim(),done:false};
  if(p.kind==='expense'||p.kind==='transfer'){
   if(!str(b?.title)||!Number.isSafeInteger(b?.cents)||b.cents<=0||b.cents>100000000||!idOK(b?.payer))throw Error('Bitte Betrag, Beschreibung und zahlende Person prüfen.');
   const people=await db.prepare("SELECT id FROM records WHERE kind = 'person'").all(); const ids=new Set(people.results.map((x:any)=>x.id));
   if(!ids.has(b.payer))throw Error('Zahlende Person nicht gefunden.');
   if(p.kind==='expense'){
    if(!Array.isArray(b.participants)||!b.participants.length||b.participants.length>100||new Set(b.participants).size!==b.participants.length||b.participants.some((x:any)=>!ids.has(x)))throw Error('Bitte Beteiligte auswählen.');
    body={title:b.title.trim(),cents:b.cents,payer:b.payer,participants:[...b.participants].sort()};
   }else{
    if(!ids.has(b.recipient)||b.payer===b.recipient)throw Error('Bitte zwei unterschiedliche Personen auswählen.');
    body={title:b.title.trim(),cents:b.cents,payer:b.payer,recipient:b.recipient};
   }
  }
  if(!body)throw Error('Eintrag unvollständig.');
  await db.prepare('INSERT OR IGNORE INTO records (id,kind,body,version,created) VALUES (?,?,?,1,?)').bind(p.id,p.kind,JSON.stringify(body),Date.now()).run();
 }else if(p.action==='note'){
  if(p.id!=='shared-note'||typeof p.text!=='string'||p.text.length>10000||!Number.isInteger(p.version))throw Error('Notiz ungültig.');
  if(p.version===0){await db.prepare("INSERT OR IGNORE INTO records (id,kind,body,version,created) VALUES ('shared-note','note',?,1,?)").bind(JSON.stringify({text:p.text}),Date.now()).run();}
  else {const r=await db.prepare("UPDATE records SET body=?,version=version+1 WHERE id='shared-note' AND version=?").bind(JSON.stringify({text:p.text}),p.version).run();if(!r.meta.changes)return response(req,{error:'Die Notiz wurde inzwischen geändert. Dein Text bleibt erhalten. Bitte Änderungen vergleichen.',conflict:true},409);}
  if(p.version===0){const n:any=await db.prepare("SELECT body FROM records WHERE id='shared-note'").first();if(n.body!==JSON.stringify({text:p.text}))return response(req,{error:'Die Notiz wurde inzwischen geändert.',conflict:true},409);}
 }else if(p.action==='toggle'){
  if(typeof p.done!=='boolean'||!Number.isInteger(p.version))throw Error('Ungültige Änderung.');
  const row:any=await db.prepare("SELECT * FROM records WHERE id=? AND kind='item'").bind(p.id).first();if(!row)throw Error('Eintrag wurde entfernt.');
  const b=JSON.parse(row.body); b.done=p.done;
  const r=await db.prepare('UPDATE records SET body=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(b),p.id,p.version).run();if(!r.meta.changes)return response(req,{error:'Jemand hat diesen Eintrag gerade geändert. Bitte erneut versuchen.'},409);
 }else if(p.action==='delete'){
  if(!Number.isInteger(p.version))throw Error('Ungültige Änderung.');
  const r=await db.prepare("DELETE FROM records WHERE id=? AND version=? AND kind IN ('item','expense','transfer')").bind(p.id,p.version).run();if(!r.meta.changes)return response(req,{error:'Eintrag wurde bereits geändert oder entfernt.'},409);
 }else throw Error('Unbekannte Aktion.');
 return response(req,{ok:true});
 }catch(e:any){return response(req,{error:e.message||'Speichern fehlgeschlagen.'},400);}
}
