/**
 * Local-only Arabic-aware vault search. Does not persist queries or inspect file blobs.
 * Every caller must pass only records already authorized for the signed-in user.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AbuBassamVaultSearch = api;
})(typeof window === 'undefined' ? null : window, function () {
  'use strict';
  const DIGITS = '0123456789';
  const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  function normalize(value) {
    return String(value == null ? '' : value).toLowerCase()
      .replace(/[٠-٩۰-۹]/g, ch => DIGITS[ARABIC_DIGITS.indexOf(ch) >= 0 ? ARABIC_DIGITS.indexOf(ch) : PERSIAN_DIGITS.indexOf(ch)])
      .replace(/[\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, '')
      .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي')
      .replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ة/g, 'ه')
      .replace(/\s+/g, ' ').trim();
  }

  function phone(value) {
    const digits = normalize(value).replace(/[^0-9]/g, '');
    if (/^07\d{9}$/.test(digits)) return digits;
    if (/^9647\d{9}$/.test(digits)) return '0' + digits.slice(3);
    if (/^009647\d{9}$/.test(digits)) return '0' + digits.slice(5);
    return '';
  }

  function phoneCandidates(value) {
    const source = normalize(value);
    const candidates = source.match(/(?:\+?964|00964|0)[\s.()\-]*7(?:[\s.()\-]*[0-9]){9}/g) || [];
    return candidates.map(phone).filter(Boolean);
  }

  function parse(query) {
    const clauses = [];
    const source = String(query == null ? '' : query).slice(0, 300);
    const matcher = /(-?)"([^"]+)"|(-?)([^\s"]+)/g;
    let found;
    while ((found = matcher.exec(source)) !== null && clauses.length < 16) {
      const excluded = (found[1] || found[3]) === '-';
      const term = normalize(found[2] || found[4]);
      if (term && term !== '-') clauses.push({ term, excluded });
    }
    return clauses;
  }

  function matches(item, query) {
    const clauses = Array.isArray(query) ? query : parse(query);
    if (!clauses.length) return true;
    // Explicit, non-sensitive metadata fields only: never index blobs, credentials,
    // authentication tokens, or undeclared record fields.
    const fields = [
      item && item.name, item && item.folder, item && item.mime,
      item && item.category, item && item.notes,
      item && item.documentNumber, item && item.referenceNumber
    ].map(value => String(value == null ? '' : value));
    const haystack = normalize(fields.join(' '));
    const phones = new Set(fields.flatMap(phoneCandidates));
    return clauses.every(({ term, excluded }) => {
      const number = phone(term);
      const hit = haystack.includes(term) || !!number && phones.has(number);
      return excluded ? !hit : hit;
    });
  }

  // Metadata-only filtering over records already authorized by the vault.
  // Never search file contents, tokens or arbitrary object fields.
  function filterMetadata(item, options = {}) {
    if (!item || item.deleted) return false;
    const name = String(item.name || '');
    const mime = String(item.mime || '').toLowerCase();
    const optionsSafe = options && typeof options === 'object' ? options : {};
    const folder = normalize(optionsSafe.folder);
    const ownFolder = normalize(item.folder);
    if (folder && ownFolder !== folder && !ownFolder.startsWith(folder + '/')) return false;
    const docNo = normalize(optionsSafe.documentNumber);
    if (docNo && ![item.documentNumber, item.referenceNumber].some(v => normalize(v) === docNo)) return false;
    const kind = String(optionsSafe.kind || 'all');
    if (kind !== 'all') {
      const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
      const actual = mime.startsWith('image/') || item.category === 'image' ? 'image'
        : mime === 'application/pdf' || extension === 'pdf' ? 'pdf'
        : mime.startsWith('text/') || ['txt','rtf','csv','json','xml','html'].includes(extension) ? 'text'
        : 'file';
      if (actual !== kind) return false;
    }
    const size = Number(item.size);
    const min = optionsSafe.minKb === '' || optionsSafe.minKb == null ? null : Number(optionsSafe.minKb);
    const max = optionsSafe.maxKb === '' || optionsSafe.maxKb == null ? null : Number(optionsSafe.maxKb);
    if ((min !== null || max !== null) && (!Number.isFinite(size) || size < 0)) return false;
    if (min !== null && (!Number.isFinite(min) || min < 0 || size < min * 1024)) return false;
    if (max !== null && (!Number.isFinite(max) || max < 0 || size > max * 1024)) return false;
    for (const [name, value] of [['createdAt', optionsSafe.createdFrom], ['updatedAt', optionsSafe.updatedFrom]]) {
      if (!value) continue;
      // Date-picker values are YYYY-MM-DD; comparing the UTC date component
      // avoids invalid dates, locale ambiguity and timezone-day shifting.
      const date = String(value);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) return false;
      const actual = Date.parse(item[name] || '');
      if (!Number.isFinite(actual) || actual < Date.parse(date + 'T00:00:00Z')) return false;
    }
    return true;
  }

  return Object.freeze({ normalize, phone, parse, matches, filterMetadata });
});
