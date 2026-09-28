(()=>{
'use strict';
if(window.__ABU_CARD_MODELS_V1__)return;
window.__ABU_CARD_MODELS_V1__=true;
const STORE='abuBassamCardModelsV1';
const MODELS={
 personal:['personal-1','personal-2','personal-3','personal-4','personal-5'],
 login:['login-1','login-2','login-3','login-4','login-5','login-6','login-7','login-8','login-9','login-10'],
 wifi:['wifi-1','wifi-2','wifi-3'],
 qr:['qr-1','qr-2','qr-3','qr-4']
};
const DEFAULTS={personal:'personal-1',login:'login-1',wifi:'wifi-1',qr:'qr-1'};
function read(){try{return Object.assign({},DEFAULTS,JSON.parse(localStorage.getItem(STORE)||'{}'))}catch(e){return Object.assign({},DEFAULTS)}}
let selected=read();
function save(){try{localStorage.setItem(STORE,JSON.stringify(selected))}catch(e){}}
function valid(type,id){return !!MODELS[type]?.includes(id)}
function current(type){return valid(type,selected[type])?selected[type]:DEFAULTS[type]||''}
function cssPersonal(id){
 if(id==='personal-2')return `
[data-type="personal"].cs-personal-front .cs-photo-frame{left:auto!important;right:5%!important;top:17%!important;width:29%!important;height:62%!important;border-radius:12%!important}
[data-type="personal"].cs-personal-front .cs-personal-brand{right:39%!important;left:5%!important;top:7%!important;height:31%!important;align-items:flex-start!important;text-align:right!important}
[data-type="personal"].cs-personal-front .cs-personal-front-name{right:39%!important;left:5%!important;top:43%!important;text-align:right!important}
[data-type="personal"].cs-personal-front .cs-personal-title{right:36%!important;left:0!important;bottom:7%!important;height:23%!important;border-radius:0 14% 14% 0!important}
[data-type="personal"].cs-personal-front .cs-personal-top-corner{left:0!important;right:auto!important;width:9%!important;height:100%!important;clip-path:none!important}
[data-type="personal"].cs-personal-back .cs-qr-box{left:auto!important;right:5%!important;top:18%!important;width:28%!important}
[data-type="personal"].cs-personal-back .cs-qr-caption{left:auto!important;right:5%!important;top:63%!important;width:28%!important}
[data-type="personal"].cs-personal-back .cs-info{right:38%!important;left:5%!important;top:18%!important;bottom:18%!important}
`;
 if(id==='personal-3')return `
[data-type="personal"].cs-personal-front .cs-photo-frame{left:36%!important;right:36%!important;top:17%!important;width:28%!important;height:48%!important;border-radius:50%!important}
[data-type="personal"].cs-personal-front .cs-personal-brand{right:5%!important;left:5%!important;top:3%!important;height:15%!important;flex-direction:row!important}
[data-type="personal"].cs-personal-front .cs-personal-brand img{width:12%!important;height:90%!important}
[data-type="personal"].cs-personal-front .cs-personal-front-name{right:12%!important;left:12%!important;top:68%!important;text-align:center!important}
[data-type="personal"].cs-personal-front .cs-personal-title{right:20%!important;left:20%!important;bottom:2%!important;height:18%!important;border-radius:16px!important}
[data-type="personal"].cs-personal-front .cs-personal-top-corner{display:none!important}
[data-type="personal"].cs-personal-back .cs-back-title{right:32%!important;left:32%!important}
[data-type="personal"].cs-personal-back .cs-qr-box{left:35%!important;top:18%!important;width:30%!important}
[data-type="personal"].cs-personal-back .cs-qr-caption{left:35%!important;top:64%!important;width:30%!important}
[data-type="personal"].cs-personal-back .cs-info{right:8%!important;left:8%!important;top:78%!important;bottom:4%!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:2%!important}
[data-type="personal"].cs-personal-back .cs-info .cs-row{display:block!important;text-align:center!important;padding:2%!important}
`;
 if(id==='personal-4')return `
[data-type="personal"].cs-personal-front:after{left:0!important;top:0!important;width:42%!important;height:100%!important;border:0!important;border-radius:0!important;transform:none!important;box-shadow:none!important;background:#075b4d!important}
[data-type="personal"].cs-personal-front .cs-photo-frame{left:5%!important;top:12%!important;width:32%!important;height:64%!important;border-radius:10%!important}
[data-type="personal"].cs-personal-front .cs-personal-brand{right:44%!important;left:4%!important;top:7%!important;height:34%!important}
[data-type="personal"].cs-personal-front .cs-personal-front-name{right:44%!important;left:4%!important;top:47%!important}
[data-type="personal"].cs-personal-front .cs-personal-title{right:44%!important;left:4%!important;bottom:8%!important;height:24%!important;border-radius:12px!important}
[data-type="personal"].cs-personal-front .cs-personal-top-corner{display:none!important}
[data-type="personal"].cs-personal-back .cs-qr-box{left:5%!important;top:20%!important;width:36%!important}
[data-type="personal"].cs-personal-back .cs-qr-caption{left:5%!important;top:72%!important;width:36%!important}
[data-type="personal"].cs-personal-back .cs-info{right:45%!important;left:5%!important;top:20%!important;bottom:14%!important}
`;
 if(id==='personal-5')return `
[data-type="personal"].cs-personal-front .cs-photo-frame{left:6%!important;top:26%!important;width:28%!important;height:55%!important;border-radius:18% 50% 18% 50%!important;transform:rotate(-4deg)!important}
[data-type="personal"].cs-personal-front .cs-personal-brand{right:6%!important;left:38%!important;top:5%!important;height:28%!important;align-items:flex-start!important;text-align:right!important}
[data-type="personal"].cs-personal-front .cs-personal-front-name{right:39%!important;left:5%!important;top:45%!important;text-align:right!important}
[data-type="personal"].cs-personal-front .cs-personal-title{right:32%!important;left:-5%!important;bottom:5%!important;height:25%!important;clip-path:polygon(8% 0,100% 0,92% 100%,0 100%)!important;border-radius:0!important}
[data-type="personal"].cs-personal-front .cs-personal-top-corner{left:auto!important;right:0!important;width:28%!important;height:12%!important;clip-path:polygon(0 0,100% 0,100% 100%,18% 100%)!important}
[data-type="personal"].cs-personal-back .cs-qr-box{left:6%!important;top:32%!important;width:26%!important;transform:rotate(3deg)!important}
[data-type="personal"].cs-personal-back .cs-qr-caption{left:6%!important;top:73%!important;width:26%!important}
[data-type="personal"].cs-personal-back .cs-info{right:7%!important;left:37%!important;top:20%!important;bottom:16%!important;border-right:3px solid #d9ad52!important;padding-right:3%!important}
`;
 return '';
}
function cssLogin(id){
 const n=Number(String(id).split('-')[1]||1);if(n===1)return '';
 const map={
 2:`[data-type="login"].cs-login-front .cs-login-services{left:auto!important;right:6%!important;width:30%!important}[data-type="login"].cs-login-front .cs-login-panel{right:40%!important;left:6%!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:auto!important;right:6%!important}[data-type="login"].cs-login-back-ref .cs-info{right:6%!important;left:41%!important}`,
 3:`[data-type="login"].cs-login-front .cs-login-brand{right:10%!important;left:10%!important;top:4%!important;height:20%!important}[data-type="login"].cs-login-front .cs-login-services{left:8%!important;right:8%!important;top:27%!important;width:auto!important;bottom:auto!important;height:20%!important;grid-template-columns:repeat(5,1fr)!important;align-items:center!important}[data-type="login"].cs-login-front .cs-login-panel{right:12%!important;left:12%!important;top:54%!important;bottom:12%!important;padding:5% 4% 3%!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:35%!important;top:23%!important;width:30%!important}[data-type="login"].cs-login-back-ref .cs-info{right:10%!important;left:10%!important;top:66%!important;bottom:11%!important;grid-template-columns:repeat(2,1fr)!important}`,
 4:`[data-type="login"].cs-login-front .cs-login-brand{right:4%!important;left:72%!important;top:5%!important;height:80%!important;flex-direction:column!important}[data-type="login"].cs-login-front .cs-login-services{left:4%!important;top:10%!important;width:22%!important;bottom:16%!important}[data-type="login"].cs-login-front .cs-login-panel{right:32%!important;left:30%!important;top:18%!important;bottom:16%!important}[data-type="login"].cs-login-back-ref .cs-login-brand{right:4%!important;left:75%!important;top:8%!important;height:70%!important;flex-direction:column!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:5%!important;top:30%!important;width:28%!important}[data-type="login"].cs-login-back-ref .cs-info{right:38%!important;left:5%!important;top:26%!important;bottom:16%!important}`,
 5:`[data-type="login"].cs-login-front .cs-login-brand{right:0!important;left:0!important;top:0!important;height:24%!important;background:#c9a15b22!important}[data-type="login"].cs-login-front .cs-login-services{left:6%!important;top:31%!important;width:27%!important;bottom:16%!important}[data-type="login"].cs-login-front .cs-login-panel{right:6%!important;left:38%!important;top:35%!important;bottom:16%!important}[data-type="login"].cs-login-back-ref .cs-back-title{top:4%!important;right:0!important;left:0!important;text-align:center!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:7%!important;top:28%!important;width:33%!important}[data-type="login"].cs-login-back-ref .cs-info{right:45%!important;left:6%!important;top:26%!important;bottom:14%!important}`,
 6:`[data-type="login"].cs-login-front .cs-login-brand{right:7%!important;left:7%!important;top:4%!important;height:20%!important}[data-type="login"].cs-login-front .cs-login-panel{right:7%!important;left:7%!important;top:27%!important;bottom:40%!important;padding:5% 4% 3%!important}[data-type="login"].cs-login-front .cs-login-services{left:7%!important;right:7%!important;top:auto!important;bottom:14%!important;width:auto!important;height:20%!important;grid-template-columns:repeat(5,1fr)!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:7%!important;top:18%!important;width:31%!important}[data-type="login"].cs-login-back-ref .cs-info{right:43%!important;left:7%!important;top:18%!important;bottom:15%!important}`,
 7:`[data-type="login"].cs-login-ref:after{content:''!important;position:absolute!important;right:-12%!important;top:24%!important;width:124%!important;height:22%!important;background:#c9a15b22!important;transform:rotate(-7deg)!important;z-index:2!important}[data-type="login"].cs-login-front .cs-login-brand{right:6%!important;left:55%!important;top:5%!important;height:22%!important}[data-type="login"].cs-login-front .cs-login-services{left:5%!important;top:8%!important;width:33%!important;bottom:18%!important}[data-type="login"].cs-login-front .cs-login-panel{right:6%!important;left:43%!important;top:35%!important;bottom:12%!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:8%!important;top:34%!important;width:30%!important}[data-type="login"].cs-login-back-ref .cs-info{right:43%!important;left:6%!important;top:20%!important;bottom:15%!important}`,
 8:`[data-type="login"].cs-login-front .cs-login-brand{right:25%!important;left:25%!important;top:4%!important;height:20%!important}[data-type="login"].cs-login-front .cs-login-services{left:9%!important;top:29%!important;width:25%!important;bottom:14%!important;border-radius:18px!important}[data-type="login"].cs-login-front .cs-login-panel{right:9%!important;left:39%!important;top:29%!important;bottom:14%!important;border-radius:18px!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:8%!important;top:22%!important;width:34%!important;border-radius:18px!important}[data-type="login"].cs-login-back-ref .cs-info{right:47%!important;left:8%!important;top:22%!important;bottom:15%!important}`,
 9:`[data-type="login"].cs-login-front .cs-login-brand{right:6%!important;left:6%!important;top:4%!important;height:18%!important}[data-type="login"].cs-login-front .cs-login-services{left:5%!important;right:5%!important;top:25%!important;width:auto!important;bottom:auto!important;height:18%!important;grid-template-columns:repeat(5,1fr)!important}[data-type="login"].cs-login-front .cs-login-panel{right:18%!important;left:18%!important;top:50%!important;bottom:11%!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:33%!important;top:20%!important;width:34%!important}[data-type="login"].cs-login-back-ref .cs-info{right:15%!important;left:15%!important;top:69%!important;bottom:8%!important;grid-template-columns:repeat(2,1fr)!important}`,
 10:`[data-type="login"].cs-login-front .cs-login-brand{right:4%!important;left:48%!important;top:5%!important;height:24%!important;justify-content:flex-start!important}[data-type="login"].cs-login-front .cs-login-services{left:5%!important;top:6%!important;width:36%!important;bottom:14%!important}[data-type="login"].cs-login-front .cs-login-panel{right:5%!important;left:46%!important;top:34%!important;bottom:14%!important}[data-type="login"].cs-login-back-ref .cs-qr-box{left:28%!important;top:20%!important;width:44%!important}[data-type="login"].cs-login-back-ref .cs-info{right:8%!important;left:8%!important;top:69%!important;bottom:7%!important;grid-template-columns:repeat(4,1fr)!important}.cs-login-back-ref[data-type="login"] .cs-info .cs-row{display:block!important;text-align:center!important}`
 };
 return map[n]||'';
}
function cssWifi(id){
 if(id==='wifi-2')return `
[data-type="wifi"].cs-wifi .cs-brandline{right:15%!important;left:15%!important;top:7%!important;justify-content:center!important}
[data-type="wifi"].cs-wifi .cs-card-title{right:12%!important;left:12%!important;top:34%!important;border-radius:14px!important}
[data-type="wifi"].cs-wifi .cs-card-name{right:18%!important;left:18%!important;top:61%!important;border:2px solid #39d9e6!important;border-radius:12px!important;padding:4%!important}
[data-type="wifi"].cs-wifi.cs-back .cs-back-title{right:0!important;left:0!important;text-align:center!important}
[data-type="wifi"].cs-wifi.cs-back .cs-qr-box{left:34%!important;top:22%!important;width:32%!important}
[data-type="wifi"].cs-wifi.cs-back .cs-info{right:10%!important;left:10%!important;top:67%!important;bottom:8%!important;grid-template-columns:repeat(2,1fr)!important}
`;
 if(id==='wifi-3')return `
[data-type="wifi"].cs-wifi:after{content:'Wi‑Fi'!important;position:absolute!important;left:0!important;top:0!important;bottom:0!important;width:30%!important;display:grid!important;place-items:center!important;writing-mode:vertical-rl!important;background:#03121e!important;color:#39d9e6!important;font-size:clamp(14px,4vw,30px)!important;font-weight:900!important;z-index:2!important}
[data-type="wifi"].cs-wifi .cs-brandline{right:5%!important;left:34%!important;top:8%!important}
[data-type="wifi"].cs-wifi .cs-card-title{right:5%!important;left:34%!important;top:36%!important}
[data-type="wifi"].cs-wifi .cs-card-name{right:5%!important;left:34%!important;top:65%!important}
[data-type="wifi"].cs-wifi.cs-back:after{content:''!important;width:0!important}
[data-type="wifi"].cs-wifi.cs-back .cs-qr-box{left:auto!important;right:5%!important;top:25%!important;width:31%!important}
[data-type="wifi"].cs-wifi.cs-back .cs-info{right:41%!important;left:5%!important;top:25%!important;bottom:12%!important}
`;
 return '';
}
function cssQr(id){
 if(id==='qr-2')return `
[data-type="qr"].cs-print-card .cs-brandline{right:15%!important;left:15%!important;top:6%!important;justify-content:center!important}
[data-type="qr"].cs-print-card .cs-card-title{right:12%!important;left:12%!important;top:35%!important;border-radius:14px!important}
[data-type="qr"].cs-print-card .cs-card-name{right:15%!important;left:15%!important;top:65%!important;text-align:center!important}
[data-type="qr"].cs-back .cs-back-title{right:0!important;left:0!important;text-align:center!important}
[data-type="qr"].cs-back .cs-qr-box{left:32%!important;top:23%!important;width:36%!important}
`;
 if(id==='qr-3')return `
[data-type="qr"].cs-print-card:after{content:'QR'!important;position:absolute!important;right:0!important;top:0!important;bottom:0!important;width:28%!important;background:#06483e!important;color:#fff!important;display:grid!important;place-items:center!important;font-weight:900!important;font-size:clamp(16px,5vw,34px)!important;z-index:2!important}
[data-type="qr"].cs-print-card .cs-brandline{right:33%!important;left:5%!important;top:8%!important}
[data-type="qr"].cs-print-card .cs-card-title{right:33%!important;left:5%!important;top:39%!important}
[data-type="qr"].cs-print-card .cs-card-name{right:33%!important;left:5%!important;top:68%!important}
[data-type="qr"].cs-back:after{content:''!important;width:0!important}
[data-type="qr"].cs-back .cs-qr-box{left:5%!important;top:24%!important;width:36%!important}
[data-type="qr"].cs-back .cs-back-title{right:47%!important;left:5%!important;top:24%!important;color:#06483e!important}
`;
 if(id==='qr-4')return `
[data-type="qr"].cs-print-card{box-shadow:inset 0 0 0 4px #d6ad55!important}
[data-type="qr"].cs-print-card .cs-brandline{right:8%!important;left:8%!important;top:6%!important}
[data-type="qr"].cs-print-card .cs-card-title{right:7%!important;left:7%!important;top:32%!important;border-radius:18px!important}
[data-type="qr"].cs-print-card .cs-card-name{right:7%!important;left:7%!important;top:66%!important}
[data-type="qr"].cs-back .cs-back-title{right:8%!important;left:48%!important;top:22%!important;color:#06483e!important}
[data-type="qr"].cs-back .cs-qr-box{left:8%!important;top:20%!important;width:40%!important;border-radius:18px!important}
`;
 return '';
}
function css(){return cssPersonal(current('personal'))+cssLogin(current('login'))+cssWifi(current('wifi'))+cssQr(current('qr'))}
function apply(){let s=document.getElementById('abuCardModelsCss');if(!s){s=document.createElement('style');s.id='abuCardModelsCss';document.head.appendChild(s)}s.textContent=css();updateBadge()}
function select(type,id,show=true){if(!valid(type,id))return false;selected[type]=id;save();try{window.CardsStudio?.selectType?.(type)}catch(e){}apply();setTimeout(()=>{try{window.CardsStudio?.typographyChanged?.()}catch(e){}},20);if(show)updateBadge();return true}
function updateBadge(){let host=document.querySelector('#cardsCenter .cs-panel-title');if(!host)return;let b=document.getElementById('abuCurrentCardModel');if(!b){b=document.createElement('small');b.id='abuCurrentCardModel';b.style.cssText='display:inline-flex;align-items:center;gap:4px;padding:4px 7px;border-radius:999px;background:#087f7212;color:#087f72;font-weight:900';host.appendChild(b)}let type=window.CardsStudio?.currentType?.()||'personal';b.textContent=MODELS[type]?`النموذج: ${current(type).split('-').pop()}`:'';b.style.display=MODELS[type]?'inline-flex':'none'}
function patchTypography(){let t=window.AbuBassamTypography;if(!t||t.__abuCardModelsPatched||typeof t.printCss!=='function')return false;let original=t.printCss.bind(t);t.printCss=function(){return original()+css()};t.__abuCardModelsPatched=true;return true}
function patchStudio(){let s=window.CardsStudio;if(!s||s.__abuCardModelsPatched)return false;let original=s.selectType.bind(s);s.selectType=function(type){let r=original(type);setTimeout(()=>{apply();updateBadge()},15);return r};s.__abuCardModelsPatched=true;return true}
function init(){apply();let tries=0,t=setInterval(()=>{tries++;patchTypography();patchStudio();if((window.AbuBassamTypography&&window.CardsStudio)||tries>120)clearInterval(t)},50);(()=>{const cb=()=>{patchTypography();patchStudio();updateBadge()};const bus=window.__ABU_RUNTIME_REFRESH_BUS__||(window.__ABU_RUNTIME_REFRESH_BUS__=(()=>{const callbacks=new Set();let timer=0;const run=()=>{timer=0;for(const fn of [...callbacks]){try{fn([],null)}catch(e){console.warn('runtime refresh failed',e)}}};const schedule=()=>{if(timer)return;timer=setTimeout(run,40)};window.addEventListener('pageshow',schedule,{passive:true});window.addEventListener('focus',schedule,{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()},{passive:true});document.addEventListener('abu-bassam-section-opened',schedule,{passive:true});document.addEventListener('abu-bassam-settings-opened',schedule,{passive:true});document.addEventListener('abu-bassam-auth-changed',schedule,{passive:true});[120,500,1500].forEach(ms=>setTimeout(schedule,ms));return{add(fn){callbacks.add(fn);schedule()},remove(fn){callbacks.delete(fn)}}})());bus.add(cb);return{disconnect(){bus.remove(cb)},observe(){},takeRecords(){return[]}}})()}
window.AbuBassamCardModels={select,current,models:type=>(MODELS[type]||[]).slice(),css,version:1};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
