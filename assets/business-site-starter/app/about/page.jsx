import {notFound} from 'next/navigation';import {site,aboutReady,pageMeta} from '../../lib/site';
export const metadata=pageMeta(`About ${site.business.name}`,site.business.description,'/about',aboutReady);
export default function About(){if(!aboutReady)notFound();return <article className="prose"><p className="eyebrow">About {site.business.name}</p><h1>{site.about.headline}</h1>{site.about.body.map((p,i)=><p key={i}>{p}</p>)}{site.about.facts.map((x,i)=><section key={i}><h2>{x.heading}</h2><p>{x.body}</p></section>)}</article>}
