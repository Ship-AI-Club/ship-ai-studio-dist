import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {publicationErrors,checkRelease} from '../scripts/verify-release.mjs';
import {checkDesignGate,validateContract,sha256,sourceFingerprint,briefFingerprint,PLACEHOLDER_MARK,PAGE_PLACEHOLDER_MARK,REJECT_CRITERIA} from '../lib/design-gate.mjs';

const source=fileURLToPath(new URL('../',import.meta.url));
const read=p=>readFile(join(source,p),'utf8');
const realBrief=async()=>{const b=JSON.parse(await read('examples/b2b.json'));b.isDemo=false;b.setup={siteBuildModel:'claude-opus-5-5',siteBuildEffort:'medium',siteBuildFast:false,creativeBuildModel:'claude-sonnet-5-5',creativeBuildEffort:'medium'};return b;};
const png=label=>Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),Buffer.from(label)]);
const CONTRACT=`# Design contract
## Direction
Compared: editorial, product-led and photographic. Selected: product-led. Rationale: the result is the proof.
## References
- [Hero study](references/hero.png)
## Copy
Headline: Example headline. CTA: Example action.
## Type
Display 64/700, body 18/400.
## Tokens
--ink #111111, --accent #0055aa.
## Composition
Two-column hero with the product image on the right.
## Phone layout (390px)
Single column, image below the headline.
## Assets
references/hero.png (own render).
## Skill rules
- yc-interface-craft: output as proof → the hero shows a real result image
- intentional-ui-design: one primary action → a single CTA in the first screen
- frontend-design: type contrast → display serif against a plain sans body
`;
const rules=(verdict='PASS')=>[
 {skill:'yc-interface-craft',rule:'output as proof',decision:'result image in hero',screenshot:'desktop',region:'hero right column',verdict},
 {skill:'intentional-ui-design',rule:'one primary action',decision:'single CTA',screenshot:'phone',region:'first screen CTA',verdict:'PASS'},
 {skill:'frontend-design',rule:'type contrast',decision:'serif display',screenshot:'desktop',region:'headline',verdict:'PASS'},
].map(r=>r.verdict==='REJECT'?{...r,fix:'Replace the stock image with the real result render'}:r);
const criteria=(rejected=[])=>Object.fromEntries(REJECT_CRITERIA.map(c=>[c,rejected.includes(c)?{verdict:'REJECT',critique:`${c} is weak`,correction:`Specific ${c} correction`}:{verdict:'PASS',critique:`${c} reads as specific to this business`}]));
let bind={};
const bindTo=root=>{bind={sourceSha256:sourceFingerprint(root).sha256,briefSha256:briefFingerprint(root)};return bind;};
const review=(role,hashes,{verdict='PASS',rejected=[],ruleVerdict='PASS'}={})=>({role,reviewer:`${role} reviewer`,verdict,reviewedScreenshots:hashes,...bind,criteria:criteria(rejected),rules:rules(ruleVerdict)});

async function render(root,round){
 const shots=[];await mkdir(join(root,`design/renders/gate1/round-${round}`),{recursive:true});
 for(const [viewport,width] of [['desktop',1440],['phone',390]]){const bytes=png(`${viewport}-${round}`);const path=`design/renders/gate1/round-${round}/${viewport}.png`;await writeFile(join(root,path),bytes);shots.push({viewport,width,path,sha256:sha256(bytes)});}
 return shots;
}

async function project(patch={},contract=CONTRACT){
 const root=await mkdtemp(join(tmpdir(),'design-gate-'));
 await mkdir(join(root,'app'),{recursive:true});await mkdir(join(root,'content'));await mkdir(join(root,'design'));
 await writeFile(join(root,'app/page.jsx'),'export default function Home(){return <main><Hero/></main>}');
 const brief={...await realBrief(),...patch};
 await writeFile(join(root,'content/site.json'),JSON.stringify(brief));
 await mkdir(join(root,'brief'));await writeFile(join(root,'brief/project.json'),JSON.stringify(brief));
 await cp(join(source,'lib'),join(root,'lib'),{recursive:true});
 await writeFile(join(root,'design/contract.md'),contract);
 bindTo(root);
 const shots=await render(root,1),hashes=shots.map(s=>s.sha256);
 const gate={schemaVersion:1,
  offerReview:{verdict:'PASS',reviewer:'marketing reviewer',offer:'Clear offer',primaryCta:'Example action',proofPlan:'One sourced result',sources:['s1']},
  gate1:{status:'PASS',contractSha256:sha256(Buffer.from(contract)),implementer:'frontend cloud run',
   render:{where:'cloud',runUrl:'https://cursor.com/agents/example',modelSelector:'Claude Opus 5.5 Medium',fast:false,fidelity:'production',skillsRead:['.agents/skills/studio-yc-interface-craft/SKILL.md']},
   rounds:[{round:1,...bind,screenshots:shots,reviews:[review('design',hashes),review('marketing',hashes)]}]}};
 const save=g=>writeFile(join(root,'design/gate.json'),JSON.stringify(g));
 await save(gate);
 return {root,gate,save,done:()=>rm(root,{recursive:true,force:true})};
}
const errorsOf=(p,stage)=>checkDesignGate(p.root,stage?{stage}:{}).errors;
const INVENTORY_CONTRACT=CONTRACT+`## Experience inventory
- home: / — full home page
- start-form: /start — the visitor form before submit
- start-error: /start — the error shown for a missing answer
`;
const INVENTORY=['home','start-form','start-error'];
const coverage=(ids,{skip,reject}={})=>ids.filter(id=>id!==skip).map(id=>id===reject?{experience:id,verdict:'REJECT',critique:`${id} hides the next step`,correction:`Specific ${id} correction`}:{experience:id,verdict:'PASS',critique:`${id} is clear and specific on both viewports`});
// groups: experiences shown together in one screenshot; skip drops "viewport:id,id" screenshots.
async function fullSite(p,{groups=[['home'],['start-form','start-error']],skip=[],design={},marketing={}}={}){
 const dir='design/renders/gate2/round-1';await mkdir(join(p.root,dir),{recursive:true});
 const shots=[];
 for(const [viewport,width] of [['desktop',1440],['phone',390]])for(const experiences of groups){
  if(skip.includes(`${viewport}:${experiences.join(',')}`))continue;
  const bytes=png(`gate2-${viewport}-${experiences.join('-')}`),path=`${dir}/${viewport}-${experiences.join('-')}.png`;
  await writeFile(join(p.root,path),bytes);shots.push({viewport,width,path,sha256:sha256(bytes),experiences});
 }
 const hashes=shots.map(s=>s.sha256),g=structuredClone(p.gate);
 g.gate2={...structuredClone(g.gate1),scope:'experience inventory',rounds:[{round:1,...bind,screenshots:shots,reviews:[
  {...review('design',hashes),coverage:coverage(INVENTORY,design)},
  {...review('marketing',hashes),coverage:coverage(INVENTORY,marketing)}]}]};
 return g;
}

test('the starter ships a neutral placeholder, not a marketing composition',async()=>{
 const page=await read('app/page.jsx'),css=await read('app/globals.css'),site=await read('content/site.json');
 assert.ok(page.includes(PAGE_PLACEHOLDER_MARK));
 for(const old of ['journey-art','journey-node','promise-strip','final-cta','A foundation for your next chapter','Built around your needs','A little more clarity','A clear offer.','#e9eff9','clamp(42px']){
  assert.ok(!page.includes(old)&&!css.includes(old),`old composition remains: ${old}`);
 }
 assert.ok(!site.includes('A useful offer. A clear next step.'));
 assert.ok(!/from ['"][^'"]*design\/[^'"]*\.json['"]/.test(page),'the page must not render sections from a data file');
});

test('the shipped contract is a placeholder and fails validation',async()=>{
 const text=await read('design/contract.md');
 assert.ok(text.includes(PLACEHOLDER_MARK));
 assert.match(validateContract(text)[0],/placeholder/);
 assert.match(validateContract('')[0],/Record the design contract/);
});

test('demo briefs skip the gate; real briefs fail on the shipped placeholders',async()=>{
 assert.equal(checkDesignGate(source).status,'SKIP');
 const errors=checkDesignGate(source,{brief:await realBrief()}).errors;
 assert.ok(errors.some(e=>e.includes('placeholder')&&e.includes('contract')));
 assert.ok(errors.some(e=>e.includes('app/page.jsx')));
 assert.ok(errors.some(e=>e.includes('Gate 1')));
 assert.ok(errors.some(e=>e.includes('offer')));
});

test('contract records the selected direction, references and 3-5 mapped skill rules',()=>{
 assert.deepEqual(validateContract(CONTRACT),[]);
 assert.deepEqual(validateContract(CONTRACT.replace(/Compared:.*\n/,'Owner-chosen direction: warm editorial.\n')),[]);
 assert.ok(validateContract(CONTRACT.replace(/Compared:.*\n/,'Something nice.\n')).some(e=>e.includes('rationale')));
 assert.ok(validateContract(CONTRACT.replace('## Phone layout (390px)','## Notes')).some(e=>e.includes('Phone layout')));
 assert.ok(validateContract(CONTRACT.replace('- [Hero study](references/hero.png)','Some references')).some(e=>e.includes('References')));
 assert.ok(validateContract(CONTRACT.replace(/- frontend-design.*\n/,'').replace(/- intentional.*\n/,'')).some(e=>e.includes('3-5')));
 assert.ok(validateContract(CONTRACT.replace('→ the hero shows','the hero shows')).some(e=>e.includes('→')));
 assert.ok(validateContract(CONTRACT+'x'.repeat(9000)).some(e=>e.includes('one page')));
});

test('a strong first render may pass Gate 1 with both written critiques',async()=>{
 const p=await project();
 try{assert.deepEqual(errorsOf(p),[]);assert.equal(checkDesignGate(p.root,{stage:'owner-review'}).status,'FAIL');}
 finally{await p.done();}
});

test('a rejected render passes only after a recorded revision and re-render',async()=>{
 const p=await project();
 try{
  const first=p.gate.gate1.rounds[0],h1=first.screenshots.map(s=>s.sha256);
  const g=structuredClone(p.gate);
  g.gate1.rounds[0].reviews=[review('design',h1,{verdict:'REJECT',rejected:['composition','type'],ruleVerdict:'REJECT'}),review('marketing',h1,{verdict:'REJECT',rejected:['cta']})];
  await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('design rejected the latest render')&&e.includes('composition')));
  await writeFile(join(p.root,'app/page.jsx'),'export default function Home(){return <main><RevisedHero/></main>}');bindTo(p.root);
  const shots=await render(p.root,2),h2=shots.map(s=>s.sha256);
  g.gate1.rounds.push({round:2,...bind,screenshots:shots,reviews:[review('design',h2),review('marketing',h2)]});await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('round 2: record the revision')));
  g.gate1.rounds[1].revision={summary:'Rebuilt hero grid and CTA label',addresses:['composition','type','cta']};await p.save(g);
  assert.deepEqual(errorsOf(p),[]);
  g.gate1.rounds[0].reviews[0].criteria.composition.correction='';await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('without a specific correction')));
 }finally{await p.done();}
});

test('every round needs both reviewers, written critiques on all reject criteria and the round renders',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);g.gate1.rounds[0].reviews=g.gate1.rounds[0].reviews.filter(r=>r.role==='design');await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('marketing review is missing')));
  const c=structuredClone(p.gate);delete c.gate1.rounds[0].reviews[1].criteria.proof;c.gate1.rounds[0].reviews[0].criteria.copy.critique='';await p.save(c);
  const errors=errorsOf(p);
  assert.ok(errors.some(e=>e.includes('written proof critique')));assert.ok(errors.some(e=>e.includes('written copy critique')));
  const empty=structuredClone(p.gate);empty.gate1.rounds=[];await p.save(empty);
  assert.ok(errorsOf(p).some(e=>e.includes('initial render')));
  const pending=structuredClone(p.gate);pending.gate1.status='pending';await p.save(pending);
  assert.ok(errorsOf(p).some(e=>e.includes('stay blocked')));
  assert.equal(checkDesignGate(p.root,{stage:'render'}).status,'PASS');
 }finally{await p.done();}
});

test('tests, read logs and hashes without renders cannot pass the gate',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);g.gate1.rounds[0].screenshots=[];for(const r of g.gate1.rounds[0].reviews){r.reviewedScreenshots=[];r.evidence=['npm run check 74/74','evidence/design-skills-read.md','sha256 verified'];}await p.save(g);
  const errors=errorsOf(p);
  assert.ok(errors.some(e=>e.includes('desktop (1440px) screenshot')));assert.ok(errors.some(e=>e.includes('phone (390px) screenshot')));
  const shot=p.gate.gate1.rounds[0].screenshots[0];
  await writeFile(join(p.root,shot.path),'test log, not an image');
  const fake=structuredClone(p.gate);fake.gate1.rounds[0].screenshots[0].sha256=sha256(Buffer.from('test log, not an image'));await p.save(fake);
  assert.ok(errorsOf(p).some(e=>e.includes('PNG, JPEG or WebP')));
  await writeFile(join(p.root,shot.path),png('changed'));await p.save(p.gate);
  assert.ok(errorsOf(p).some(e=>e.includes('hash does not match')));
 }finally{await p.done();}
});

test('reviewers are separate from each other and from the implementer',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);g.gate1.rounds[0].reviews[1].reviewer='design reviewer';await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('separate reviewers')));
  const s=structuredClone(p.gate);s.gate1.implementer='design reviewer';await p.save(s);
  assert.ok(errorsOf(p).some(e=>e.includes('cannot review its own render')));
 }finally{await p.done();}
});

test('each rule maps to an implemented decision and a screenshot region',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);const r=g.gate1.rounds[0].reviews[0];delete r.rules[0].region;r.rules[1].screenshot='log';await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('screenshot (desktop or phone) and region')));
  const few=structuredClone(p.gate);few.gate1.rounds[0].reviews[0].rules=few.gate1.rounds[0].reviews[0].rules.slice(0,2);await p.save(few);
  assert.ok(errorsOf(p).some(e=>e.includes('3-5 skill rules')));
 }finally{await p.done();}
});

test('a mock, missing skill reads or the wrong Cloud model invalidate Gate 1',async()=>{
 const p=await project();
 try{
  const base=p.gate.gate1.render;
  for(const [render,msg] of [[{...base,fidelity:'mock'},'low-fidelity mock'],[{...base,skillsRead:[]},'actually applied'],[{...base,modelSelector:'Claude Sonnet 5.5 Medium'},'does not match'],[{...base,fast:true},'Fast'],[{...base,runUrl:''},'Cloud run URL']]){
   const g=structuredClone(p.gate);g.gate1.render=render;await p.save(g);
   assert.ok(errorsOf(p).some(e=>e.includes(msg)),msg);
  }
  const site=JSON.parse(await readFile(join(p.root,'content/site.json')));site.setup={...site.setup,siteBuildModel:'claude-sonnet-5-5',creativeBuildModel:'claude-opus-5-5'};
  await writeFile(join(p.root,'content/site.json'),JSON.stringify(site));await p.save(p.gate);
  assert.ok(errorsOf(p).some(e=>e.includes('setup.siteBuildModel claude-sonnet-5-5')),'the creative model must not satisfy the site build check');
 }finally{await p.done();}
});

test('marketing must pass the offer, CTA and proof plan before the first build',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);g.offerReview.verdict='pending';await p.save(g);
  assert.ok(errorsOf(p,'render').some(e=>e.includes('offer, primary CTA and proof plan')));
  g.offerReview={...p.gate.offerReview,primaryCta:''};await p.save(g);
  assert.ok(errorsOf(p,'render').some(e=>e.includes('primaryCta')));
 }finally{await p.done();}
});

test('the gate command fails a real build and leaves demo builds alone',async()=>{
 const p=await project();
 try{
  await cp(join(source,'lib'),join(p.root,'lib'),{recursive:true});await mkdir(join(p.root,'scripts'));
  await cp(join(source,'scripts/verify-design-gate.mjs'),join(p.root,'scripts/verify-design-gate.mjs'));
  execFileSync(process.execPath,['scripts/verify-design-gate.mjs'],{cwd:p.root,stdio:'pipe'});
  await rm(join(p.root,'design/contract.md'));
  assert.throws(()=>execFileSync(process.execPath,['scripts/verify-design-gate.mjs'],{cwd:p.root,stdio:'pipe'}));
  const demo=JSON.parse(await readFile(join(p.root,'content/site.json')));demo.isDemo=true;await writeFile(join(p.root,'content/site.json'),JSON.stringify(demo));
  execFileSync(process.execPath,['scripts/verify-design-gate.mjs'],{cwd:p.root,stdio:'pipe'});
  assert.ok((await readdir(join(p.root,'evidence'))).includes('design-gate-build.json'));
 }finally{await p.done();}
});

test('production build runs the gate',async()=>{
 const pkg=JSON.parse(await read('package.json'));
 assert.match(pkg.scripts.prebuild,/verify:gate/);
 assert.match(pkg.scripts['verify:gate'],/--stage build/);
 assert.match(pkg.scripts['build:review'],/--stage render/);
});

test('editing the page, styles, content, contract or brief after Gate 2 voids it; historic Gate 1 keeps its own snapshot',async()=>{
 const edits=[['app/page.jsx','export default function Home(){return <main>changed</main>}','changed after this render was reviewed'],['app/globals.css','body{color:red}','changed after this render was reviewed'],['content/site.json',null,'changed after this render was reviewed'],['brief/project.json',null,'brief changed after this render was reviewed'],['components/Hero.jsx','export default function Hero(){return null}','changed after this render was reviewed'],['design/contract.md',INVENTORY_CONTRACT.replace('Example headline','Another headline'),'contract changed']];
 for(const [file,edit,message] of edits){
  const p=await project({},INVENTORY_CONTRACT);
  try{
   await p.save(await fullSite(p));
   assert.deepEqual(errorsOf(p,'owner-review'),[]);
   if(edit===null){const b=JSON.parse(await readFile(join(p.root,file)));b.positioning.headline='A different headline';await writeFile(join(p.root,file),JSON.stringify(b));}
   else{await mkdir(join(p.root,file,'..'),{recursive:true});await writeFile(join(p.root,file),edit);}
   assert.ok(errorsOf(p,'owner-review').some(e=>e.startsWith('Gate 2')&&e.includes(message)),`${file} edit did not void Gate 2`);
   assert.deepEqual(errorsOf(p,'build'),[],`${file} edit must not void the historic Gate 1 snapshot`);
  }finally{await p.done();}
 }
});

test('a PASS needs reviews that cite the exact source and brief that were rendered',async()=>{
 const p=await project();
 try{
  const g=structuredClone(p.gate);
  delete g.gate1.rounds[0].sourceSha256;await p.save(g);
  assert.ok(errorsOf(p).some(e=>e.includes('record the sourceSha256 and briefSha256')));
  const h=structuredClone(p.gate);h.gate1.rounds[0].reviews[1].sourceSha256='0'.repeat(64);await p.save(h);
  assert.ok(errorsOf(p).some(e=>e.includes('marketing review must cite the sourceSha256 and briefSha256')));
 }finally{await p.done();}
});

test('every skill rule needs an explicit PASS or REJECT verdict',async()=>{
 for(const verdict of [undefined,'','pass','OK','N/A']){
  const p=await project();
  try{
   const g=structuredClone(p.gate);
   if(verdict===undefined)delete g.gate1.rounds[0].reviews[0].rules[1].verdict;else g.gate1.rounds[0].reviews[0].rules[1].verdict=verdict;
   await p.save(g);
   assert.ok(errorsOf(p).some(e=>e.includes('needs an explicit PASS or REJECT verdict')),`rule verdict ${JSON.stringify(verdict)} passed`);
  }finally{await p.done();}
 }
});

test('publication requires the exact source the reviewers and the owner approved',async()=>{
 const p=await project({publicationApproved:true,siteUrl:'https://example.com'},INVENTORY_CONTRACT);
 try{
  const site=JSON.parse(await readFile(join(p.root,'content/site.json')));
  const g=await fullSite(p);
  await p.save(g);
  assert.ok(publicationErrors(site,p.root).some(e=>e.includes('ownerApproval')),'publication without a recorded owner approval');
  g.ownerApproval={approvedBy:'Business owner',approvedAt:'2026-10-18',message:'Owner approved the reviewed draft in chat',sourceSha256:bind.sourceSha256,briefSha256:bind.briefSha256};
  await p.save(g);
  assert.deepEqual(publicationErrors(site,p.root),[]);
  assert.deepEqual(checkRelease(site,'build',{VERCEL:'1'},p.root),[]);
  await mkdir(join(p.root,'app'),{recursive:true});await writeFile(join(p.root,'app/globals.css'),'body{background:#000}');
  const errors=publicationErrors(site,p.root).join('\n');
  assert.match(errors,/changed after the owner approved it/);assert.match(errors,/changed after this render was reviewed/);
  assert.match(checkRelease(site,'build',{VERCEL:'1'},p.root).join('\n'),/exact reviewed and approved version/);
 }finally{await p.done();}
});

test('Gate 2 covers every page and visitor state in the contract inventory on desktop and phone, reviewed by both',async()=>{
 const bare=await project();
 try{
  const g=await fullSite(bare);await bare.save(g);
  assert.match(errorsOf(bare,'owner-review').join('\n'),/needs a "## Experience inventory"/,'Gate 2 without a recorded inventory');
 }finally{await bare.done();}
 const p=await project({},INVENTORY_CONTRACT);
 try{
  assert.deepEqual(errorsOf(p,'build'),[],'Gate 1 keeps its hero and first proof scope: one desktop and one phone render');
  await p.save(await fullSite(p));
  assert.deepEqual(errorsOf(p,'owner-review'),[],'one screenshot may show several states; identical repeats are not required');
  const fails=async(opts,pattern,why)=>{await p.save(await fullSite(p,opts));assert.match(errorsOf(p,'owner-review').join('\n'),pattern,why);};
  await fails({groups:[['home']]},/no desktop \(1440px\) screenshot of "start-form"/,'a homepage image per viewport is not full-site evidence');
  await fails({skip:['phone:start-form,start-error']},/no phone \(390px\) screenshot of "start-error"/,'each state needs phone evidence');
  await fails({groups:[['home'],['start-form','start-error'],['pricing']]},/shows "pricing", which is not in the contract's experience inventory/,'screenshots map to the recorded inventory');
  await fails({marketing:{skip:'start-form'}},/marketing review does not cover "start-form"/,'both reviewers cover every state');
  await fails({design:{skip:'start-error'}},/design review does not cover "start-error"/,'both reviewers cover every state');
  await fails({design:{reject:'start-error'}},/design cannot PASS with rejected items/,'a rejected state blocks the PASS');
  const g=await fullSite(p);g.gate2.rounds[0].screenshots[0].experiences=[];await p.save(g);
  assert.match(errorsOf(p,'owner-review').join('\n'),/must name the inventory experiences it shows/);
 }finally{await p.done();}
});

test('a visitor-visible status, approved flag or mode change always changes the fingerprint',async()=>{
 const p=await project();
 try{
  const base={source:sourceFingerprint(p.root).sha256,brief:briefFingerprint(p.root)};
  const original=await readFile(join(p.root,'brief/project.json'),'utf8');
  for(const [what,change] of [['positioning.status',b=>{b.positioning.status=b.positioning.status==='approved'?'proposed':'approved';}],['business.pricing.approved',b=>{b.business.pricing.approved=!b.business.pricing.approved;}],['mode',b=>{b.mode=b.mode==='review'?'production':'review';}]]){
   const b=JSON.parse(original);change(b);
   for(const file of ['brief/project.json','content/site.json'])await writeFile(join(p.root,file),JSON.stringify(b));
   assert.notEqual(briefFingerprint(p.root),base.brief,`${what} must change briefSha256`);
   assert.notEqual(sourceFingerprint(p.root).sha256,base.source,`${what} must change sourceSha256`);
  }
 }finally{await p.done();}
});
