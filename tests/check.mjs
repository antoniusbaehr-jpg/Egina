import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
import { DatabaseSync } from 'node:sqlite';
const html=fs.readFileSync('public/egina.html','utf8');
const js=html.match(/<script type="module">([\s\S]*)<\/script>/)[1];
fs.writeFileSync('/tmp/egina-client.mjs',js);
const compute=vm.runInNewContext('('+js.match(/function compute\([\s\S]*?return\{b,moves\}\}/)[0]+')');
const people=['a','b','c'].map(id=>({id}));
let out=compute(people,[{body:{payer:'a',cents:1000,participants:['a','b','c']}}],[]);
assert.equal(out.b.a,666);assert.equal(out.b.b,-333);assert.equal(out.b.c,-333);
out=compute(people,[{body:{payer:'a',cents:3000,participants:['a','b','c']}}],[{body:{payer:'b',recipient:'a',cents:1000}}]);assert.equal(out.b.b,0);assert.equal(out.b.a,1000);
for(let t=0;t<300;t++){
 const expenses=Array.from({length:20},()=>({body:{payer:people[Math.floor(Math.random()*3)].id,cents:1+Math.floor(Math.random()*100000),participants:people.filter(()=>Math.random()>.4).map(p=>p.id)}})).filter(r=>r.body.participants.length);
 const {b,moves}=compute(people,expenses,[]);assert.equal(Object.values(b).reduce((x,y)=>x+y,0),0);for(const m of moves){b[m.from]+=m.cents;b[m.to]-=m.cents}assert(Object.values(b).every(x=>x===0));
}
const sql=new DatabaseSync(':memory:');sql.exec(fs.readFileSync('drizzle/0000_burly_madame_hydra.sql','utf8'));
globalThis.__env={DB:{prepare(q){const s=sql.prepare(q);let args=[];const d={bind(...a){args=a;return d},async all(){return{results:s.all(...args)}},async first(){return s.get(...args)||null},async run(){const r=s.run(...args);return{meta:{changes:Number(r.changes)}}}};return d}}};
const source=fs.readFileSync('app/api/sync/route.ts','utf8').replace("import { env } from 'cloudflare:workers';","const env=globalThis.__env;");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
async function post(data,origin='https://antoniusbaehr-jpg.github.io'){return api.POST(new Request('https://test/api/sync',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify(data)}))}
for(const id of ['a','b','c'])assert.equal((await post({action:'create',id,kind:'person',body:{name:id}})).status,200);
const expense={action:'create',id:'e1',kind:'expense',body:{title:'Dinner',payer:'a',participants:['a','b','c'],cents:1000}};
assert.equal((await post(expense)).status,200);assert.equal((await post(expense)).status,200);
let data=await (await api.GET(new Request('https://test'))).json();assert.equal(data.records.filter(r=>r.kind==='expense').length,1);
assert.equal((await post({...expense,id:'e2',body:{...expense.body,cents:2.2}})).status,400);
assert.equal((await post({...expense,id:'e3',body:{...expense.body,participants:['a','a']}})).status,400);
assert.equal((await post(expense,'https://other.example')).status,403);
assert.equal((await post({action:'note',id:'shared-note',version:0,text:'one'})).status,200);
assert.equal((await post({action:'note',id:'shared-note',version:0,text:'clobber'})).status,409);
assert.equal((await post({action:'note',id:'shared-note',version:1,text:'two'})).status,200);
assert.equal((await post({action:'note',id:'shared-note',version:1,text:'clobber'})).status,409);
assert.equal((await post({action:'create',id:'i1',kind:'item',body:{text:'bread'}})).status,200);
assert.equal((await post({action:'toggle',id:'i1',version:1,done:true})).status,200);
assert.equal((await post({action:'toggle',id:'i1',version:1,done:false})).status,409);
assert.equal((await post({action:'delete',id:'e1',version:1})).status,200);
console.log('PASS: rounding, 300 settlement scenarios, repayments, idempotent creates, validation, CORS, concurrent notes/items, deletion');
