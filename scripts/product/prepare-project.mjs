import {cp, mkdir, readdir, readFile, writeFile} from 'node:fs/promises';
import {statSync,readFileSync} from 'node:fs';
import {resolve, relative, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildCatalog,sha256,walk} from '../lib/catalog.mjs';

const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const at=process.argv.indexOf('--target');
if(at<0||!process.argv[at+1])throw Error('Supply --target with a new project folder.');
const target=resolve(process.argv[at+1]);
const rel=relative(root,target);
if(rel===''||(!rel.startsWith('..')&&!isAbsolute(rel)))throw Error('Target must be outside this plugin.');
// Integrity audit against the shipped catalog: every skill tree and every listed file must match.
function auditStudio(){
 const catalog=JSON.parse(readFileSync(resolve(root,'catalog.json'),'utf8')),fresh=buildCatalog(root),errors=[];
 const key=(list,k)=>new Map(list.map(x=>[x[k],x]));
 const cs=key(catalog.skills,'name'),fs=key(fresh.skills,'name'),cf=key(catalog.files,'path'),ff=key(fresh.files,'path');
 for(const [n,s] of fs)if(cs.get(n)?.sha256!==s.sha256)errors.push(`skill ${n} differs from catalog.json`);
 for(const n of cs.keys())if(!fs.has(n))errors.push(`skill ${n} is missing`);
 for(const [p,x] of ff)if(cf.get(p)?.sha256!==x.sha256)errors.push(`file ${p} differs from catalog.json`);
 for(const p of cf.keys())if(!ff.has(p))errors.push(`file ${p} is missing`);
 return {status:errors.length?'FAIL':'PASS',plugin:catalog.name,release:catalog.release,skills:fresh.skills.length,files:fresh.files.length,errors,scope:'File integrity against catalog.json'};
}
const audit=auditStudio();if(audit.status!=='PASS')throw Error(`Studio audit failed: ${audit.errors.join('; ')}`);
try{const existing=await readdir(target);if(existing.length)throw Error('Target contains files. No source was changed.');}catch(e){if(e.code!=='ENOENT')throw e;}
await mkdir(target,{recursive:true});
for(const name of await readdir(resolve(root,'assets/business-site-starter'))){
 if(name==='node_modules'||name==='.next')continue;
 await cp(resolve(root,'assets/business-site-starter',name),resolve(target,name),{recursive:true,errorOnExist:true,force:false});
}
await cp(resolve(root,'skills'),resolve(target,'.agents/skills'),{recursive:true,errorOnExist:true,force:false});
await cp(resolve(root,'roles/role-map.json'),resolve(target,'.agents/role-map.json'));
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md','PROVENANCE.md','licenses'])await cp(resolve(root,name),resolve(target,'.agents',name),{recursive:true,errorOnExist:true,force:false});
const catalog=JSON.parse(await readFile(resolve(root,'catalog.json'),'utf8'));
const expectedSkills=catalog.skills.map(s=>s.name);
const manifest={plugin:catalog.name,version:catalog.release,skillCount:expectedSkills.length,expectedSkills,files:walk(resolve(root,'skills')).map(f=>({path:`.agents/${relative(root,f).split('\\').join('/')}`,sha256:sha256(readFileSync(f)),bytes:statSync(f).size}))};
await writeFile(resolve(target,'.agents/studio-skills.json'),JSON.stringify(manifest,null,2)+'\n');
await cp(resolve(root,'scripts/product/verify-project-skills.mjs'),resolve(target,'scripts/product/verify-project-skills.mjs'));
const pkg=JSON.parse(await readFile(resolve(target,'package.json'),'utf8'));
pkg.scripts['verify:skills']='node scripts/product/verify-project-skills.mjs';
pkg.scripts.check='npm run verify:skills && '+pkg.scripts.check;
pkg.scripts.prebuild='npm run verify:skills && '+pkg.scripts.prebuild;
pkg.scripts['build:review']='npm run verify:skills && '+pkg.scripts['build:review'];
await writeFile(resolve(target,'package.json'),JSON.stringify(pkg,null,2)+'\n');
await mkdir(resolve(target,'evidence'),{recursive:true});
await writeFile(resolve(target,'evidence/plugin-source.json'),JSON.stringify({...audit,pluginManifestSha256:createHash('sha256').update(await readFile(resolve(root,'plugin.json'))).digest('hex'),catalogSha256:createHash('sha256').update(await readFile(resolve(root,'catalog.json'))).digest('hex')},null,2)+'\n');
console.log(`Prepared ${target}. All ${expectedSkills.length} Studio skills copied. No model run or deployment started.`);
