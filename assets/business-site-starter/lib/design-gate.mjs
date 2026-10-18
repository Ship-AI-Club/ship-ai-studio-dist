import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {relative,resolve} from 'node:path';
import {siteBuild,demoMisuse,visitorContent} from './brief.mjs';

export const CONTRACT_PATH='design/contract.md';
export const GATE_PATH='design/gate.json';
export const PLACEHOLDER_MARK='design-contract: placeholder';
export const PAGE_PLACEHOLDER_MARK='data-starter-placeholder';
export const CONTRACT_SECTIONS=['Direction','References','Copy','Type','Tokens','Composition','Phone layout (390px)','Assets','Skill rules'];
export const CONTRACT_MAX_CHARS=8000;
export const VIEWPORTS={desktop:1440,phone:390};
export const REVIEWER_ROLES=['design','marketing'];
export const REJECT_CRITERIA=['composition','branding','type','copy','proof','cta'];
const MODEL_LABELS={'claude-sonnet-5-5':/sonnet\s*5\.5/i,'claude-opus-5-5':/opus\s*5\.5/i};

export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export const BRIEF_PATH='brief/project.json';
export const SITE_PATH='content/site.json';
// Everything that changes what the reviewed page looks like or says. Gate state, renders and tests are excluded.
// The configured brief (content/site.json) enters as its visitor content, so approval evidence and release
// metadata recorded after review do not void it, while any status or content change that visitors see does.
export const RENDER_INPUT_DIRS=['app','components','lib','content','public','styles'];
export const RENDER_INPUT_FILES=['next.config.mjs','package.json','package-lock.json','jsconfig.json',CONTRACT_PATH];
const contentHash=path=>sha256(Buffer.from(JSON.stringify(visitorContent(JSON.parse(readFileSync(path,'utf8'))))));
function walk(root,dir){
 const full=resolve(root,dir);if(!existsSync(full))return [];
 return statSync(full).isDirectory()?readdirSync(full).sort().flatMap(n=>walk(root,`${dir}/${n}`)):[dir];
}
export function sourceFingerprint(root){
 const files=[...RENDER_INPUT_DIRS.flatMap(d=>walk(root,d)),...RENDER_INPUT_FILES.filter(f=>existsSync(resolve(root,f)))].sort();
 const lines=files.map(f=>{const rel=relative(root,resolve(root,f));return `${rel}\0${rel===SITE_PATH?`visitor:${contentHash(resolve(root,f))}`:sha256(readFileSync(resolve(root,f)))}`;});
 return {sha256:sha256(Buffer.from(lines.join('\n'))),files:files.length};
}
export const briefFingerprint=root=>existsSync(resolve(root,BRIEF_PATH))?contentHash(resolve(root,BRIEF_PATH)):'';
const filled=x=>typeof x==='string'&&x.trim().length>0;
const list=x=>Array.isArray(x)?x:[];

function sections(text){
 const out={};let current=null;
 for(const line of text.split('\n')){const h=/^##\s+(.+?)\s*$/.exec(line);if(h){current=h[1];out[current]=[];continue;}if(current)out[current].push(line);}
 return out;
}

export function validateContract(text){
 if(typeof text!=='string'||!text.trim())return ['Record the design contract in design/contract.md'];
 if(text.includes(PLACEHOLDER_MARK))return ['design/contract.md is still the starter placeholder; the Product Designer must replace it'];
 const errors=[],body=sections(text);
 if(text.length>CONTRACT_MAX_CHARS)errors.push(`Keep the design contract to one page (${CONTRACT_MAX_CHARS} characters or fewer)`);
 for(const name of CONTRACT_SECTIONS){const lines=body[name];if(!lines||!lines.join('').trim())errors.push(`Design contract needs a filled "## ${name}" section`);}
 const direction=(body.Direction||[]).join('\n');
 if(body.Direction&&!/owner[- ]chosen/i.test(direction)&&!(/compared/i.test(direction)&&/selected/i.test(direction)&&/rationale/i.test(direction)))errors.push('Direction must record the 2-3 directions compared, the one selected and the rationale (or the owner-chosen direction)');
 const refs=(body.References||[]).join('\n');
 if(body.References&&!/(https:\/\/\S+|\]\((?!https?:)[^)]+\))/.test(refs))errors.push('References need reference image files or accessible artifact links');
 const rules=(body['Skill rules']||[]).filter(l=>/^\s*[-*]\s+/.test(l));
 if(body['Skill rules']&&(rules.length<3||rules.length>5))errors.push('Name 3-5 skill rules');
 if(rules.some(l=>!/→|->/.test(l)))errors.push('Map each skill rule to a concrete design decision with "→"');
 return errors;
}

export const INVENTORY_SECTION='Experience inventory';
const INVENTORY_LINE=/^\s*[-*]\s+([a-z0-9][a-z0-9-]*)\s*:\s*(\/\S*)\s+(?:—|–|--?)\s+(\S.*)$/i;

// Gate 2 scope: every in-scope route and key visitor state (forms, useful results, errors) the site promises.
export function experienceInventory(text){
 const items=[],errors=[];
 for(const line of (sections(text||'')[INVENTORY_SECTION]||[]).filter(l=>/^\s*[-*]\s+/.test(l))){
  const m=INVENTORY_LINE.exec(line);
  if(!m){errors.push(`Experience inventory lines must read "- id: /route — page or visitor state": ${line.trim()}`);continue;}
  if(items.some(i=>i.id===m[1]))errors.push(`Experience inventory id "${m[1]}" is listed twice`);
  items.push({id:m[1],route:m[2],state:m[3].trim()});
 }
 if(!items.length)errors.push(`Gate 2 needs a "## ${INVENTORY_SECTION}" in design/contract.md listing every in-scope route and key visitor state (forms, useful results, errors) as "- id: /route — state"`);
 return {items,errors};
}

function checkShotFile(root,shot,label,name){
 const errors=[],width=VIEWPORTS[shot.viewport];
 if(!width)return [`${label}: ${name} needs a viewport of desktop or phone`];
 if(shot.width!==width)errors.push(`${label}: the ${name} must be ${width}px wide`);
 const path=resolve(root,shot.path||'');
 if(!filled(shot.path)||!existsSync(path))return [...errors,`${label}: ${name} file is missing`];
 const bytes=readFileSync(path);
 const image=bytes.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))||(bytes[0]===0xff&&bytes[1]===0xd8)||bytes.subarray(8,12).toString()==='WEBP';
 if(!image)errors.push(`${label}: ${name} must be a PNG, JPEG or WebP render`);
 if(sha256(bytes)!==shot.sha256)errors.push(`${label}: ${name} hash does not match the saved render`);
 return errors;
}

function checkScreenshots(root,shots,label){
 const errors=[],hashes=[];
 for(const [viewport,width] of Object.entries(VIEWPORTS)){
  const shot=list(shots).find(s=>s.viewport===viewport);
  if(!shot){errors.push(`${label}: add a ${viewport} (${width}px) screenshot of the actual render`);continue;}
  hashes.push(shot.sha256);
  errors.push(...checkShotFile(root,shot,label,`${viewport} screenshot`));
 }
 return {errors,hashes};
}

// One screenshot may show several inventory items; identical repeats are not required.
function checkInventoryScreenshots(root,shots,label,items,final){
 const errors=[],hashes=[],ids=new Set(items.map(i=>i.id));
 list(shots).forEach((shot,i)=>{
  const shown=list(shot.experiences),name=`${shot.viewport||'unknown'} screenshot ${i+1}`;
  hashes.push(shot.sha256);
  errors.push(...checkShotFile(root,shot,label,name));
  if(!shown.length)errors.push(`${label}: ${name} must name the inventory experiences it shows`);
  for(const id of shown)if(!ids.has(id))errors.push(`${label}: ${name} shows "${id}", which is not in the contract's experience inventory`);
 });
 if(final)for(const item of items)for(const [viewport,width] of Object.entries(VIEWPORTS))
  if(!list(shots).some(s=>s.viewport===viewport&&list(s.experiences).includes(item.id)))errors.push(`${label}: no ${viewport} (${width}px) screenshot of "${item.id}" (${item.route} — ${item.state}); every in-scope page and visitor state needs actual desktop and phone evidence`);
 if(!list(shots).length)errors.push(`${label}: add the desktop and phone screenshots of the actual render`);
 return {errors,hashes};
}

function checkRender(root,gate,name,brief){
 const r=gate.render,errors=[];
 if(!r||r.where!=='cloud'||!/^https:\/\//.test(r.runUrl||''))return [`${name}: record the Cloud run URL that rendered the screenshots`];
 if(!filled(r.modelSelector))errors.push(`${name}: record the actual Cloud model selector setting`);
 if(r.fast!==false)errors.push(`${name}: record that Fast mode was off`);
 const want=siteBuild(brief).model;
 if(want&&filled(r.modelSelector)&&(!MODEL_LABELS[want]?.test(r.modelSelector)||!/medium/i.test(r.modelSelector)))errors.push(`${name}: the Cloud model selector does not match setup.siteBuildModel ${want} at medium effort; never upgrade or fall back silently`);
 if(r.fidelity!=='production')errors.push(`${name}: renders must come from the production components built in Cloud; a low-fidelity mock never passes or counts as premium`);
 const read=list(r.skillsRead);
 if(!read.length)errors.push(`${name}: list the full skill and reference files actually applied in the Cloud build`);
 const skillsRoot=resolve(root,'.agents/skills');
 if(existsSync(skillsRoot))for(const p of read)if(!filled(p)||!existsSync(resolve(root,p)))errors.push(`${name}: applied skill file not found: ${p}`);
 return errors;
}

function checkReview(review,role,label,hashes,final,round={},items=null){
 const errors=[];
 if(!review)return [`${label}: ${role} review is missing`];
 if(!filled(review.reviewer))errors.push(`${label}: name the ${role} reviewer`);
 if(!['PASS','REJECT'].includes(review.verdict))errors.push(`${label}: ${role} verdict must be PASS or REJECT`);
 if(review.sourceSha256!==round.sourceSha256||review.briefSha256!==round.briefSha256)errors.push(`${label}: the ${role} review must cite the sourceSha256 and briefSha256 of the render it reviewed`);
 const seen=list(review.reviewedScreenshots);
 if(!hashes.length||hashes.some(h=>!seen.includes(h)))errors.push(`${label}: the ${role} review must cite the sha256 of every screenshot it reviewed`);
 const criteria=review.criteria||{};
 for(const c of REJECT_CRITERIA){
  const x=criteria[c];
  if(!x||!['PASS','REJECT'].includes(x.verdict)||!filled(x.critique))errors.push(`${label}: the ${role} review needs a written ${c} critique with PASS or REJECT`);
  else if(x.verdict==='REJECT'&&!filled(x.correction))errors.push(`${label}: ${role} rejected ${c} without a specific correction`);
 }
 const rules=list(review.rules);
 if(rules.length<3||rules.length>5)errors.push(`${label}: the ${role} review must check 3-5 skill rules`);
 for(const rule of rules){
  if(!['skill','rule','decision','region'].every(k=>filled(rule[k]))||!Object.keys(VIEWPORTS).includes(rule.screenshot))errors.push(`${label}: each ${role} rule needs skill, rule, implemented decision, screenshot (desktop or phone) and region`);
  if(!['PASS','REJECT'].includes(rule.verdict))errors.push(`${label}: ${role} rule "${rule.rule||'unnamed'}" needs an explicit PASS or REJECT verdict`);
  else if(rule.verdict==='REJECT'&&!filled(rule.fix))errors.push(`${label}: ${role} rejected "${rule.rule||'a rule'}" without a specific fix`);
 }
 const coverage=list(review.coverage);
 if(items){
  for(const c of coverage){
   if(!items.some(i=>i.id===c.experience))errors.push(`${label}: the ${role} review covers "${c.experience}", which is not in the experience inventory`);
   else if(!['PASS','REJECT'].includes(c.verdict)||!filled(c.critique))errors.push(`${label}: the ${role} review of "${c.experience}" needs a written critique with PASS or REJECT`);
   else if(c.verdict==='REJECT'&&!filled(c.correction))errors.push(`${label}: ${role} rejected "${c.experience}" without a specific correction`);
  }
  if(final)for(const item of items)if(!coverage.some(c=>c.experience===item.id))errors.push(`${label}: the ${role} review does not cover "${item.id}" (${item.route} — ${item.state}); both reviewers must review every in-scope page and visitor state`);
 }
 const rejected=REJECT_CRITERIA.filter(c=>criteria[c]?.verdict==='REJECT').map(c=>`${c}: ${criteria[c].correction||''}`).concat(rules.filter(r=>r.verdict==='REJECT').map(r=>`${r.rule}: ${r.fix||''}`)).concat(items?coverage.filter(c=>c.verdict==='REJECT').map(c=>`${c.experience}: ${c.correction||''}`):[]);
 if(review.verdict==='PASS'&&rejected.length)errors.push(`${label}: ${role} cannot PASS with rejected items`);
 if(review.verdict==='REJECT'&&!rejected.length)errors.push(`${label}: ${role} REJECT must name the rejected criteria or rules`);
 if(final&&review.verdict!=='PASS')errors.push(`${label}: ${role} rejected the latest render: ${rejected.join('; ')||'no reason given'}`);
 return errors;
}

// historic: Gate 1 binds its own hero and proof snapshot; only the current candidate (Gate 2) must match today's files.
export function validateGateStage(root,gate,name,{contractSha256,brief,source,briefSha256,inventory=null,historic=false}={}){
 if(!gate||typeof gate!=='object')return [`${name}: no review recorded`];
 if(gate.status!=='PASS')return [`${name}: not passed (status ${gate.status||'missing'}); expansion and owner review stay blocked`];
 const errors=[];
 if(historic&&!/^[0-9a-f]{64}$/.test(gate.contractSha256||''))errors.push(`${name}: record the contractSha256 of the contract that was reviewed`);
 if(!historic&&contractSha256&&gate.contractSha256!==contractSha256)errors.push(`${name}: the design contract changed after review; review the new version`);
 errors.push(...checkRender(root,gate,name,brief));
 const rounds=list(gate.rounds);
 if(!rounds.length)return [...errors,`${name}: record the initial render and both written critiques`];
 rounds.forEach((round,i)=>{
  const label=`${name} round ${i+1}`,final=i===rounds.length-1;
  if(round.round!==i+1)errors.push(`${label}: rounds must be numbered 1, 2, 3 in order`);
  if(i>0&&(!filled(round.revision?.summary)||!list(round.revision?.addresses).length))errors.push(`${label}: record the revision and the corrections it addresses before the re-render`);
  if(!/^[0-9a-f]{64}$/.test(round.sourceSha256||'')||!/^[0-9a-f]{64}$/.test(round.briefSha256||''))errors.push(`${label}: record the sourceSha256 and briefSha256 of the build that was rendered (npm run gate:fingerprint)`);
  if(!historic&&final&&source&&round.sourceSha256!==source)errors.push(`${label}: the page source, styles, content or brief changed after this render was reviewed; build, render and review the current version`);
  if(!historic&&final&&briefSha256!=null&&round.briefSha256!==briefSha256)errors.push(`${label}: the brief changed after this render was reviewed; render and review the current brief`);
  const shots=inventory?checkInventoryScreenshots(root,round.screenshots,label,inventory,final):checkScreenshots(root,round.screenshots,label);errors.push(...shots.errors);
  const reviews=list(round.reviews);
  for(const role of REVIEWER_ROLES)errors.push(...checkReview(reviews.find(r=>r.role===role),role,label,shots.hashes,final,round,inventory));
  const next=rounds[i+1],changed=next&&(next.sourceSha256!==round.sourceSha256||next.briefSha256!==round.briefSha256);
  if(!final&&reviews.every(r=>r.verdict==='PASS')&&!changed)errors.push(`${label}: both reviewers passed, so this must be the final round unless the next round reviews a changed candidate`);
 });
 const names=new Set();
 for(const round of rounds)for(const r of list(round.reviews))if(filled(r.reviewer))names.add(`${r.role}:${r.reviewer.trim().toLowerCase()}`);
 const byRole=role=>[...names].filter(n=>n.startsWith(`${role}:`)).map(n=>n.slice(role.length+1));
 const design=byRole('design'),marketing=byRole('marketing'),implementer=(gate.implementer||'').trim().toLowerCase();
 if(!implementer)errors.push(`${name}: name the Frontend implementer`);
 if(design.some(n=>marketing.includes(n)))errors.push(`${name}: the design and marketing reviewers must be separate reviewers`);
 if(implementer&&[...design,...marketing].includes(implementer))errors.push(`${name}: the implementer cannot review its own render`);
 return errors;
}

export function validateOfferReview(review){
 if(!review||review.verdict!=='PASS')return ['Marketing must PASS the offer, primary CTA and proof plan before the first build'];
 return ['offer','primaryCta','proofPlan'].filter(k=>!filled(review[k])).map(k=>`Offer review needs ${k}`).concat(filled(review.reviewer)?[]:['Name the marketing reviewer of the offer']);
}

export function readJson(path){return JSON.parse(readFileSync(path,'utf8'));}

export function checkDesignGate(root,{stage='build',brief}={}){
 brief??=readJson(resolve(root,'content/site.json'));
 const misuse=demoMisuse(brief);
 if(misuse.length)return {status:'FAIL',stage,errors:misuse};
 if(brief.isDemo)return {status:'SKIP',stage,errors:[],note:'Demo brief: the design gate applies to real (non-demo) builds.'};
 const errors=[];
 const contractFile=resolve(root,CONTRACT_PATH);
 const contract=existsSync(contractFile)?readFileSync(contractFile,'utf8'):'';
 errors.push(...validateContract(contract));
 const page=resolve(root,'app/page.jsx');
 if(existsSync(page)&&readFileSync(page,'utf8').includes(PAGE_PLACEHOLDER_MARK))errors.push('app/page.jsx is still the neutral starter placeholder; implement the contracted page');
 const gateFile=resolve(root,GATE_PATH);
 const gate=existsSync(gateFile)?readJson(gateFile):{};
 errors.push(...validateOfferReview(gate.offerReview));
 if(stage==='build'||stage==='owner-review'){
  const ctx={contractSha256:sha256(Buffer.from(contract)),brief,source:sourceFingerprint(root).sha256,briefSha256:briefFingerprint(root)};
  errors.push(...validateGateStage(root,gate.gate1,'Gate 1 (hero and first proof)',{...ctx,historic:true}));
  if(stage==='owner-review'){
   const inventory=experienceInventory(contract);
   errors.push(...inventory.errors.map(e=>`Gate 2 (full site): ${e}`));
   errors.push(...validateGateStage(root,gate.gate2,'Gate 2 (full site)',{...ctx,inventory:inventory.items}));
  }
 }
 return {status:errors.length?'FAIL':'PASS',stage,errors};
}
