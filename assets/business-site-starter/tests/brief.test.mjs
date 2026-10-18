import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {validateBrief,canIndex,ready,marketingContext} from '../lib/brief.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
for(const kind of ['b2b','b2c'])test(`${kind} preserves context and action`,()=>{const p=read(`../examples/${kind}.json`);assert.deepEqual(validateBrief(p),[]);assert.match(marketingContext(p),new RegExp(`Buying context: ${kind}`));assert.equal(canIndex(p),false);assert.equal(p.product.journey,kind==='b2b'?'assessment':'quote');});
test('real unapproved scope fails',()=>{const p=read('../examples/b2b.json');p.isDemo=false;p.positioning.status='draft';assert.ok(validateBrief(p).some(x=>x.includes('Confirm positioning')));});
test('drafts remain gated',()=>{assert.equal(ready({status:'draft'}),false);assert.equal(ready({status:'approved'}),true);});
test('missing source fails',()=>{const p=read('../examples/b2b.json');p.articles[0].sourceIds=['invented'];assert.ok(validateBrief(p).some(x=>x.includes('source IDs')));});
test('duplicate and unsafe slugs fail',()=>{const p=read('../examples/b2b.json');p.articles.push({...p.articles[0]});assert.ok(validateBrief(p).some(x=>x.includes('duplicate slug')));p.articles[0].slug='../escape';assert.ok(validateBrief(p).some(x=>x.includes('invalid')));});
test('programmatic page needs distinct value',()=>{const p=read('../examples/b2b.json');p.solutions[0].uniqueValue='';assert.ok(validateBrief(p).some(x=>x.includes('distinct value')));});
test('unsafe CTA and unapproved price fail',()=>{const p=read('../examples/b2c.json');p.product.primaryAction.href='javascript:alert(1)';p.business.pricing.display='$99';assert.ok(validateBrief(p).some(x=>x.includes('HTTPS')));assert.ok(validateBrief(p).some(x=>x.includes('pricing')));});
test('indexing requires real approved domain',()=>{const p=read('../examples/b2b.json');p.publicationApproved=true;p.siteUrl='https://example.com';assert.equal(canIndex(p),false);p.isDemo=false;assert.equal(canIndex(p),true);});

test('approved About needs verified copy',()=>{const p=read('../examples/b2b.json');p.about.body=[];assert.ok(validateBrief(p).some(x=>x.includes('About')));});
test('non-object input is rejected clearly',()=>{assert.deepEqual(validateBrief(null),['A project object is required']);});
