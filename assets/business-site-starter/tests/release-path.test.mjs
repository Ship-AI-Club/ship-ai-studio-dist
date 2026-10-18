import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {cp,mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {REJECT_CRITERIA,sha256} from '../lib/design-gate.mjs';

const source=fileURLToPath(new URL('../',import.meta.url));
const SKIP=new Set(['node_modules','.next','tests','evidence','.agents']);
const png=label=>Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from(label)]);
const CONTRACT=`# Design contract
## Direction
Compared: ledger-led, editorial and photographic. Selected: ledger-led. Rationale: a recovered line item is the proof.
## References
- [Hero study](references/hero.png)
## Copy
Headline from the brief. CTA: Request a free invoice audit.
## Type
Display 60/700, body 18/400, system stacks.
## Tokens
--ink #14202b, --accent #1f5f8b, --paper #f5f7f8.
## Composition
Headline left, an annotated invoice line right; proof strip below.
## Phone layout (390px)
Single column; invoice line below the headline; 48px tap targets.
## Assets
Own render of an annotated invoice line.
## Experience inventory
- home: / — full home page with hero, proof and pricing
- start-form: /start — the audit request form before submit
- start-error: /start — the error for a missing answer
## Skill rules
- yc-interface-craft: output as proof → the hero shows a recovered invoice line
- intentional-ui-design: one primary action → one CTA in the first screen
- frontend-design: type contrast → heavy display against a plain body
`;
const INVENTORY=['home','start-form','start-error'];
const RENDER={where:'cloud',runUrl:'https://cursor.com/agents/example',modelSelector:'Claude Opus 5.5 Medium',fast:false,fidelity:'production',skillsRead:['lib/brief.mjs']};
const criteria=Object.fromEntries(REJECT_CRITERIA.map(c=>[c,{verdict:'PASS',critique:`${c} is specific to this business`}]));
const rules=['desktop','phone','desktop'].map((screenshot,i)=>({skill:'intentional-ui-design',rule:`rule ${i+1}`,decision:`decision ${i+1}`,screenshot,region:'first screen',verdict:'PASS'}));

async function starter(){
 const temp=await mkdtemp(join(tmpdir(),'release-path-')),root=join(temp,'site');
 await cp(source,root,{recursive:true,filter:src=>!SKIP.has(src.slice(source.length).split(/[\\/]/)[0])});
 const run=(script,...args)=>execFileSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8',stdio:'pipe',env:{...process.env,VERCEL:''}});
 const json=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
 const save=(p,x)=>writeFile(join(root,p),typeof x==='string'?x:JSON.stringify(x,null,2));
 return {temp,root,run,json,save,
  configure:async brief=>{await save('brief/project.json',brief);run('scripts/configure.mjs');},
  fingerprint:()=>JSON.parse(run('scripts/verify-design-gate.mjs','--fingerprint')),
  gate:stage=>{try{run('scripts/verify-design-gate.mjs','--stage',stage);return [];}catch(e){return JSON.parse(readFileSync(join(root,`evidence/design-gate-${stage}.json`),'utf8')).errors;}},
  release:(target,env={})=>{try{return {ok:true,out:execFileSync(process.execPath,['scripts/verify-release.mjs','--target',target],{cwd:root,encoding:'utf8',stdio:'pipe',env:{...process.env,VERCEL:'',...env}})};}catch(e){return {ok:false,out:`${e.stdout}${e.stderr}`};}}};
}

async function shots(s,dir,groups){
 await mkdir(join(s.root,dir),{recursive:true});const out=[];
 for(const [viewport,width] of [['desktop',1440],['phone',390]])for(const experiences of groups){
  const bytes=png(`${dir}-${viewport}-${experiences.join('-')}`),path=`${dir}/${viewport}-${experiences.join('-')||'hero'}.png`;
  await writeFile(join(s.root,path),bytes);out.push({viewport,width,path,sha256:sha256(bytes),...(experiences.length?{experiences}:{})});
 }
 return out;
}
const reviews=(bound,hashes,coverage)=>['design','marketing'].map(role=>({role,reviewer:`${role} reviewer`,verdict:'PASS',reviewedScreenshots:hashes,...bound,criteria,rules,...(coverage?{coverage:INVENTORY.map(experience=>({experience,verdict:'PASS',critique:`${experience} is clear on both viewports`}))}:{})}));
const round=(n,bound,list,coverage,revision)=>({round:n,sourceSha256:bound.sourceSha256,briefSha256:bound.briefSha256,...(revision?{revision}:{}),screenshots:list,reviews:reviews({sourceSha256:bound.sourceSha256,briefSha256:bound.briefSha256},list.map(x=>x.sha256),coverage)});

test('review draft → page expansion → Gate 2 → owner-approved production candidate → publication, and a later content edit is rejected',async()=>{
 const s=await starter();
 try{
  // 1. Private review draft: owner answers plus proposals, hero and first proof only.
  const brief=JSON.parse(await readFile(join(source,'tests/fixtures/review-b2b.json'),'utf8'));
  await s.configure(brief);
  await s.save('design/contract.md',CONTRACT);
  await mkdir(join(s.root,'components/site'),{recursive:true});
  await s.save('components/site/Hero.jsx',"import {site,price} from '../../lib/site';\nexport default function Hero(){return <section className=\"hero\"><h1>{site.positioning.headline}</h1><p>{site.positioning.summary}</p>{price&&<p className=\"price\">{price}</p>}<a href={site.product.primaryAction.href}>{site.product.primaryAction.label}</a></section>}\n");
  await s.save('app/page.jsx',"import Hero from '../components/site/Hero';\nexport default function Home(){return <main><Hero/></main>}\n");
  const gate=await s.json('design/gate.json');
  gate.offerReview={verdict:'PASS',reviewer:'marketing reviewer',offer:'Free 90-day invoice audit',primaryCta:'Request a free invoice audit',proofPlan:'One recovered line item',sources:['owner answer 3']};
  const g1=s.fingerprint(),contract1=sha256(Buffer.from(CONTRACT));
  gate.gate1={...gate.gate1,status:'PASS',contractSha256:contract1,implementer:'frontend cloud run',render:RENDER,rounds:[round(1,g1,await shots(s,'design/renders/gate1/round-1',[[]]))]};
  await s.save('design/gate.json',gate);
  assert.deepEqual(s.gate('build'),[],'Gate 1 passes on the hero and first proof');
  assert.ok(s.release('build').ok,'a review draft builds locally');
  assert.ok(!s.release('build',{VERCEL:'1'}).ok,'a review draft never builds in a deploy environment');

  // 2. Real expansion after Gate 1: new sections, routes and states. Gate 1 stays valid on its own snapshot.
  await s.save('components/site/Proof.jsx',"export default function Proof(){return <section className=\"proof\"><h2>One recovered line</h2><p>Line-level checks against your contracted rates.</p></section>}\n");
  await s.save('app/page.jsx',"import Hero from '../components/site/Hero';\nimport Proof from '../components/site/Proof';\nexport default function Home(){return <main><Hero/><Proof/></main>}\n");
  await s.save('app/globals.css',(await readFile(join(s.root,'app/globals.css'),'utf8'))+'\n.proof{padding:64px 0}\n');
  assert.notEqual(s.fingerprint().sourceSha256,g1.sourceSha256,'the expansion changed the source');
  assert.deepEqual(s.gate('build'),[],'expanding the page must not make the historic Gate 1 stale');
  assert.ok(s.gate('owner-review').some(e=>e.startsWith('Gate 2')),'owner review waits for Gate 2');

  // 3. Gate 2 on the full review draft, covering every inventory page and state.
  const g2=s.fingerprint();
  gate.gate2={...gate.gate2,status:'PASS',contractSha256:contract1,implementer:'frontend cloud run',render:RENDER,rounds:[round(1,g2,await shots(s,'design/renders/gate2/round-1',[['home'],['start-form','start-error']]),true)]};
  await s.save('design/gate.json',gate);
  assert.deepEqual(s.gate('owner-review'),[]);

  // 4. The owner gives final approvals. The production candidate shows the price without the proposal label
  //    and drops the review chrome, so it is a visible change that must be rendered and reviewed again.
  const production={...brief,version:2,mode:'production',
   positioning:{...brief.positioning,status:'approved',approvedBy:'Business owner',approvedAt:'2026-10-18',sources:[{id:'s1',title:'Carrier billing error study',date:'2026-09-01',url:'https://example.com/study'}]},
   product:{...brief.product,status:'approved',approvedBy:'Business owner',approvedAt:'2026-10-18'},
   business:{...brief.business,pricing:{...brief.business.pricing,approved:true,status:'approved',approvedBy:'Business owner',approvedAt:'2026-10-18'}}};
  for(const item of [production.positioning,production.product,production.business.pricing]){delete item.source;delete item.rationale;}
  await s.configure(production);
  assert.ok(s.release('production').ok,s.release('production').out);
  assert.match(s.gate('owner-review').join('\n'),/changed after this render was reviewed/,'the production candidate differs visibly from the reviewed draft');
  assert.deepEqual(s.gate('build'),[],'a local production build still has its historic Gate 1');
  const g3=s.fingerprint();
  gate.gate2.rounds.push(round(2,g3,await shots(s,'design/renders/gate2/round-2',[['home'],['start-form','start-error']]),true,{summary:'Re-rendered the production candidate after the owner approved positioning, scope and pricing',addresses:['price label','review note']}));
  await s.save('design/gate.json',gate);
  assert.deepEqual(s.gate('owner-review'),[],'both reviewers passed the exact production candidate');

  // 5. The owner approves publishing that exact candidate. Recording the approval, the live address and the
  //    publication flag is approval metadata; it does not change what visitors see, so the review still holds.
  gate.ownerApproval={approvedBy:'Business owner',approvedAt:'2026-10-18T15:00:00Z',message:'Owner approved the reviewed production candidate for publication',sourceSha256:g3.sourceSha256,briefSha256:g3.briefSha256};
  await s.save('design/gate.json',gate);
  await s.configure({...production,version:3,publicationApproved:true,siteUrl:'https://corvane.example'});
  assert.deepEqual(s.fingerprint(),g3,'approval metadata leaves the visitor-content fingerprint unchanged');
  const publish=s.release('publication');
  assert.ok(publish.ok,publish.out);
  assert.ok(s.release('build',{VERCEL:'1'}).ok,'the deploy-environment build accepts the exact approved candidate');

  // 6. A later visitor-content edit is rejected until it is reviewed and approved again.
  const edited=await s.json('brief/project.json');edited.positioning.headline='Find every freight overcharge, automatically.';
  await s.configure(edited);
  const blocked=s.release('publication');
  assert.equal(blocked.ok,false);
  assert.match(blocked.out,/changed after the owner approved it/);
  assert.match(blocked.out,/changed after this render was reviewed/);
  assert.equal(s.release('build',{VERCEL:'1'}).ok,false);
 }finally{await rm(s.temp,{recursive:true,force:true});}
});
