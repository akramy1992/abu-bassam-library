const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-pro-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MAX_BODY_BYTES = 30 * 1024 * 1024;
const MAX_IMAGE_DATA_URL = 28 * 1024 * 1024;
const MAX_PROMPT_CHARS = 2000;
const ALLOWED_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/;

const IDENTITY_GUARD = `قاعدة إلزامية لجميع تعديلات الأشخاص: حافظ على هوية الشخص الأصلية وملامح الوجه بدقة شديدة. لا تغيّر هندسة الوجه أو شكل العينين أو الحاجبين أو الأنف أو الفم أو الأذنين أو الفك أو العمر أو لون البشرة الطبيعي. لا تنشئ وجهاً جديداً ولا تعِد تفسير الملامح. اجعل التعديل مقتصراً على الخلفية والإضاءة والألوان والتنظيف والعناصر التي طلبها المستخدم صراحة.`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...cors,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
async function sha256(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
async function tokenMatches(supplied: string, expected: string) {
  if (!supplied || !expected || supplied.length > 512 || expected.length > 512) return false;
  const [a, b] = await Promise.all([sha256(supplied), sha256(expected)]);
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) diff |= (a[i % a.length] ^ b[i % b.length]);
  return diff === 0;
}
function firstGeminiImage(data: any): { data: string; mime: string } | null {
  if (!data || typeof data !== 'object') return null;
  if (data.output_image?.data) return { data: data.output_image.data, mime: data.output_image.mime_type || 'image/png' };
  const stack: any[] = [data];
  while (stack.length) {
    const v = stack.shift();
    if (!v || typeof v !== 'object') continue;
    if (v.type === 'image' && typeof v.data === 'string' && v.data.length > 100) return { data: v.data, mime: v.mime_type || 'image/png' };
    if (Array.isArray(v)) stack.push(...v);
    else for (const x of Object.values(v)) if (x && typeof x === 'object') stack.push(x);
  }
  return null;
}
async function runGemini(imageDataUrl: string, prompt: string, key: string) {
  const comma = imageDataUrl.indexOf(',');
  const header = imageDataUrl.slice(0, comma);
  const raw = imageDataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/png';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3.1-flash-image',
      input: [{ type: 'text', text: prompt }, { type: 'image', mime_type: mime, data: raw }],
      response_format: { type: 'image', mime_type: 'image/png', image_size: '2K' },
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `Gemini HTTP ${response.status}`);
  const out = firstGeminiImage(data);
  if (!out) throw new Error('لم ترجع Gemini صورة معدلة');
  return `data:${out.mime};base64,${out.data}`;
}
async function runOpenAI(imageDataUrl: string, prompt: string, key: string) {
  const comma = imageDataUrl.indexOf(',');
  const header = imageDataUrl.slice(0, comma);
  const raw = imageDataUrl.slice(comma + 1);
  const mime = /data:([^;]+)/.exec(header)?.[1] || 'image/png';
  const bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0));
  const ext = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png';
  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('prompt', prompt);
  form.append('image', new File([bytes], `input.${ext}`, { type: mime }));
  form.append('size', 'auto');
  form.append('output_format', 'png');
  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${response.status}`);
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('لم ترجع OpenAI صورة معدلة');
  return `data:image/png;base64,${b64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: 'حجم الطلب أكبر من الحد المسموح' }, 413);

  const expectedToken = Deno.env.get('AI_APP_TOKEN') || '';
  const suppliedToken = req.headers.get('x-pro-token') || '';
  if (!expectedToken) return json({ error: 'AI_APP_TOKEN غير مضبوط في Supabase Secrets' }, 503);
  if (!await tokenMatches(suppliedToken, expectedToken)) return json({ error: 'رمز PRO غير صحيح' }, 401);

  try {
    const body = await req.json();
    const imageDataUrl = typeof body?.imageDataUrl === 'string' ? body.imageDataUrl : '';
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    const provider = body?.provider === 'openai' ? 'openai' : body?.provider === 'gemini' ? 'gemini' : '';
    if (!imageDataUrl || imageDataUrl.length > MAX_IMAGE_DATA_URL || !ALLOWED_IMAGE.test(imageDataUrl)) return json({ error: 'صيغة الصورة أو حجمها غير مسموح' }, 400);
    if (prompt.length < 3 || prompt.length > MAX_PROMPT_CHARS) return json({ error: 'أمر التعديل غير صالح أو طويل جدًا' }, 400);
    if (!provider) return json({ error: 'مزود الذكاء الاصطناعي غير صالح' }, 400);
    const guardedPrompt = `${IDENTITY_GUARD}\n\n${prompt}`;
    let imageDataUrlOut = '';
    if (provider === 'gemini') {
      const key = Deno.env.get('GEMINI_API_KEY') || '';
      if (!key) return json({ error: 'Gemini غير مفعّل بعد' }, 503);
      imageDataUrlOut = await runGemini(imageDataUrl, guardedPrompt, key);
    } else {
      const key = Deno.env.get('OPENAI_API_KEY') || '';
      if (!key) return json({ error: 'OpenAI غير مفعّل بعد' }, 503);
      imageDataUrlOut = await runOpenAI(imageDataUrl, guardedPrompt, key);
    }
    return json({ imageDataUrl: imageDataUrlOut, provider, identityGuard: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'خطأ غير معروف' }, 500);
  }
});
