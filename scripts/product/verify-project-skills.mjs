import {createHash} from 'node:crypto';
import {readFile,realpath,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,isAbsolute} from 'node:path';

const root=await realpath(process.cwd());
const manifest=JSON.parse(await readFile(resolve(root,'.agents/studio-skills.json'),'utf8'));
const errors=[],seen=new Set();let checked=0;
if(!manifest.expectedSkills?.length||manifest.expectedSkills.length!==manifest.skillCount)errors.push(`Expected the complete ${manifest.skillCount}-skill Studio library.`);
for(const f of manifest.files||[]){
 try{
  if(typeof f.path!=='string'||!f.path.startsWith('.agents/skills/')||isAbsolute(f.path)||seen.has(f.path))throw Error('Invalid or duplicate skill path');
  seen.add(f.path);const path=await realpath(resolve(root,f.path));const rel=relative(root,path);
  if(rel==='..'||rel.startsWith('../')||isAbsolute(rel))throw Error('Path escapes project');
  const bytes=await readFile(path);
  if(bytes.length!==f.bytes||createHash('sha256').update(bytes).digest('hex')!==f.sha256)throw Error('File integrity mismatch');checked++;
 }catch(e){errors.push(`${f.path}: ${e.message}`);}
}
for(const name of manifest.expectedSkills||[])if(!seen.has(`.agents/skills/${name}/SKILL.md`))errors.push(`Missing skill entry: ${name}`);
const report={status:errors.length?'FAIL':'PASS',version:manifest.version,skillCount:manifest.expectedSkills?.length,checkedFiles:checked,errors,scope:'File integrity only; not proof of reading or visual quality.'};
await mkdir(resolve(root,'evidence'),{recursive:true});await writeFile(resolve(root,'evidence/studio-skills.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(errors.length)process.exitCode=1;
