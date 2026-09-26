# سجل إلغاء المرونة العامة — محدث 2026-09-24

هذا الملف يوثق قراراً نهائياً في مشروع **مكتبة أبو بسام**:

- تم إلغاء `web/global-flex-runtime.js` نهائياً من المصدر بتاريخ 2026-09-24.
- سبب الإلغاء: مسار المرونة/التكبير العام كان قادراً على التداخل مع اللمس والسحب داخل أقسام التطبيق.
- لا يجوز إعادة تحميله أو إعادة إنشائه تلقائياً.
- `tools/check_project.js` يمنع ربط `global-flex-runtime.js` من `device-name-runtime.js`.
- المرونة المطلوبة حالياً تنفذ بصورة **محلية ومحددة لكل أداة** فقط، مثل:
  - `design-studio-advanced-runtime.js` للتحجيم الحر داخل محرر التصميم.
  - `card-free-layout-runtime.js` لتحريك وتحجيم عناصر الكروت.
  - `photo-geometry-runtime.js` للقص والمنظور.
  - `photo-print-advanced-runtime.js` لتحسين الصور والبوستر.
  - `advanced-completion-runtime.js` للإكمالات مثل Undo/Redo/Flip/Layers/Poster Orientation.

## قاعدة صارمة
أي تحديث مستقبلي يعيد `global-flex-runtime.js` أو يضيف Zoom/Move عاماً فوق واجهة التطبيق كلها يجب اعتباره **تراجعاً Regression** ما لم يطلب المستخدم ذلك صراحة ويثبت باختبار لمس فعلي أنه لا يعطل الأزرار أو الحقول أو السحب المحلي.
