export function safeFormAction(action){
 if(typeof action!=='string')throw new Error('A form action must be a string');
 if(/^\/(?![/\\])/.test(action)||/^https:\/\//.test(action))return action;
 throw new Error(`Unsafe form action "${action}": use a same-site path or an HTTPS URL`);
}
