import fs from 'node:fs/promises';import path from 'node:path';import {validateBrief,marketingContext,isReview} from '../lib/brief.mjs';
const a=process.argv.slice(2),i=a.indexOf('--brief');if(i>=0&&!a[i+1])throw new Error('Supply a JSON path after --brief');
const input=path.resolve(i>=0?a[i+1]:'brief/project.json'),p=JSON.parse(await fs.readFile(input,'utf8')),errors=validateBrief(p);
if(errors.length){console.error(errors.map(x=>`• ${x}`).join('\n'));process.exit(1);}
if(a.includes('--check')){console.log('Brief contract passed.');process.exit(0);}
await fs.mkdir('.agents',{recursive:true});await fs.writeFile('content/site.json',JSON.stringify(p,null,2)+'\n');await fs.writeFile('.agents/product-marketing.md',marketingContext(p));
if(input!==path.resolve('brief/project.json'))await fs.writeFile('brief/project.json',JSON.stringify(p,null,2)+'\n');
console.log(`Configured ${p.business.name}: ${p.business.audienceType} · ${p.product.journey}. ${isReview(p)?'Private review draft: noindex, deployment blocked; proposed items stay proposed.':p.publicationApproved?'Publication approved in brief; deployment is separate.':'Preview remains unindexed.'}`);
