(()=>{
'use strict';
if(window.__ABU_PASSWORD_POLICY_V1__)return;
window.__ABU_PASSWORD_POLICY_V1__=true;
const COMMON=['password','password1','password123','qwerty','qwerty123','123456','12345678','123456789','1234567890','111111','000000','admin','admin123','letmein','welcome','iloveyou','abc123','qwertyuiop','1q2w3e4r','akram','akrama1992','abubassam','abu-bassam','maktaba','library'];
function owner(){return window.AbuBassamSecurity?.role?.()==='owner'}
function normalize(v){return String(v||'').normalize('NFKC')}
function weakness(value){const v=normalize(value),lower=v.toLowerCase(),compact=lower.replace(/[\s._-]/g,'');const sessionEmail=String(window.AbuBassamCloud?.session?.()?.user?.email||'').toLowerCase(),sessionName=sessionEmail.split('@')[0].replace(/[\s._-]/g,'');if(v.length<12)return 'استخدم ١٢ محرفًا على الأقل.';if(v.length>128)return 'كلمة المرور طويلة جدًا.';if(!/\p{L}/u.test(v))return 'أضف حرفًا واحدًا على الأقل.';if(!/\p{N}/u.test(v))return 'أضف رقمًا واحدًا على الأقل.';if(!/[^\p{L}\p{N}\s]/u.test(v))return 'أضف رمزًا خاصًا واحدًا على الأقل مثل ! أو # أو @.';if(COMMON.some(x=>compact===x.replace(/[\s._-]/g,'')))return 'هذه كلمة مرور شائعة أو مرتبطة باسم التطبيق/الحساب. اختر كلمة مختلفة.';if(sessionName&&sessionName.length>=4&&compact.includes(sessionName))return 'لا تستخدم اسم الحساب داخل كلمة المرور.';if(/(.)\1{5,}/u.test(v))return 'تجنب تكرار نفس المحرف مرات كثيرة.';if(/(?:012345|123456|234567|345678|456789|987654|876543|765432)/.test(compact))return 'تجنب التسلسلات الرقمية السهلة.';return ''}
async function changePassword(){if(!owner())return alert('تغيير كلمة مرور الحساب متاح للجهاز الرئيسي فقط.');const c=window.AbuBassamCloud?.client;if(!c)return alert('خدمة الحساب غير جاهزة.');const email=String(window.AbuBassamCloud?.session?.()?.user?.email||'').trim();if(!email)return alert('تعذر تحديد بريد الحساب المسجل حاليًا. أعد تسجيل الدخول ثم حاول مرة أخرى.');const current=String(prompt('أدخل كلمة المرور الحالية لتأكيد الهوية:')||'');if(!current)return;const auth=await c.auth.signInWithPassword({email,password:current});if(auth.error)return alert('كلمة المرور الحالية غير صحيحة.');const next=String(prompt('كلمة المرور الجديدة: ١٢ محرفًا على الأقل، وتحتوي حروفًا وأرقامًا ورمزًا خاصًا:')||'');if(!next)return;const problem=weakness(next);if(problem)return alert(problem);if(next===current)return alert('كلمة المرور الجديدة يجب أن تختلف عن الحالية.');const repeat=String(prompt('أعد كتابة كلمة المرور الجديدة للتأكيد:')||'');if(next!==repeat)return alert('كلمتا المرور غير متطابقتين.');const result=await c.auth.updateUser({password:next});if(result.error)return alert('تعذر تغيير كلمة المرور: '+result.error.message);try{await c.auth.signOut({scope:'others'})}catch(_){}try{window.AbuBassamOps?.add?.({type:'settings',title:'تغيير كلمة مرور الحساب',section:'الأمان',details:'سياسة كلمة مرور قوية'})}catch(_){}alert('تم تغيير كلمة مرور الحساب. لم تُحفظ كلمة المرور داخل التطبيق أو المستودع، وتم طلب إنهاء الجلسات الأخرى إن كانت الخدمة تدعم ذلك.')}
function enforceSignup(event){
  const scope=event?.target?.closest?.('#abuAccountModal')||document;
  const fields=[...scope.querySelectorAll('input[type="password"][autocomplete="new-password"]')];
  fields.forEach(input=>input.setAttribute('minlength','12'));
  const first=fields[0];if(!first||!first.value)return true;
  const problem=weakness(first.value);if(!problem)return true;
  event?.preventDefault?.();event?.stopImmediatePropagation?.();alert(problem);return false
}
function installCompatibilityGuard(){
  document.querySelectorAll('input[type="password"][autocomplete="new-password"]').forEach(input=>input.setAttribute('minlength','12'));
  const button=document.getElementById('acctCreateDo');
  if(button&&!button.__abuStrongPasswordGuard){button.__abuStrongPasswordGuard=true;button.addEventListener('click',enforceSignup,true)}
}
function install(){installCompatibilityGuard();const extras=window.AbuBassamSecurityExtras;if(!extras)return false;extras.changePassword=changePassword;extras.passwordWeakness=weakness;extras.__strongPasswordPolicy=true;return true}
let tries=0,timer=setInterval(()=>{tries++;if(install()||tries>120)clearInterval(timer)},50);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,20));else setTimeout(install,20);
})();
