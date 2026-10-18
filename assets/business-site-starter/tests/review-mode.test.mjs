import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBrief,releaseErrors,canIndex,metaRobots,robotsRules,priceLabel,marketingContext,demoMisuse} from '../lib/brief.mjs';
import {checkDesignGate} from '../lib/design-gate.mjs';
import {checkRelease} from '../scripts/verify-release.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const fixture=kind=>JSON.parse(readFileSync(resolve(root,`tests/fixtures/review-${kind}.json`),'utf8'));
const KINDS=['b2b','b2c'];

for(const kind of KINDS){
 test(`${kind} first-time draft with unapproved recommendations renders privately in review mode`,()=>{
  const p=fixture(kind);
  assert.equal(p.isDemo,false);assert.equal(p.mode,'review');
  assert.equal(p.intake.answers.length,3);assert.ok(p.intake.answers.every(a=>a.source==='owner'));
  for(const item of [p.positioning,p.product])assert.equal(item.status,'proposed');
  assert.deepEqual(validateBrief(p),[]);
  assert.equal(canIndex(p),false);
  assert.deepEqual(metaRobots(p),{index:false,follow:false});
  assert.deepEqual(robotsRules(p,'https://example.com/sitemap.xml'),{rules:{userAgent:'*',disallow:'/'}});
  assert.match(marketingContext(p),/Mode: review \(private review draft/);
 });

 test(`${kind} draft is blocked for production and publication, naming the missing approvals`,()=>{
  const p=fixture(kind);
  const production=validateBrief({...p,mode:'production'}).join('\n');
  assert.match(production,/missing final owner approval/);assert.match(production,/positioning, product scope, dated evidence sources/);
  for(const target of ['production','publication']){
   const errors=releaseErrors(p,target).join('\n');
   assert.match(errors,/positioning, product scope/);assert.match(errors,/private review draft/);
  }
  const publish=releaseErrors({...p,publicationApproved:true,siteUrl:'https://example.com'},'publication').join('\n');
  assert.match(publish,/positioning, product scope/);
  assert.match(validateBrief({...p,publicationApproved:true}).join('\n'),/Review mode is a private draft and cannot be published/);
  assert.match(releaseErrors(p,'publication').join('\n'),/publicationApproved true/);
 });

 test(`${kind} review build never mutates approval flags`,()=>{
  const p=fixture(kind),before=structuredClone(p);
  validateBrief(p);releaseErrors(p,'production');releaseErrors(p,'publication');checkRelease(p,'build',{});
  assert.deepEqual(p,before);
  const temp=mkdtempSync(resolve(tmpdir(),'review-mode-'));
  try{
   for(const dir of ['scripts','lib','content','brief'])mkdirSync(resolve(temp,dir),{recursive:true});
   cpSync(resolve(root,'scripts/configure.mjs'),resolve(temp,'scripts/configure.mjs'));cpSync(resolve(root,'lib/brief.mjs'),resolve(temp,'lib/brief.mjs'));
   cpSync(resolve(root,`tests/fixtures/review-${kind}.json`),resolve(temp,'brief/project.json'));
   const out=execFileSync(process.execPath,['scripts/configure.mjs'],{cwd:temp,encoding:'utf8'});
   assert.match(out,/Private review draft/);
   const site=JSON.parse(readFileSync(resolve(temp,'content/site.json'),'utf8'));
   assert.deepEqual(site,before);
   assert.equal(site.positioning.status,'proposed');assert.equal(site.product.status,'proposed');assert.equal(site.business.pricing.approved,false);assert.equal(site.publicationApproved,false);
  }finally{rmSync(temp,{recursive:true,force:true});}
 });
}

test('proposed pricing shows only as proposed in review and never as final',()=>{
 const b2b=fixture('b2b');
 assert.match(priceLabel(b2b),/proposed for your review, not final/);
 assert.equal(priceLabel({...b2b,mode:'production'}),null);
 assert.equal(priceLabel(fixture('b2c')),null);
 const unmarked=fixture('b2b');delete unmarked.business.pricing.status;
 assert.ok(validateBrief(unmarked).some(e=>e.includes('Visible pricing must be approved, or marked "proposed"')));
});

test('provisional items carry source and rationale and never an approval',()=>{
 const p=fixture('b2c');
 assert.ok(validateBrief({...p,positioning:{...p.positioning,approved:true}}).some(e=>e.includes('Proposed positioning must not carry an approval')));
 const noWhy=structuredClone(p);delete noWhy.product.rationale;
 assert.ok(validateBrief(noWhy).some(e=>e.includes('Proposed product scope needs its source and rationale')));
 assert.ok(validateBrief({...p,positioning:{...p.positioning,status:'draft'}}).some(e=>e.includes('mark positioning as "proposed"')));
 assert.ok(validateBrief({...p,intake:{answers:[],openQuestions:[]}}).some(e=>e.includes('record the owner\'s answers')));
 assert.ok(validateBrief({...p,mode:'preview'}).some(e=>e.includes('mode must be')));
});

test('isDemo cannot carry real owner facts to skip validation or the design gate',()=>{
 for(const kind of KINDS){
  const disguised={...fixture(kind),isDemo:true};
  assert.ok(validateBrief(disguised).some(e=>e.startsWith('isDemo is only for the fictional starter example')));
  delete disguised.mode;
  assert.ok(demoMisuse(disguised).some(e=>e.includes('owner answers')));
  const gate=checkDesignGate(root,{stage:'build',brief:disguised});
  assert.equal(gate.status,'FAIL');
  assert.ok(releaseErrors(disguised,'production').some(e=>e.includes('demo brief cannot be released')));
 }
 for(const kind of KINDS){
  const example=JSON.parse(readFileSync(resolve(root,`examples/${kind}.json`),'utf8'));
  assert.deepEqual(demoMisuse(example),[]);
 }
});

test('a review draft builds only locally; an unapproved production brief is rejected everywhere',()=>{
 const p=fixture('b2b');
 assert.match(checkRelease(p,'build',{VERCEL:'1'}).join(''),/Refusing to build a private review draft/);
 assert.match(checkRelease(p,'build',{NETLIFY:'true'}).join(''),/deploy environment/);
 assert.deepEqual(checkRelease(p,'build',{}),[]);
 for(const env of [{},{VERCEL:'1'}]){
  const errors=checkRelease({...p,mode:'production'},'build',env,root).join('\n');
  assert.match(errors,/Confirm positioning, product scope, dated evidence sources/,`unapproved production brief built with ${JSON.stringify(env)}`);
  assert.match(errors,/pricing/);
 }
 const approved=JSON.parse(readFileSync(resolve(root,'examples/b2b.json'),'utf8'));approved.isDemo=false;approved.mode='production';
 assert.deepEqual(checkRelease(approved,'build',{},root),[],'a production brief with final approvals builds locally');
 const deploy=checkRelease(approved,'build',{VERCEL:'1'},root).join('\n');
 assert.match(deploy,/publicationApproved true/);assert.match(deploy,/Owner review is not complete/);assert.match(deploy,/ownerApproval/);
 assert.match(checkRelease({...fixture('b2c'),isDemo:true,mode:undefined,intake:{answers:[],openQuestions:[]}},'build',{VERCEL:'1'},root).join(''),/demo brief in a deploy environment/);
 const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
 assert.match(pkg.scripts.prebuild,/verify:release/);assert.match(pkg.scripts['build:review'],/verify:release/);
 assert.match(pkg.scripts['verify:publish'],/--target publication/);
});

test('the rendered site wires noindex meta, robots and headers through the shared rules',()=>{
 assert.match(readFileSync(resolve(root,'app/layout.jsx'),'utf8'),/robots\}/);
 assert.match(readFileSync(resolve(root,'app/robots.js'),'utf8'),/robotsFile/);
 assert.match(readFileSync(resolve(root,'next.config.mjs'),'utf8'),/X-Robots-Tag[^]*noindex, nofollow/);
 assert.match(readFileSync(resolve(root,'components/Chrome.jsx'),'utf8'),/Private review draft/);
});
