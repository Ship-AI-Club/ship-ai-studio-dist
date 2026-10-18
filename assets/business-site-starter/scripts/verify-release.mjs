import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {isReview,releaseErrors,briefMode} from '../lib/brief.mjs';
import {checkDesignGate,sourceFingerprint,briefFingerprint,GATE_PATH} from '../lib/design-gate.mjs';

// Hosting providers set these during deploy builds. A deploy build is treated as publication.
export const DEPLOY_ENV=['VERCEL','NETLIFY','CF_PAGES','RENDER','RAILWAY_ENVIRONMENT','AMPLIFY_APP_ID','GITHUB_PAGES'];
const filled=x=>typeof x==='string'&&x.trim().length>0;

export function publicationErrors(site,root){
 const errors=[...releaseErrors(site,'publication')];
 if(site.isDemo)return errors;
 const gate=checkDesignGate(root,{stage:'owner-review',brief:site});
 if(gate.status!=='PASS')errors.push(...gate.errors.map(e=>`Owner review is not complete: ${e}`));
 const state=existsSync(resolve(root,GATE_PATH))?JSON.parse(readFileSync(resolve(root,GATE_PATH),'utf8')):{};
 const approval=state.ownerApproval,source=sourceFingerprint(root).sha256,brief=briefFingerprint(root);
 const reviewed=(state.gate2?.rounds||[]).at(-1);
 if(!approval||!filled(approval.approvedBy)||!filled(approval.approvedAt)||!filled(approval.message))errors.push('Publication needs the owner\'s recorded approval of the reviewed site (design/gate.json ownerApproval: approvedBy, approvedAt, message, sourceSha256, briefSha256)');
 else{
  if(approval.sourceSha256!==source||approval.briefSha256!==brief)errors.push('The site source or brief changed after the owner approved it. Publication needs the exact reviewed and approved version');
  if(reviewed&&approval.sourceSha256!==reviewed.sourceSha256)errors.push('The owner approval must name the source of the final Gate 2 render');
 }
 return [...new Set(errors)];
}

export function checkRelease(site,target,env=process.env,root=process.cwd()){
 const host=DEPLOY_ENV.find(k=>env[k]);
 if(target==='build'){
  if(site.isDemo)return host?[`Refusing to build the demo brief in a deploy environment (${host}). Deployment needs a real brief in mode "production" with the final owner approvals`]:[];
  if(isReview(site))return host?[`Refusing to build a private review draft (mode "review") in a deploy environment (${host}). Deployment needs mode "production" and the final owner approvals`]:[];
  return host?publicationErrors(site,root):releaseErrors(site,'production');
 }
 if(target==='production')return releaseErrors(site,'production');
 if(target==='publication')return publicationErrors(site,root);
 return [`Unknown release target ${target}`];
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),at=args.indexOf('--target'),target=at>=0?args[at+1]:'publication';
 if(!['build','production','publication'].includes(target)){console.error('Use --target build, production or publication');process.exit(1);}
 const root=process.cwd();
 const site=JSON.parse(readFileSync(resolve(root,'content/site.json'),'utf8'));
 const errors=checkRelease(site,target,process.env,root);
 if(errors.length){console.error(`BLOCKED: ${target} (${briefMode(site)} brief).`);for(const e of errors)console.error(`• ${e}`);process.exit(1);}
 console.log(target==='build'?`Release guard passed (${briefMode(site)} brief${briefMode(site)==='production'?', final approvals recorded':', local build only'}).`:`PASS: ${target} approvals recorded${target==='publication'?' for the exact reviewed source':''}.`);
}
