import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {checkDesignGate,sourceFingerprint,briefFingerprint} from '../lib/design-gate.mjs';

const args=process.argv.slice(2),at=args.indexOf('--stage');
if(args.includes('--fingerprint')){const src=sourceFingerprint(process.cwd());console.log(JSON.stringify({sourceSha256:src.sha256,briefSha256:briefFingerprint(process.cwd()),sourceFiles:src.files},null,2));process.exit(0);}
const stage=at>=0?args[at+1]:'build';
if(!['render','build','owner-review'].includes(stage)){console.error('Use --stage render, build or owner-review');process.exit(1);}
const root=process.cwd();
const report={...checkDesignGate(root,{stage}),scope:'Gate PASS requires recorded reviewer verdicts on actual screenshots. Tests, read logs and file hashes cannot pass it.'};
await mkdir(resolve(root,'evidence'),{recursive:true});
await writeFile(resolve(root,`evidence/design-gate-${stage}.json`),JSON.stringify(report,null,2)+'\n');
if(report.status==='SKIP')console.log(`SKIP: ${report.note}`);
else console.log(`${report.status}: design gate (${stage}).`);
for(const e of report.errors)console.error(`• ${e}`);
if(report.status==='FAIL')process.exitCode=1;
