from pathlib import Path
import re
ROOT=Path(__file__).resolve().parents[1]
WEB=ROOT/'web'

def match_paren(src,open_pos):
    depth=0; quote=None; esc=False; line_comment=False; block_comment=False; i=open_pos
    while i<len(src):
        c=src[i]; n=src[i+1] if i+1<len(src) else ''
        if line_comment:
            if c=='\n': line_comment=False
        elif block_comment:
            if c=='*' and n=='/': block_comment=False; i+=1
        elif quote:
            if esc: esc=False
            elif c=='\\': esc=True
            elif c==quote: quote=None
        else:
            if c=='/' and n=='/': line_comment=True; i+=1
            elif c=='/' and n=='*': block_comment=True; i+=1
            elif c in "'\"`": quote=c
            elif c=='(': depth+=1
            elif c==')':
                depth-=1
                if depth==0:return i
        i+=1
    raise ValueError('unclosed parenthesis')

def replace_global_observers(src,filename):
    token='new MutationObserver('; pos=0; out=''; changed=0
    while True:
        start=src.find(token,pos)
        if start<0: out+=src[pos:]; break
        open_pos=start+len('new MutationObserver')
        try: close_ctor=match_paren(src,open_pos)
        except Exception: out+=src[pos:]; break
        j=close_ctor+1
        while j<len(src) and src[j].isspace():j+=1
        if not src.startswith('.observe(',j):
            out+=src[pos:close_ctor+1];pos=close_ctor+1;continue
        open_obs=j+len('.observe')
        try: close_obs=match_paren(src,open_obs)
        except Exception: out+=src[pos:close_ctor+1];pos=close_ctor+1;continue
        observe_args=src[open_obs+1:close_obs]
        normalized=re.sub(r'\s+','',observe_args)
        if ('document.documentElement' not in observe_args and 'document.body' not in observe_args) or 'subtree:true' not in normalized:
            out+=src[pos:close_obs+1];pos=close_obs+1;continue
        callback=src[open_pos+1:close_ctor].strip()
        repl="""(()=>{const cb=%s;const bus=window.__ABU_RUNTIME_REFRESH_BUS__||(window.__ABU_RUNTIME_REFRESH_BUS__=(()=>{const callbacks=new Set();let timer=0;const run=()=>{timer=0;for(const fn of [...callbacks]){try{fn([],null)}catch(e){console.warn('runtime refresh failed',e)}}};const schedule=()=>{if(timer)return;timer=setTimeout(run,40)};window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},{passive:true});document.addEventListener('abu-bassam-section-opened',schedule,{passive:true});document.addEventListener('abu-bassam-settings-opened',schedule,{passive:true});document.addEventListener('abu-bassam-auth-changed',schedule,{passive:true});[120,500,1500].forEach(ms=>setTimeout(schedule,ms));return{add(fn){callbacks.add(fn);schedule()},remove(fn){callbacks.delete(fn)}}})());bus.add(cb);return{disconnect(){bus.remove(cb)},observe(){},takeRecords(){return[]}}})()"""%callback
        out+=src[pos:start]+repl;pos=close_obs+1;changed+=1
    return out,changed

changed_files=[];total=0
for path in sorted(WEB.iterdir()):
    if path.suffix not in {'.js','.html'}:continue
    src=path.read_text(encoding='utf-8',errors='strict')
    new,count=replace_global_observers(src,path.name)
    if count:
        path.write_text(new,encoding='utf-8');changed_files.append(path.name);total+=count

# Remove all deleted Questions/Compressor navigation branches from the national tabs.
p=WEB/'national-id-runtime.js';s=p.read_text(encoding='utf-8')
s=s.replace("$('tabQuestions').onclick=()=>switchTab('questions');$('tabCompressor').onclick=()=>switchTab('compressor');",'')
s,n=re.subn(r"function switchTab\(mode\)\{[\s\S]*?\}\nfunction fileData","function switchTab(mode){let nat=mode==='national',cards=mode==='cards',vault=mode==='vault',photos=!nat&&!cards&&!vault;$('tabNational').classList.toggle('active',nat);$('tabCards').classList.toggle('active',cards);$('tabVault').classList.toggle('active',vault);$('tabPhotos').classList.toggle('active',photos);q('.app .panel').classList.toggle('abu-tab-off',!photos);let p=q('.app .preview');if(p)p.classList.toggle('abu-tab-off',!photos);$('nationalCenter').classList.toggle('nat-show',nat);let cc=$('cardsCenter');if(cc)cc.classList.toggle('cards-show',cards);let vc=$('vaultCenter');if(vc)vc.classList.toggle('vault-show',vault);if(nat){let frame=$('residenceFrame');if(frame&&frame.contentWindow)frame.contentWindow.postMessage({type:'abuBassamTabVisible'},'*')}if(cards&&window.CardsStudio?.onShow)CardsStudio.onShow();if(vault&&window.DocumentVault?.onShow)DocumentVault.onShow();document.dispatchEvent(new CustomEvent('abu-bassam-section-opened',{detail:{section:mode}}))}\nfunction fileData",s,count=1)
if n!=1:raise SystemExit(f'national switchTab cleanup expected 1 match, got {n}')
p.write_text(s,encoding='utf-8')

# Settings opening is an explicit refresh signal; no DOM watcher is needed.
p=WEB/'index.html';s=p.read_text(encoding='utf-8')
if "abu-bassam-settings-opened" not in s:
    s=s.replace("function openSettings(){", "function openSettings(){document.dispatchEvent(new CustomEvent('abu-bassam-settings-opened'));",1)
p.write_text(s,encoding='utf-8')

print(f'Converted {total} document-wide MutationObserver instance(s) across {len(changed_files)} files')
print('Files: '+', '.join(changed_files))
