# متغيرات وأسرار GitHub Actions

هذا المستودع خاص بتطبيق **مكتبة أبو بسام للتصوير والقرطاسية** فقط.

## البناء التجريبي Debug

لا يحتاج أي Secret. بعد استيراد المصدر الكامل يقوم Workflow الخاص بـ Android بفحص المشروع وبناء APK تجريبي.

## بناء Release موقّع للتحديث

أضف القيم التالية من:

`Settings → Secrets and variables → Actions → New repository secret`

1. `ANDROID_KEYSTORE_BASE64`
   - ملف مفتاح التوقيع الأصلي بعد تحويله كاملًا إلى Base64.
   - يجب أن يكون مفتاح سلسلة الإصدارات السابقة نفسها حتى يقبل Android النسخة كتحديث.

2. `ANDROID_KEYSTORE_PASSWORD`
   - كلمة مرور ملف الـ keystore / PKCS12.

3. `ANDROID_KEY_ALIAS`
   - اسم المفتاح داخل ملف التوقيع.

4. `ANDROID_KEY_PASSWORD`
   - كلمة مرور المفتاح نفسه.

لا تكتب أي كلمة مرور أو ملف توقيع داخل المصدر أو README أو Issues.

## Supabase

المزامنة الاختيارية في الإصدار الحالي تستخدم Supabase Publishable Key للعميل مع RLS. هذا ليس `service_role` ولا مفتاح خادم سري، ولذلك لا يحتاج Workflow الحالي إلى Secret خاص بـ Supabase.

ميزة AI PRO تستدعي Supabase Edge Function. إذا احتاجت الدالة `OPENAI_API_KEY` أو `GEMINI_API_KEY` أو رمز PRO خاصًا بها، فتوضع هذه القيم في **Supabase Edge Function Secrets** وليس في GitHub ولا داخل APK.

## غير مطلوب كـ GitHub Secret حاليًا

لا تنشئ القيم التالية داخل GitHub لهذا الإصدار ما لم نغير بنية البناء لاحقًا:

- `TELEGRAM_BOT_TOKEN`
- `GOOGLE_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

يجب ألا يحتوي APK على مفاتيح خادم سرية.
