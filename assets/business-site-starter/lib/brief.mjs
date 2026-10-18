export const ready=x=>x?.status==='approved';
// Approval evidence and release metadata: who approved and when, the brief revision, the owner intake, the
// build setup, the publication flag and the live address. None of them changes a rendered page. Status,
// approved, mode and every content field stay in, because ready(), priceLabel and the review chrome turn
// them into visible pages, labels and notes that must be reviewed.
const RELEASE_KEYS=new Set(['version','intake','setup','publicationApproved','siteUrl']);
const EVIDENCE_KEYS=new Set(['approvedBy','approvedAt']);
const canonical=(x,top)=>Array.isArray(x)?x.map(v=>canonical(v,false)):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().filter(k=>!EVIDENCE_KEYS.has(k)&&!(top&&RELEASE_KEYS.has(k))).map(k=>[k,canonical(x[k],false)])):x;
export const visitorContent=p=>canonical(p,true);
export const MODES=['review','production'];
// A non-demo brief without a mode keeps the strict 1.0.2 production rules.
export const briefMode=p=>p?.isDemo?'demo':p?.mode??'production';
export const isReview=p=>briefMode(p)==='review';
export const canIndex=p=>!p.isDemo&&!isReview(p)&&p.publicationApproved===true&&/^https:\/\//.test(p.siteUrl||'');
export const robotsRules=(p,sitemap)=>canIndex(p)?{rules:{userAgent:'*',allow:'/'},...(sitemap?{sitemap}:{})}:{rules:{userAgent:'*',disallow:'/'}};
export const metaRobots=p=>({index:canIndex(p),follow:canIndex(p)});
export function priceLabel(p){
 const x=p?.business?.pricing;
 if(!x?.display)return null;
 if(x.approved===true&&x.status!=='proposed')return x.display;
 return isReview(p)&&x.status==='proposed'?`${x.display} (proposed for your review, not final)`:null;
}
const provisionalItems=p=>[['positioning',p.positioning],['product scope',p.product],['pricing',p.business?.pricing],['About page',p.about],...(Array.isArray(p.articles)?p.articles:[]).map(x=>[`article ${x?.slug}`,x]),...(Array.isArray(p.solutions)?p.solutions:[]).map(x=>[`solution ${x?.slug}`,x])];
const ownerAnswer=a=>a&&typeof a==='object'&&a.source==='owner';
export function demoMisuse(p){
 if(!p?.isDemo)return [];
 const facts=[];
 if(p.mode!=null)facts.push('mode');
 if(p.publicationApproved===true)facts.push('publicationApproved');
 if(p.siteUrl)facts.push('siteUrl');
 if((p.intake?.answers||[]).some(ownerAnswer))facts.push('owner answers');
 return facts.length?[`isDemo is only for the fictional starter example; this brief has real owner facts (${facts.join(', ')}). Set isDemo false and use mode "review" for a private draft`]:[];
}
export function missingApprovals(p){
 const missing=[];
 if(!ready(p.positioning))missing.push('positioning');
 if(!ready(p.product))missing.push('product scope');
 if(p.business?.audienceType==='unsure')missing.push('buying context');
 if(!p.positioning?.sources?.length)missing.push('dated evidence sources');
 if(p.business?.pricing?.display&&(p.business.pricing.approved!==true||p.business.pricing.status==='proposed'))missing.push('pricing');
 return missing;
}
export function releaseErrors(p,target){
 if(!['production','publication'].includes(target))return [`Unknown release target ${target}`];
 const errors=[...validateBrief({...p,mode:'production'}).filter(e=>!e.startsWith('isDemo is only')).map(e=>isReview(p)?e.replace('. Use mode "review" for a private draft',''):e),...demoMisuse(p)];
 if(p.isDemo)errors.push(`The demo brief cannot be released for ${target}`);
 if(isReview(p))errors.push(`This brief is a private review draft (mode "review"). ${target==='publication'?'Publication':'A production release'} needs mode "production" and the final owner approvals`);
 if(target==='publication'){
  if(p.publicationApproved!==true)errors.push('Publication needs the owner\'s final publication approval (publicationApproved true)');
  if(!/^https:\/\//.test(p.siteUrl||''))errors.push('Publication needs the real HTTPS site address');
 }
 return [...new Set(errors)];
}
export const CLOUD_MODELS=['claude-sonnet-5-5','claude-opus-5-5'];
// 1.0.2 briefs saved setup.buildModel/effort with these short names; they still mean the site build.
const MODEL_IDS={'claude-sonnet-5-5':'claude-sonnet-5-5','claude-opus-5-5':'claude-opus-5-5','sonnet-5.5':'claude-sonnet-5-5','opus-5.5':'claude-opus-5-5'};
export function siteBuild(p){
 const s=p?.setup||{},model=s.siteBuildModel??s.buildModel??null;
 return {model:model==null?null:MODEL_IDS[model]??model,effort:s.siteBuildEffort??s.effort??null,fast:s.siteBuildFast??false};
}
export function validateBrief(p){
 if(!p||typeof p!=='object'||Array.isArray(p))return ['A project object is required'];
 const errors=[],text=(x,n)=>{if(typeof x!=='string'||!x.trim())errors.push(`${n} must be supplied`);};
 if(p.schemaVersion!==1)errors.push('schemaVersion must be 1');
 if(!Number.isInteger(p.version)||p.version<1)errors.push('version must be a positive integer');
 const s=p.setup||{},site=siteBuild(p);
 if(s.siteBuildModel!=null&&s.buildModel!=null&&MODEL_IDS[s.siteBuildModel]!==MODEL_IDS[s.buildModel])errors.push('Legacy setup.buildModel conflicts with setup.siteBuildModel');
 if(site.model!=null&&!CLOUD_MODELS.includes(site.model))errors.push('Choose Sonnet 5.5 or Opus 5.5 for the build');
 if(site.effort!=null&&site.effort!=='medium')errors.push('The selected build effort must be medium');
 if(site.model&&site.effort!=='medium')errors.push('Save medium effort with the build model');
 if(s.siteBuildFast!=null&&s.siteBuildFast!==false)errors.push('Fast mode stays off for the site build');
 if(s.creativeBuildModel!=null&&!CLOUD_MODELS.includes(s.creativeBuildModel))errors.push('Creative build model must be claude-sonnet-5-5 or claude-opus-5-5');
 if(s.creativeBuildEffort!=null&&s.creativeBuildEffort!=='medium')errors.push('The creative build effort must be medium');
 if(typeof p.isDemo!=='boolean'||typeof p.publicationApproved!=='boolean')errors.push('Demo and publication flags must be booleans');
 if(!['b2b','b2c','mixed','unsure'].includes(p.business?.audienceType))errors.push('Choose b2b, b2c, mixed or unsure');
 for(const k of ['name','description','customer','offer'])text(p.business?.[k],`business.${k}`);
 if(!['waitlist','assessment','report','case-study','quote','booking','purchase','signup'].includes(p.product?.journey))errors.push('Choose a supported visitor journey');
 for(const k of ['label','href'])text(p.product?.primaryAction?.[k],`product.primaryAction.${k}`);
 const href=p.product?.primaryAction?.href||'';if(!/^\/(?!\/)/.test(href)&&!/^https:\/\//.test(href))errors.push('Primary action must use a local path or HTTPS');
 for(const k of ['accent','ink','paper'])if(!/^#[0-9a-f]{6}$/i.test(p.brand?.[k]||''))errors.push(`brand.${k} needs a six-digit hex color`);
 for(const k of ['headline','summary'])text(p.positioning?.[k],`positioning.${k}`);
 if(p.mode!=null&&!MODES.includes(p.mode))errors.push('mode must be "review" (private owner draft) or "production"');
 errors.push(...demoMisuse(p));
 for(const [name,x] of provisionalItems(p))if(x?.status==='proposed'){
  if(typeof x.source!=='string'||!x.source.trim()||typeof x.rationale!=='string'||!x.rationale.trim())errors.push(`Proposed ${name} needs its source and rationale`);
  if(x.approved===true||x.approvedBy!=null||x.approvedAt!=null)errors.push(`Proposed ${name} must not carry an approval; only the owner approves it`);
 }
 if(briefMode(p)==='production'){const missing=missingApprovals(p);if(missing.length)errors.push(`Confirm ${missing.join(', ')} before a production build (missing final owner approval). Use mode "review" for a private draft`);}
 if(isReview(p)){
  for(const [name,x] of [['positioning',p.positioning],['product scope',p.product]])if(!['approved','proposed'].includes(x?.status))errors.push(`Review mode: mark ${name} as "proposed" with its source and rationale, or record the owner's approval`);
  if(!(p.intake?.answers||[]).some(a=>ownerAnswer(a)&&typeof a.answer==='string'&&a.answer.trim()))errors.push('Review mode builds from owner facts: record the owner\'s answers in intake.answers with source "owner"');
  if(p.publicationApproved===true)errors.push('Review mode is a private draft and cannot be published; publication needs mode "production" and the final owner approvals');
 }
 for(const s of p.positioning?.sources||[])if(!s.id||!s.title||!s.date||!/^https:\/\//.test(s.url||''))errors.push('Each source needs id, title, date and HTTPS URL');
 if(ready(p.about)){text(p.about.headline,'about.headline');if(!Array.isArray(p.about.body)||!p.about.body.length)errors.push('Approved About needs verified body copy');for(const b of p.about.body||[])text(b,'about.body');for(const f of p.about.facts||[]){text(f.heading,'about fact heading');text(f.body,'about fact body');}}
 const ids=new Set((p.positioning?.sources||[]).map(x=>x.id));
 for(const c of ['articles','solutions']){if(!Array.isArray(p[c])){errors.push(`${c} must be an array`);continue;}const slugs=new Set();for(const x of p[c]){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug||'')||slugs.has(x.slug))errors.push(`${c}: invalid or duplicate slug`);slugs.add(x.slug);if(!ready(x))continue;for(const k of ['title','description'])text(x[k],`${x.slug}.${k}`);if(!Array.isArray(x.sections)||x.sections.length<2)errors.push(`${x.slug}: add two useful sections`);for(const s of x.sections||[]){text(s.heading,'section heading');text(s.body,'section body');}if(!x.sourceIds?.length||x.sourceIds.some(id=>!ids.has(id)))errors.push(`${x.slug}: cite real source IDs`);if(c==='articles'&&(!x.author||!/^\d{4}-\d{2}-\d{2}$/.test(x.updatedAt||'')))errors.push(`${x.slug}: actual author and review date needed`);if(c==='solutions'&&!x.uniqueValue?.trim())errors.push(`${x.slug}: distinct value needed`);}}
 const price=p.business?.pricing;
 if(price?.display&&!(price.approved===true&&price.status!=='proposed')&&!(isReview(p)&&price.status==='proposed'))errors.push(isReview(p)?'Visible pricing must be approved, or marked "proposed" with its source and rationale so it shows as proposed for review':'Visible pricing must be approved');
 if(p.publicationApproved&&(!/^https:\/\//.test(p.siteUrl||'')||p.isDemo))errors.push('Publication needs a real HTTPS domain and non-demo brief');
 return errors;
}
export function marketingContext(p){return `# Product marketing context\n\nVersion: ${p.version}\nMode: ${briefMode(p)}${isReview(p)?' (private review draft; proposed items are recommendations, not approvals)':''}\nBusiness: ${p.business.name}\nBuying context: ${p.business.audienceType}\nCustomer: ${p.business.customer}\nOffer: ${p.business.offer}\nPricing model: ${p.business.pricing.model}\nPromise: ${p.positioning.headline} [${p.positioning.status}]\nPositioning: ${p.positioning.summary}\nDifference: ${p.positioning.difference||'Not confirmed'}\nJourney: ${p.product.journey} [${p.product.status}]\nAction: ${p.product.primaryAction.label}\nScope: ${(p.product.acceptance||[]).join('; ')}\n\n## Sources\n${p.positioning.sources.map(s=>`- ${s.id}: ${s.title} (${s.date}) ${s.url}`).join('\n')}\n\n## Open questions\n${p.intake.openQuestions.map(x=>`- ${x}`).join('\n')||'None recorded'}\n`;}
