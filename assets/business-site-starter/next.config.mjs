import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {canIndex} from './lib/brief.mjs';
const site=JSON.parse(readFileSync(new URL('./content/site.json',import.meta.url),'utf8'));
const headers=async()=>canIndex(site)?[]:[{source:'/:path*',headers:[{key:'X-Robots-Tag',value:'noindex, nofollow'}]}];
export default {poweredByHeader:false,headers,turbopack:{root:fileURLToPath(new URL('.',import.meta.url))}};
