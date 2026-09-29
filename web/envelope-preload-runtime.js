(()=>{
'use strict';
const KEY='abuEnvelopeStudioV1',CUSTOM_KEY='abuEnvelopeCustomTemplatesV1';
function clean(html){return String(html||'').replace(/\sdata-bound=(?:"1"|'1'|1)/g,'').replace(/\sdata-envelope-rebound=(?:"1"|'1'|1)/g,'').replace(/\sselected(?=[\s>])/g,'')}
try{
  const raw=localStorage.getItem(KEY);
  if(raw){
    const state=JSON.parse(raw);
    if(state&&typeof state==='object'){
      let changed=false;
      if(state.templateId==='env-10'){state.templateId='env-1';changed=true}
      if(typeof state.html==='string'){
        const html=clean(state.html);
        if(html!==state.html){state.html=html;changed=true}
      }
      if(changed)localStorage.setItem(KEY,JSON.stringify(state));
    }
  }
  let list=[];
  try{list=JSON.parse(localStorage.getItem(CUSTOM_KEY)||'[]')||[]}catch(e){}
  if(!Array.isArray(list))list=[];
  // env-10 was an obsolete preload from an older build. The approved envelope
  // catalog contains env-1..env-9 only, so remove the legacy injected entry
  // without touching user-created templates.
  const migrated=list.filter(item=>!(item&&item.id==='env-10'));
  if(migrated.length!==list.length)localStorage.setItem(CUSTOM_KEY,JSON.stringify(migrated.slice(-30)));
}catch(e){}
})();