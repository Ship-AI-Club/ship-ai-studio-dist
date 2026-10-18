import {site,pageMeta} from '../lib/site';
export const metadata=pageMeta(site.business.name,site.business.description,'/');
export default function Home(){return <section className="placeholder" data-starter-placeholder><p>Starter placeholder</p><h1>No home page design yet</h1><p>This page is intentionally plain. Replace it with components written for the approved design contract.</p></section>}
