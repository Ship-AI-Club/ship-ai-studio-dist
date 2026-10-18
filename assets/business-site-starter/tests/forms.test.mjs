import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';
import {fileURLToPath} from 'node:url';
import {safeFormAction} from '../lib/forms.mjs';

const root=fileURLToPath(new URL('..',import.meta.url));
const sources=dir=>readdirSync(dir).flatMap(n=>{const p=join(dir,n);return statSync(p).isDirectory()?sources(p):/\.(jsx|tsx|js|mjs|html)$/.test(n)?[p]:[];});

test('every visitor form goes through VisitorForm, which always posts',()=>{
 const raw=[...sources(join(root,'app')),...sources(join(root,'components'))].filter(p=>!p.endsWith('VisitorForm.jsx')&&/<form[\s>]/.test(readFileSync(p,'utf8'))).map(p=>relative(root,p));
 assert.deepEqual(raw,[],'use components/VisitorForm.jsx instead of a raw <form>');
 const component=readFileSync(join(root,'components/VisitorForm.jsx'),'utf8');
 assert.match(component,/method="post"/);assert.match(component,/disabled=\{inert\}/);assert.match(component,/reviewMode/);
 assert.match(readFileSync(join(root,'app/start/experience.jsx'),'utf8'),/<VisitorForm/);
});

test('form actions must be same-site paths or HTTPS',()=>{
 for(const ok of ['/start','/api/lead','https://forms.example.com/submit'])assert.equal(safeFormAction(ok),ok);
 for(const bad of ['','//evil.example','/\\evil','http://example.com','javascript:alert(1)','?q=1',null])assert.throws(()=>safeFormAction(bad));
});
