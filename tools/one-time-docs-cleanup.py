from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'

stale=[
'AGREEMENT-AUDIT-ENVELOPE-RATION-THANKS-2026-09-21.md',
'AUDIT-IMAGE-PRINT-POSTER-2026-09-24.md',
'FEATURE-AUDIT-2026-09-21.md',
'FINAL-PROJECT-AUDIT-2026-09-21.md',
'GLOBAL-FLEX-AUDIT-2026-09-21.md',
'IMPLEMENTATION-PLAN-2026-09-21.md',
'LATEST-FEATURE-AUDIT-2026-09-21.md',
'RELEASE-CHECKLIST.md',
'RELEASE-TEST-REPORT.md',
'SECURITY-CONTROL-AUDIT-2026-09-21.md',
'STRICT-AUDIT-2026-09-21.md',
'UX-OVERRIDE-2026-09-21.md'
]
for name in stale:
    p=DOCS/name
    if p.exists(): p.unlink()

master='''# PROJECT MASTER SPEC — مكتبة أبو بسام

هذا المستند هو المرجع الحالي عالي المستوى للمشروع. لا تُستخدم تقارير التدقيق التاريخية أو خطط الإصدارات القديمة كمصدر متطلبات. عند التعارض يكون الكود الحالي و`AGENTS.md` وملفات المواصفات الحالية في هذا المجلد هي المرجع.

## الهوية
- اسم التطبيق: مكتبة أبو بسام.
- الاسم الكامل: مكتبة أبو بسام للتصوير والقرطاسية.
- المصمم/المبرمج: أكرم حاتم الغزالي.
- رقم التواصل: 07829667521.
- قيم الحزمة والإصدار والبناء تُقرأ من `app.json` و`package.json` و`index.js` ولا تُكرر هنا حتى لا تصبح قديمة.

## الأقسام المعتمدة في التوثيق الحالي
- الصور والطباعة والمعالجة.
- البطاقة الوطنية والمستمسكات.
- الباركود والكروت والباجات.
- الحفظ والمستندات والأرشيف.
- مستمسكات الزبائن.
- الإعدادات والأمان وإدارة الأجهزة والصلاحيات.
- سجل العمليات ومركز الإشعارات وتقارير الأجهزة الفرعية.

## الباركود والكروت
يشمل الباج التعريفي، الروضة/المدرسة، تسجيل الدخول والبريد، Wi‑Fi، QR والقارئ، البطاقة التموينية، المواكب، الأظرف، شهادات التقدير وكتب الشكر. القياسات والطباعة والتصدير يجب أن تعتمد المصدر عالي الدقة وتحافظ على الوجه/الظهر ونسبة الأبعاد.

## الصور والطباعة
- تحرير وقص وتدوير وتحسين مع الحفاظ على المصدر الأصلي.
- A4/A5/CR80 ومقاسات مخصصة بالملم.
- معاينة منفصلة عن التحرير، ومخرجات PDF/صورة/طباعة من المصدر عالي الدقة.
- لا يعتمد التصدير على Screenshot منخفض الدقة.

## الحفظ والمستندات
- ملفات وصور ومستندات مع البحث والفرز والحفظ والطباعة والتصدير.
- نسخ احتياطي واستعادة مع حدود أمان واضحة.
- عزل بيانات الفروع واحترام صلاحيات الأدمن والجهاز الفرعي.

## الأمان
- تسجيل دخول وصلاحيات أدوار وإدارة أجهزة.
- الأسرار وبيانات الاعتماد لا توضع داخل المستودع.
- الصلاحيات تُطبق على الوظائف والعناصر المستهدفة مباشرة، لا عبر طبقات عامة تعترض تفاعل الواجهة.
- عند تعطل محرك WebView يعاد إنشاء المحرك بدل ترك الواجهة في حالة غير قابلة للاستخدام.

## الاستقرار
- يمنع إدخال آليات قديمة لاعتراض أحداث الإدخال على مستوى الصفحة كلها.
- يمنع تشغيل مراقبات DOM واسعة على كامل المستند لأغراض الإصلاح المستمر.
- أي معالجة أو تحرير ثقيل يجب أن يحرر الموارد ولا يحجب واجهة المستخدم دون حاجة.

## Android / CI
المسار المعتمد للبناء هو المصدر الحالي فقط، مع تنظيف المخرجات المولدة قبل إنشاء Android من جديد، ثم تشغيل فحوص الويب والاستقرار قبل Gradle. لا تعتبر النسخة جاهزة حتى ينجح البناء والتحقق من APK الفعلي.

## قاعدة توثيق
مجلد `docs` يجب أن يحتوي فقط على مواصفات حالية قابلة للاعتماد. التاريخ محفوظ في Git ولا حاجة لإبقاء تقارير قديمة داخل الفرع الحالي إذا كانت قد تعيد متطلبات ملغاة أو متعارضة.
'''
(DOCS/'PROJECT-MASTER-SPEC.md').write_text(master,encoding='utf-8')

# Remove wording that can be confused with the retired global input interception layer.
for name,replacements in {
    'CARDS-SECTION-DECISIONS-2026-09-24.md':[
        ('- اللمس والسحب والتحجيم والدوران في محرر A4.','- السحب والتحجيم والدوران في محرر A4.')
    ],
    'CUSTOMER-DOCUMENTS-SPEC-2026-09-24.md':[
        ('قصًا حرًا باللمس','قصًا حرًا بالسحب المباشر')
    ]
}.items():
    p=DOCS/name
    if p.exists():
        s=p.read_text(encoding='utf-8')
        for old,new in replacements:s=s.replace(old,new)
        p.write_text(s,encoding='utf-8')

check=r'''const fs=require('fs'),path=require('path');
const docs=path.resolve(__dirname,'..','docs');
const bad=[
  /صياغة\s*الأسئلة/i,/ضغط\s*الصور/i,/\bquestions?(?:Center|Section)?\b/i,/\bcompressor(?:Center|Section)?\b/i,
  /touchstart/i,/touchmove/i,/touchend/i,/stopImmediatePropagation/i,/restoreNativeTouch/i,
  /tabQuestions/i,/tabCompressor/i,/questionsCenter/i,/compressorCenter/i,/\bgesture\b/i,/اللمس/i
];
const errors=[];
for(const file of fs.readdirSync(docs).filter(f=>f.endsWith('.md'))){
  const s=fs.readFileSync(path.join(docs,file),'utf8');
  for(const re of bad)if(re.test(s))errors.push(`${file}: ${re}`);
}
if(errors.length){console.error('Legacy documentation references remain:\n'+errors.join('\n'));process.exit(1)}
console.log('Docs current-state check passed: no retired section/input-interception references remain in docs.');
'''
(ROOT/'tools'/'check_docs_current_state.js').write_text(check,encoding='utf-8')

pkg_path=ROOT/'package.json'
pkg=json.loads(pkg_path.read_text(encoding='utf-8'))
cmd=pkg.get('scripts',{}).get('check:web','')
needle='node tools/check_docs_current_state.js'
if needle not in cmd:
    anchor='node tools/check_input_and_crash_stability.js'
    cmd=(cmd.replace(anchor,anchor+' && '+needle) if anchor in cmd else cmd+' && '+needle).strip(' &')
    pkg['scripts']['check:web']=cmd
    pkg_path.write_text(json.dumps(pkg,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('docs cleanup prepared')
