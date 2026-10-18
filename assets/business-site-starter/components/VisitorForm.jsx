'use client';
import {useEffect,useState} from 'react';
import {reviewMode} from '../lib/site';
import {safeFormAction} from '../lib/forms.mjs';

// Every visitor form goes through this component so answers never reach a URL.
// Local-only forms (no action) stay inert until JavaScript runs, so there is no
// browser fallback submit. Sending forms always POST to a safe action, and in a
// private review draft they never send anything.
export default function VisitorForm({action,onSubmit,children,className}){
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>setHydrated(true),[]);
 const sends=action!=null;
 const blocked=sends&&reviewMode;
 const inert=blocked||(!sends&&!hydrated);
 const submit=e=>{if(!sends||inert)e.preventDefault();if(!inert)onSubmit?.(e);};
 return <form className={className} method="post" action={sends&&!blocked?safeFormAction(action):undefined} onSubmit={submit} data-visitor-form={sends?'sends':'local'}>
  {blocked&&<p className="preview-note" role="note">Preview only. This form does not send anything in the private review draft.</p>}
  {!sends&&<noscript><p className="preview-note">This interaction needs JavaScript. Nothing you enter is sent.</p></noscript>}
  <fieldset className="form-body" disabled={inert}>{children}</fieldset>
 </form>;
}
