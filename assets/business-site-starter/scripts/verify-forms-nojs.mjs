import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {request as httpRequest} from 'node:http';
import {closeSync,existsSync,mkdtempSync,openSync,readFileSync,readSync,rmSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isReview} from '../lib/brief.mjs';

// Dedicated browser executables come before launcher scripts. A script that pins its own
// --user-data-dir or --remote-debugging-port would share a profile or port, so it is skipped
// (or refused when named by CHROME_PATH).
const CHROME_EXECUTABLES=['/opt/google/chrome/chrome','/usr/lib/chromium/chromium','/usr/lib/chromium-browser/chromium-browser','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/Applications/Chromium.app/Contents/MacOS/Chromium'];
const CHROME_LAUNCHERS=['/usr/bin/google-chrome-stable','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser','/usr/local/bin/google-chrome','/usr/local/bin/chromium'];
const NATIVE_MAGIC=['7f454c46','cffaedfe','cefaedfe','feedfacf','feedface','cafebabe'];
function chromeKind(p){
 let fd;
 try{fd=openSync(p,'r');const head=Buffer.alloc(4096);const n=readSync(fd,head,0,4096,0);const bytes=head.subarray(0,n);
  if(NATIVE_MAGIC.includes(bytes.subarray(0,4).toString('hex')))return 'native';
  const text=readFileSync(p,'utf8');
  return /--user-data-dir|--remote-debugging-(port|pipe)/.test(text)?'pins-profile-or-port':'launcher';
 }catch{return null;}finally{if(fd!==undefined)closeSync(fd);}
}
export function findChrome(env=process.env){
 if(env.CHROME_PATH){
  const kind=chromeKind(env.CHROME_PATH);
  if(!kind)throw new Error(`CHROME_PATH ${env.CHROME_PATH} is not a readable file`);
  if(kind==='pins-profile-or-port')throw new Error(`CHROME_PATH ${env.CHROME_PATH} is a launcher script that sets its own --user-data-dir or --remote-debugging-port; point CHROME_PATH at the Chrome or Chromium executable instead`);
  return env.CHROME_PATH;
 }
 const kinds=[...CHROME_EXECUTABLES,...CHROME_LAUNCHERS].map(p=>[p,existsSync(p)?chromeKind(p):null]);
 const pick=kinds.find(([,k])=>k==='native')??kinds.find(([,k])=>k==='launcher');
 if(!pick)throw new Error('No Chrome or Chromium found. Set CHROME_PATH to the browser executable.');
 return pick[0];
}
const TEXT_TYPES=new Set(['','text','email','tel','url','search','number','password','date','textarea']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

function freePort(){return new Promise((ok,fail)=>{const s=createServer();s.on('error',fail);s.listen(0,'127.0.0.1',()=>{const {port}=s.address();s.close(()=>ok(port));});});}

async function waitFor(fn,ms,what,abort=()=>null){
 const end=Date.now()+ms;let last;
 while(Date.now()<end){const stop=abort();if(stop)throw stop;try{const v=await fn();if(v)return v;}catch(e){last=e;}await sleep(150);}
 throw new Error(`Timed out waiting for ${what}${last?`: ${last.message}`:''}`);
}

// Node 20 has no global WebSocket (and 20.9 has no --experimental-websocket flag), so this minimal
// client speaks just enough RFC 6455 for one local DevTools connection: masked text frames out,
// unmasked text/continuation frames in, ping/pong and close.
class LocalWebSocket extends EventTarget{
 constructor(url){
  super();this.buffer=Buffer.alloc(0);this.parts=[];
  const req=httpRequest(url.replace(/^ws:/,'http:'),{headers:{Connection:'Upgrade',Upgrade:'websocket','Sec-WebSocket-Version':'13','Sec-WebSocket-Key':randomBytes(16).toString('base64')}});
  req.on('upgrade',(res,socket,head)=>{this.socket=socket;socket.on('data',d=>this.read(d));socket.on('error',()=>{});if(head.length)this.read(head);this.dispatchEvent(new Event('open'));});
  req.on('response',()=>this.dispatchEvent(new Event('error')));
  req.on('error',()=>this.dispatchEvent(new Event('error')));
  req.end();
 }
 read(chunk){
  this.buffer=Buffer.concat([this.buffer,chunk]);
  while(this.buffer.length>=2){
   const b=this.buffer,fin=b[0]&0x80,op=b[0]&0x0f;let len=b[1]&0x7f,at=2;
   if(len===126){if(b.length<4)return;len=b.readUInt16BE(2);at=4;}
   else if(len===127){if(b.length<10)return;len=Number(b.readBigUInt64BE(2));at=10;}
   if(b.length<at+len)return;
   const payload=b.subarray(at,at+len);this.buffer=b.subarray(at+len);
   if(op===9)this.frame(10,payload);
   else if(op===8){this.socket.end();}
   else if(op===1||op===0){this.parts.push(payload);if(fin){const data=Buffer.concat(this.parts).toString('utf8');this.parts=[];this.dispatchEvent(new MessageEvent('message',{data}));}}
  }
 }
 frame(op,payload){
  const mask=randomBytes(4),len=payload.length;
  const head=len<126?Buffer.from([0x80|op,0x80|len]):len<65536?Buffer.from([0x80|op,0x80|126,len>>8,len&255]):Buffer.concat([Buffer.from([0x80|op,0x80|127]),(()=>{const x=Buffer.alloc(8);x.writeBigUInt64BE(BigInt(len));return x;})()]);
  const body=Buffer.from(payload);for(let i=0;i<body.length;i++)body[i]^=mask[i%4];
  this.socket.write(Buffer.concat([head,mask,body]));
 }
 send(text){this.frame(1,Buffer.from(text,'utf8'));}
 close(){if(this.socket&&!this.socket.destroyed){this.frame(8,Buffer.alloc(0));this.socket.end();}}
}

class Cdp{
 constructor(url){this.ws=globalThis.WebSocket?new WebSocket(url):new LocalWebSocket(url);this.id=0;this.pending=new Map();this.listeners=[];
  this.ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id&&this.pending.has(m.id)){const {ok,fail}=this.pending.get(m.id);this.pending.delete(m.id);m.error?fail(new Error(`${m.error.message}`)):ok(m.result);}else if(m.method)for(const l of this.listeners)l(m);});}
 open(){return new Promise((ok,fail)=>{this.ws.addEventListener('open',ok,{once:true});this.ws.addEventListener('error',fail,{once:true});});}
 send(method,params={}){const id=++this.id;this.ws.send(JSON.stringify({id,method,params}));return new Promise((ok,fail)=>this.pending.set(id,{ok,fail}));}
 on(fn){this.listeners.push(fn);}
 once(method,ms){return new Promise((ok,fail)=>{const t=setTimeout(()=>fail(new Error(`${method} timed out`)),ms);const l=m=>{if(m.method===method){clearTimeout(t);this.listeners=this.listeners.filter(x=>x!==l);ok(m.params);}};this.on(l);});}
 close(){this.ws.close();}
}

export async function launchChrome(){
 const bin=findChrome();
 const profile=mkdtempSync(resolve(tmpdir(),'forms-nojs-chrome-'));
 const proc=spawn(bin,['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:'ignore',detached:process.platform!=='win32'});
 let early=null;
 proc.once('error',e=>{early??=new Error(`Chrome failed to start (${bin}): ${e.message}`);});
 proc.once('exit',(code,sig)=>{early??=new Error(`Chrome exited before it was ready (${bin}, ${sig??`exit code ${code}`})`);});
 const stop=async()=>{try{if(proc.pid)await stopProcess(proc,{group:process.platform!=='win32'});}finally{removeProfile(profile);}};
 try{
  const port=await waitFor(()=>{const f=resolve(profile,'DevToolsActivePort');return existsSync(f)&&readFileSync(f,'utf8').split('\n')[0];},20000,'Chrome to start',()=>early);
  const page=await waitFor(async()=>(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page'),10000,'a Chrome page',()=>early);
  return {page,stop,bin,profile,port,pid:proc.pid};
 }catch(e){await stop();throw e;}
}

// SIGTERM, then SIGKILL after a bounded wait. With group, Chrome runs in its own process group and
// every helper process in it must be gone too, since helpers keep writing the profile after the browser exits.
async function stopProcess(proc,{group=false,ms=5000}={}){
 const signal=sig=>{try{group?process.kill(-proc.pid,sig):proc.kill(sig);}catch(e){if(e.code!=='ESRCH')throw e;}};
 const alive=()=>{if(!group)return proc.exitCode===null&&proc.signalCode===null;try{process.kill(-proc.pid,0);return true;}catch{return false;}};
 const gone=async limit=>{const end=Date.now()+limit;while(alive()&&Date.now()<end)await sleep(50);return !alive();};
 if(!alive())return;
 signal('SIGTERM');
 if(await gone(ms))return;
 signal('SIGKILL');
 if(!await gone(ms))throw new Error(`process ${proc.pid}${group?' group':''} did not exit after SIGKILL`);
}

// The throwaway Chrome profile must not outlive the check.
function removeProfile(dir){
 rmSync(dir,{recursive:true,force:true,maxRetries:5,retryDelay:100});
 if(existsSync(dir))throw new Error(`Could not remove the temporary Chrome profile ${dir}`);
}

async function startServer(root){
 if(!existsSync(resolve(root,'.next')))throw new Error('No production build found. Run npm run build (or npm run build:review for a private review draft) first.');
 const port=await freePort();
 const proc=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'start','-p',String(port),'-H','127.0.0.1'],{cwd:root,stdio:'ignore'});
 const base=`http://127.0.0.1:${port}`;
 try{await waitFor(async()=>(await fetch(base)).status<500,30000,'the Next.js server');}catch(e){await stopProcess(proc);throw e;}
 return {base,stop:()=>stopProcess(proc)};
}

async function attrs(cdp,nodeId){const {attributes}=await cdp.send('DOM.getAttributes',{nodeId});const o={};for(let i=0;i<attributes.length;i+=2)o[attributes[i]]=attributes[i+1];return o;}
async function nodeName(cdp,nodeId){return (await cdp.send('DOM.describeNode',{nodeId})).node.nodeName.toLowerCase();}
async function query(cdp,nodeId,selector){return (await cdp.send('DOM.querySelectorAll',{nodeId,selector})).nodeIds;}
async function click(cdp,nodeId){
 await cdp.send('DOM.scrollIntoViewIfNeeded',{nodeId}).catch(()=>{});
 const {quads}=await cdp.send('DOM.getContentQuads',{nodeId});
 if(!quads?.length)return false;
 const q=quads[0],x=(q[0]+q[2]+q[4]+q[6])/4,y=(q[1]+q[3]+q[5]+q[7])/4;
 for(const type of ['mousePressed','mouseReleased'])await cdp.send('Input.dispatchMouseEvent',{type,x,y,button:'left',clickCount:1});
 return true;
}
async function key(cdp,k,code,keyCode){for(const type of ['keyDown','keyUp'])await cdp.send('Input.dispatchKeyEvent',{type,key:k,code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});}

async function load(cdp,url){const loaded=cdp.once('Page.loadEventFired',20000);await cdp.send('Page.navigate',{url});await loaded;await sleep(150);}
async function currentUrl(cdp){const h=await cdp.send('Page.getNavigationHistory');return h.entries[h.currentIndex].url;}
async function documentRoot(cdp){return (await cdp.send('DOM.getDocument',{depth:-1,pierce:true})).root.nodeId;}

const LOCAL_HOSTS=new Set(['127.0.0.1','localhost','[::1]']);
export function assertControlledBase(base){
 const url=new URL(base);
 if(!LOCAL_HOSTS.has(url.hostname))throw new Error(`Refusing to submit forms on ${url.origin}: this check only runs against a local build it controls, never a live site`);
 return url.origin;
}

export async function checkFormsWithoutJs(root,{base,review,paths=[],maxPages=40}={}){
 if(base)assertControlledBase(base);
 const server=base?null:await startServer(root);
 let chrome=null,cdp=null,report;
 try{
 base??=server.base;
 const origin=assertControlledBase(base);
 review??=isReview(JSON.parse(readFileSync(resolve(root,'content/site.json'),'utf8')));
 chrome=await launchChrome();
 cdp=new Cdp(chrome.page.webSocketDebuggerUrl);
 report={status:'PASS',base,review,javascript:'disabled',submissions:'every request after submit is stubbed inside the browser and never reaches a server',pages:[],forms:[],errors:[]};
 try{
  await cdp.open();
  let log=null;
  cdp.on(m=>{
   if(m.method!=='Fetch.requestPaused')return;
   const r=m.params.request;
   const body=r.postData??(r.postDataEntries||[]).map(e=>Buffer.from(e.bytes||'','base64').toString()).join('');
   log?.push({url:r.url,method:r.method,postData:body||null});
   cdp.send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/html'}],body:Buffer.from('<!doctype html><title>stub</title><p>Stubbed by verify-forms-nojs. Nothing was sent.</p>').toString('base64')}).catch(()=>{});
  });
  for(const [method,params] of [['Page.enable'],['DOM.enable'],['Network.enable'],['Network.setCacheDisabled',{cacheDisabled:true}],['Emulation.setScriptExecutionDisabled',{value:true}],['Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false}]])await cdp.send(method,params);
  const queue=[...new Set(['/',...paths])],seen=new Set(queue),formPages=[];
  while(queue.length&&report.pages.length<maxPages){
   const path=queue.shift();await load(cdp,base+path);
   const doc=await documentRoot(cdp);
   const forms=(await query(cdp,doc,'form')).length;
   report.pages.push({path,forms});if(forms)formPages.push([path,forms]);
   for(const a of await query(cdp,doc,'a[href]')){
    const href=(await attrs(cdp,a)).href||'';
    if(!/^\/(?!\/)/.test(href)||/^\/_next\//.test(href))continue;
    const clean=href.split('#')[0].split('?')[0]||'/';
    if(!seen.has(clean)){seen.add(clean);queue.push(clean);}
   }
  }
  for(const [path,count] of formPages)for(let index=0;index<count;index++){
   await load(cdp,base+path);
   const doc=await documentRoot(cdp),form=(await query(cdp,doc,'form'))[index];
   const formAttrs=await attrs(cdp,form);
   const target=new URL(formAttrs.action||path,base+path);
   const entry={path,index,method:(formAttrs.method||'get').toLowerCase(),action:formAttrs.action??null,target:target.href,inertWithoutJs:(await query(cdp,form,'fieldset[disabled]')).length>0,fields:[],submitted:false,finalUrl:null,requests:[],errors:[]};
   const secrets=[],names=new Set();
   let n=0;
   for(const control of await query(cdp,form,'input, select, textarea')){
    const a=await attrs(cdp,control),tag=await nodeName(cdp,control),type=tag==='input'?(a.type||'').toLowerCase():tag;
    if(['hidden','submit','button','reset','image','file'].includes(type))continue;
    if(a.name)names.add(a.name);
    const token=`nojs${index}x${n++}secret`;
    if(TEXT_TYPES.has(type)){await click(cdp,control);await cdp.send('Input.insertText',{text:type==='number'?String(424242+n):type==='email'?`${token}@example.com`:token});secrets.push(type==='number'?String(424242+n):token);}
    else if(type==='radio'||type==='checkbox'){await click(cdp,control);if(a.name&&a.value)secrets.push(`${a.name}=${a.value}`);}
    else if(type==='select'){await click(cdp,control);await key(cdp,'ArrowDown','ArrowDown',40);await key(cdp,'Enter','Enter',13);}
    entry.fields.push({name:a.name||null,type});
   }
   if(target.origin!==origin||!/^https?:$/.test(target.protocol)){
    entry.errors.push(`Refused to submit: the form action ${target.href} is not the local controlled build, so the check will not send it`);
    report.forms.push(entry);report.errors.push(...entry.errors.map(e=>`${path} form ${index+1}: ${e}`));continue;
   }
   log=[];
   await cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
   const submitter=(await query(cdp,form,'button:not([type=button]):not([type=reset]), input[type=submit], input[type=image]'))[0];
   if(submitter)entry.submitted=await click(cdp,submitter);
   else{const text=(await query(cdp,form,'input:not([type]), input[type=text], input[type=email], input[type=search]'))[0];if(text){await click(cdp,text);await key(cdp,'Enter','Enter',13);entry.submitted=true;}}
   await sleep(2000);
   const requests=log;log=null;
   await cdp.send('Fetch.disable');
   entry.finalUrl=await currentUrl(cdp);
   entry.requests=requests.map(r=>({...r,stubbed:true}));
   const decoded=s=>{try{return decodeURIComponent((s||'').replace(/\+/g,' '));}catch{return s||'';}};
   const leaks=s=>secrets.filter(v=>decoded(s).includes(v)).concat([...names].filter(nm=>new RegExp(`(^|[?&])${nm.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}=`).test(decoded(s))).map(nm=>`${nm}=`));
   const url=new URL(entry.finalUrl);
   if(url.search)entry.errors.push(`The URL has a query string after submit: ${entry.finalUrl}`);
   for(const v of leaks(entry.finalUrl))entry.errors.push(`The URL carries a field value: ${v}`);
   for(const r of entry.requests){
    for(const v of leaks(r.url))entry.errors.push(`A ${r.method} request URL carries a field value: ${v} (${r.url})`);
    const body=leaks(r.postData);
    r.intentionalPost=!review&&body.length>0&&r.method==='POST'&&r.url.split('?')[0]===target.href.split('?')[0]&&!new URL(r.url).search;
    if(body.length&&!r.intentionalPost)entry.errors.push(`A ${r.method} request to ${r.url} carries field values outside the form's own POST action`);
    if(new URL(r.url).origin!==origin)entry.errors.push(`A request went to another origin after submit: ${r.url}`);
   }
   if(review&&entry.requests.length)entry.errors.push(`Review mode sent ${entry.requests.length} request(s) after submit; a private preview must send none`);
   if(entry.method!=='post'&&!entry.inertWithoutJs)entry.errors.push('The form can submit without JavaScript and is not method="post"');
   report.forms.push(entry);report.errors.push(...entry.errors.map(e=>`${path} form ${index+1}: ${e}`));
  }
 }finally{cdp.close();}
 }finally{
  try{await chrome?.stop();}finally{await server?.stop();}
 }
 if(report.errors.length)report.status='FAIL';
 return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=args.indexOf('--url'),pi=args.indexOf('--paths');
 const root=process.cwd();
 const report=await checkFormsWithoutJs(root,{base:at>=0?args[at+1]:undefined,paths:pi>=0?args[pi+1].split(',').filter(Boolean):[]});
 await mkdir(resolve(root,'evidence'),{recursive:true});
 await writeFile(resolve(root,'evidence/forms-nojs.json'),JSON.stringify(report,null,2)+'\n');
 console.log(`${report.status}: ${report.forms.length} visitor form(s) on ${report.pages.length} page(s) submitted with JavaScript disabled (${report.review?'review mode':'not review mode'}). Post-submit requests are stubbed in the browser; nothing reaches a server.`);
 for(const f of report.forms)console.log(`  ${f.path} form ${f.index+1}: method=${f.method}${f.inertWithoutJs?' inert-without-js':''} fields=${f.fields.map(x=>x.name||x.type).join(',')||'none'} submitted=${f.submitted} finalUrl=${f.finalUrl} requestsAfterSubmit=${f.requests.length}${f.requests.some(r=>r.intentionalPost)?' (intentional POST body to its own action)':''}`);
 for(const e of report.errors)console.error(`• ${e}`);
 if(report.status!=='PASS')process.exitCode=1;
}
