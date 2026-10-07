import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  BackHandler,
  Linking,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { registerRootComponent } from 'expo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as FileSystem from 'expo-file-system/legacy';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Print from 'expo-print';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';

const APP_URL = 'file:///android_asset/library/index.html';
const APP_VERSION = '6.0.0';
const BUILD_NUMBER = '600';
const PRIVACY_CAPTURE_KEY = 'abu-bassam-private-screen';
const AUTH_CALLBACK_PREFIX = 'abu-bassam-library://auth/callback';
const AUTH_CALLBACK_KEY = 'abu_bassam_auth_callback_v1';
const STARTUP_WATCHDOG_MS = 9000;
const BARCODE_TYPES = [
  'qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'upc_a', 'upc_e',
  'datamatrix', 'pdf417', 'aztec', 'codabar', 'itf14',
];
const SECURE_KEY = /^abu_bassam_[a-z0-9_]{3,80}$/i;

const ANDROID_BRIDGE = `
(function () {
  function send(type, payload) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {}))); }
    catch (error) {}
  }
  window.Android = {
    saveBase64: function (name, mime, data) { send('saveBase64', { name: name, mime: mime, data: data }); },
    saveToGallery: function (name, mime, data) { send('saveToGallery', { name: name, mime: mime, data: data }); },
    savePagesToGallery: function (prefix, pages, mime) { send('savePagesToGallery', { prefix: prefix, pages: pages, mime: mime }); },
    printPages: function (pages, paper, dpi) { send('printPages', { pages: pages, paper: paper, dpi: dpi }); },
    printBase64: function (name, mime, data) { send('printBase64', { name: name, mime: mime, data: data }); },
    printHtml: function (html) { send('printHtml', { html: html }); },
    savePdfHtml: function (name, html) { send('savePdfHtml', { name: name, html: html }); },
    shareBase64: function (name, mime, data) { send('shareBase64', { name: name, mime: mime, data: data }); },
    openExternal: function (url) { send('openExternal', { url: url }); },
    openAppSettings: function () { send('openAppSettings'); },
    getDeviceInfo: function () { send('getDeviceInfo'); },
    cleanCache: function () { send('cleanCache'); },
    security: function (action, requestId, payload) { send('security', { action: action, requestId: requestId, payload: payload || {} }); },
    exitApp: function () { send('exitApp'); }
  };
  window.__ABU_BASSAM_NATIVE_CAMERA__ = true;
  window.__ABU_BASSAM_NATIVE_SECURITY__ = true;
})();
true;
`;

function safeName(value) {
  return String(value || 'Abu_Bassam_File').replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim() || 'Abu_Bassam_File';
}
function splitDataUrl(dataUrl) {
  const marker = ';base64,';
  const at = String(dataUrl || '').indexOf(marker);
  if (at < 0) throw new Error('صيغة الملف غير مدعومة');
  return { mime: String(dataUrl).slice(5, at).split(';')[0] || 'application/octet-stream', base64: String(dataUrl).slice(at + marker.length) };
}
function printDimensions(paper) {
  if (paper === 'A5') return { width: 148, height: 210 };
  if (paper === 'A6') return { width: 105, height: 148 };
  if (paper === '10x15') return { width: 100, height: 150 };
  if (String(paper || '').startsWith('CUSTOM:')) {
    const parts = String(paper).split(':');
    const width = Number(parts[1]);
    const height = Number(parts[2]);
    if (width > 0 && height > 0) return { width, height };
  }
  return { width: 210, height: 297 };
}
function nativeDeviceInfo(cameraPermission) {
  const constants = Platform.constants || {};
  const model = String(constants.Model || constants.model || 'Android');
  const manufacturer = String(constants.Manufacturer || constants.manufacturer || '').trim();
  return {
    name: manufacturer ? `${manufacturer} ${model}`.trim() : model,
    model,
    manufacturer,
    os: Platform.OS,
    androidVersion: String(Platform.Version),
    appVersion: APP_VERSION,
    buildNumber: BUILD_NUMBER,
    cameraPermission: cameraPermission?.granted
      ? 'مسموح'
      : cameraPermission?.canAskAgain === false
        ? 'مرفوض — افتح إعدادات النظام'
        : 'يُطلب عند الاستخدام',
    connection: 'هذا الجهاز',
  };
}

function App() {
  const webRef = useRef(null);
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraMode, setCameraMode] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [barcodeLocked, setBarcodeLocked] = useState(false);
  const [torch, setTorch] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [cameraFrameKind, setCameraFrameKind] = useState('paper');
  const [webReady, setWebReady] = useState(false);
  const [webInstanceKey, setWebInstanceKey] = useState(0);
  const [startupAttempts, setStartupAttempts] = useState(0);
  const lastAuthCallbackRef = useRef('');

  const inject = useCallback((functionName, payload) => {
    const json = JSON.stringify(payload).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    webRef.current?.injectJavaScript(`if (typeof window.${functionName} === 'function') window.${functionName}(${json}); true;`);
  }, []);
  const validAuthCallback = useCallback((rawUrl) => {
    try {
      const value = String(rawUrl || '').trim();
      if (!value) return false;
      const parsed = new URL(value);
      const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
      if (base !== AUTH_CALLBACK_PREFIX) return false;
      return !!(parsed.searchParams.get('code') || parsed.searchParams.get('error') || parsed.searchParams.get('error_description'));
    } catch (_) { return false; }
  }, []);
  const captureAuthCallback = useCallback(async (rawUrl) => {
    const value = String(rawUrl || '').trim();
    if (!validAuthCallback(value) || lastAuthCallbackRef.current === value) return false;
    await SecureStore.setItemAsync(AUTH_CALLBACK_KEY, value);
    lastAuthCallbackRef.current = value;
    inject('AbuBassamNativeAppState', { state: 'active', source: 'auth-callback', at: Date.now() });
    return true;
  }, [inject, validAuthCallback]);

  const replySecurity = useCallback((requestId, ok, value, error) => {
    inject('AbuBassamNativeSecurityResult', { requestId: String(requestId || ''), ok: !!ok, value: value ?? null, error: error ? String(error) : '' });
  }, [inject]);
  const cameraError = useCallback((message) => inject('AbuBassamNativeCameraError', String(message || 'تعذر تشغيل الكاميرا.')), [inject]);
  const closeCamera = useCallback(() => {
    setCameraMode(null); setCameraReady(false); setCameraBusy(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back'); setCameraFrameKind('paper');
  }, []);
  const recoverWebRenderer = useCallback((didCrash = false) => {
    closeCamera();
    setWebReady(false);
    setStartupAttempts(0);
    setWebInstanceKey((value) => value + 1);
    if (didCrash) Alert.alert('تمت استعادة التطبيق', 'تعطل محرك العرض الداخلي وتمت إعادة إنشائه تلقائيًا.');
  }, [closeCamera]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (cameraMode) { closeCamera(); return true; }
      if (!webReady) return false;
      inject('AbuBassamNativeBackPress', { source: 'hardware', at: Date.now() });
      return true;
    });
    return () => subscription.remove();
  }, [cameraMode, closeCamera, inject, webReady]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (webReady) inject('AbuBassamNativeAppState', { state, at: Date.now() });
    });
    return () => subscription.remove();
  }, [inject, webReady]);

  useEffect(() => {
    let active = true;
    Linking.getInitialURL().then((url) => {
      if (active && url) captureAuthCallback(url).catch(() => {});
    }).catch(() => {});
    const subscription = Linking.addEventListener('url', (event) => {
      if (active && event?.url) captureAuthCallback(event.url).catch(() => {});
    });
    return () => { active = false; subscription.remove(); };
  }, [captureAuthCallback]);

  useEffect(() => {
    if (webReady) return undefined;
    const timer = setTimeout(() => {
      if (startupAttempts < 1) {
        setStartupAttempts((value) => value + 1);
        webRef.current?.reload();
        return;
      }
      setWebReady(true);
      Alert.alert('تعذر إكمال بدء التشغيل', 'لم تفتح الواجهة ضمن الوقت المتوقع. أعد تشغيل التطبيق، وإذا تكررت المشكلة افحص ملفات التطبيق.');
    }, STARTUP_WATCHDOG_MS);
    return () => clearTimeout(timer);
  }, [startupAttempts, webReady]);

  const openCamera = useCallback(async (mode, frameKind = 'paper') => {
    try {
      let permission = cameraPermission;
      if (!permission?.granted) permission = await requestCameraPermission();
      if (!permission?.granted) { cameraError('يجب منح إذن الكاميرا حتى يعمل المسح الضوئي وقارئ الباركود.'); return; }
      setCameraReady(false); setBarcodeLocked(false); setTorch(false); setCameraFacing('back');
      setCameraFrameKind(['card', 'photo', 'paper'].includes(frameKind) ? frameKind : 'paper');
      setCameraMode(['barcode', 'maker', 'cardPhoto', 'ocr'].includes(mode) ? mode : 'scan');
    } catch (_) { cameraError('تعذر طلب إذن الكاميرا. افتح معلومات التطبيق وفعّل إذن الكاميرا.'); }
  }, [cameraError, cameraPermission, requestCameraPermission]);

  const captureDocument = useCallback(async () => {
    if (!cameraReady || cameraBusy || !cameraRef.current) return;
    setCameraBusy(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ base64: true, exif: false, quality: 1, skipProcessing: false });
      if (!picture?.base64) throw new Error('لم تُحفظ الصورة');
      const mode = ['maker', 'cardPhoto', 'ocr'].includes(cameraMode) ? cameraMode : 'scan';
      closeCamera();
      inject('AbuBassamNativeCameraResult', { mode, dataUrl: `data:image/jpeg;base64,${picture.base64}` });
    } catch (_) { setCameraBusy(false); cameraError('تعذر التقاط الصورة. أعد فتح الكاميرا وحاول مرة أخرى.'); }
  }, [cameraBusy, cameraError, cameraMode, cameraReady, closeCamera, inject]);

  const onBarcodeScanned = useCallback((result) => {
    if (barcodeLocked || !result?.data) return;
    setBarcodeLocked(true);
    closeCamera();
    inject('AbuBassamNativeCameraResult', { mode: 'barcode', data: String(result.data), barcodeType: result.type || '' });
  }, [barcodeLocked, closeCamera, inject]);
  const onCameraMountError = useCallback(() => { closeCamera(); cameraError('تعذر تشغيل الكاميرا الخلفية على هذا الجهاز.'); }, [cameraError, closeCamera]);

  const saveBase64 = useCallback(async ({ name, mime, data }) => {
    try {
      const parsed = splitDataUrl(data), finalMime = mime || parsed.mime, finalName = safeName(name);
      const dot = finalName.lastIndexOf('.'), displayName = dot > 0 ? finalName.slice(0, dot) : finalName;
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permission.granted) return;
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, displayName, finalMime);
      await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('تم الحفظ', `تم حفظ ${finalName} بنجاح.`);
    } catch (error) { Alert.alert('تعذر الحفظ', String(error?.message || error)); }
  }, []);

  const saveToGallery = useCallback(async ({ name, mime, data }) => {
    try {
      const parsed = splitDataUrl(data), finalMime = mime || parsed.mime;
      if (!String(finalMime).startsWith('image/')) throw new Error('هذا الملف ليس صورة');
      const finalName = safeName(name || `Abu_Bassam_${Date.now()}.png`), dot = finalName.lastIndexOf('.'), displayName = dot > 0 ? finalName.slice(0, dot) : finalName;
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Pictures');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permission.granted) return;
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, displayName, finalMime);
      await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
      Alert.alert('تم الحفظ في المعرض', `تم حفظ ${finalName} داخل مجلد الصور الذي اخترته.`);
    } catch (error) { Alert.alert('تعذر الحفظ في المعرض', String(error?.message || error)); }
  }, []);

  const savePagesToGallery = useCallback(async ({ prefix, pages, mime }) => {
    try {
      const imagePages = typeof pages === 'string' ? JSON.parse(pages) : pages;
      if (!Array.isArray(imagePages) || !imagePages.length) throw new Error('لا توجد صور للحفظ');
      if (imagePages.length > 20) throw new Error('الحد الأقصى للحفظ في الدفعة الواحدة هو 20 صورة');
      const defaultMime = String(mime || '').trim();
      if (defaultMime && !defaultMime.startsWith('image/')) throw new Error('صيغة الصور غير مدعومة');
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Pictures');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permission.granted) return;
      let saved = 0;
      for (let index = 0; index < imagePages.length; index += 1) {
        const rawPage = String(imagePages[index] || '');
        const encodedNameMatch = /;name=([^;]+);base64,/i.exec(rawPage);
        const parsed = splitDataUrl(rawPage);
        const itemMime = String(parsed.mime || defaultMime || 'image/jpeg');
        if (!itemMime.startsWith('image/')) throw new Error('إحدى الصور تحمل صيغة غير مدعومة');
        let requestedName = '';
        if (encodedNameMatch) {
          try { requestedName = safeName(decodeURIComponent(encodedNameMatch[1])); } catch (_) { requestedName = ''; }
        }
        const ext = itemMime === 'image/png' ? 'png' : itemMime === 'image/webp' ? 'webp' : itemMime === 'image/avif' ? 'avif' : 'jpg';
        const fallbackName = `${safeName(prefix || 'Abu_Bassam_Page')}_${index + 1}_${Date.now()}.${ext}`;
        const finalName = requestedName || fallbackName;
        const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, finalName, itemMime);
        await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
        saved += 1;
      }
      Alert.alert('تم الحفظ في المعرض', `تم حفظ ${saved} صورة بأسمائها وصيغها الأصلية داخل مجلد الصور الذي اخترته.`);
    } catch (error) { Alert.alert('تعذر حفظ الصفحات', String(error?.message || error)); }
  }, []);

  const printPages = useCallback(async ({ pages, paper }) => {
    try {
      const imagePages = typeof pages === 'string' ? JSON.parse(pages) : pages;
      if (!Array.isArray(imagePages) || !imagePages.length) throw new Error('لا توجد صفحات للطباعة');
      const size = printDimensions(paper);
      const body = imagePages.map((src) => `<section><img alt="صفحة للطباعة" src="${String(src).replace(/"/g, '&quot;')}"></section>`).join('');
      const html = `<!doctype html><html dir="rtl"><head><meta charset="utf-8"><style>@page{size:${size.width}mm ${size.height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}section{width:${size.width}mm;height:${size.height}mm;margin:0;page-break-after:always;display:flex;align-items:center;justify-content:center;overflow:hidden}section:last-child{page-break-after:auto}img{width:100%;height:100%;object-fit:contain;display:block}</style></head><body>${body}</body></html>`;
      await Print.printAsync({ html });
    } catch (error) { Alert.alert('تعذرت الطباعة', String(error?.message || error)); }
  }, []);

  const printHtml = useCallback(async ({ html }) => {
    try { if (!String(html || '').trim()) throw new Error('لا توجد كروت للطباعة'); await Print.printAsync({ html: String(html) }); }
    catch (error) { Alert.alert('تعذرت الطباعة', String(error?.message || error)); }
  }, []);

  const savePdfHtml = useCallback(async ({ name, html }) => {
    try {
      if (!String(html || '').trim()) throw new Error('لا توجد كروت لحفظها');
      const result = await Print.printToFileAsync({ html: String(html), base64: true });
      const base64 = result.base64 || await FileSystem.readAsStringAsync(result.uri, { encoding: FileSystem.EncodingType.Base64 });
      const finalName = safeName(name || `Abu_Bassam_Cards_${Date.now()}.pdf`), dot = finalName.lastIndexOf('.'), displayName = dot > 0 ? finalName.slice(0, dot) : finalName;
      const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot('Download');
      const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);
      if (!permission.granted) return;
      const uri = await FileSystem.StorageAccessFramework.createFileAsync(permission.directoryUri, displayName, 'application/pdf');
      await FileSystem.StorageAccessFramework.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
      if (result.uri?.startsWith(FileSystem.cacheDirectory || '')) await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});
      Alert.alert('تم حفظ PDF', `تم حفظ ${finalName} بأعلى جودة متاحة.`);
    } catch (error) { Alert.alert('تعذر حفظ PDF', String(error?.message || error)); }
  }, []);

  const writeTemporaryFile = useCallback(async (name, mime, data) => {
    const parsed = splitDataUrl(data), finalName = safeName(name), uri = `${FileSystem.cacheDirectory}abu_bassam_${Date.now()}_${finalName}`;
    await FileSystem.writeAsStringAsync(uri, parsed.base64, { encoding: FileSystem.EncodingType.Base64 });
    return { uri, name: finalName, type: mime || parsed.mime };
  }, []);

  const printBase64 = useCallback(async ({ name, mime, data }) => {
    try {
      const finalMime = String(mime || 'application/octet-stream');
      if (finalMime.startsWith('image/')) {
        const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:8mm}html,body{margin:0}body{display:flex;align-items:center;justify-content:center;min-height:270mm}img{max-width:100%;max-height:270mm;object-fit:contain}</style></head><body><img src="${String(data).replace(/"/g, '&quot;')}"></body></html>`;
        await Print.printAsync({ html }); return;
      }
      const file = await writeTemporaryFile(name, finalMime, data);
      try { await Print.printAsync({ uri: file.uri }); } finally { await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {}); }
    } catch (error) { Alert.alert('تعذرت الطباعة', String(error?.message || error)); }
  }, [writeTemporaryFile]);

  const openExternal = useCallback(async ({ url }) => {
    try {
      const value = String(url || '').trim();
      if (!/^(https:|tel:|mailto:|tg:|whatsapp:)/i.test(value)) throw new Error('الرابط غير مسموح');
      if (!(await Linking.canOpenURL(value))) throw new Error('لا يوجد تطبيق مناسب لفتح هذا الرابط');
      await Linking.openURL(value);
    } catch (error) { Alert.alert('تعذر فتح الرابط', String(error?.message || error)); }
  }, []);

  const onShouldStartLoadWithRequest = useCallback((request) => {
    const url = String(request?.url || '').trim();
    if (!url || url === 'about:blank' || url.startsWith('file:///android_asset/library/')) return true;
    if (/^(https:|tel:|mailto:|tg:|whatsapp:)/i.test(url)) {
      openExternal({ url });
      return false;
    }
    return false;
  }, [openExternal]);

  const shareBase64 = useCallback(async ({ name, mime, data }) => {
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error('المشاركة غير متاحة على هذا الجهاز');
      const file = await writeTemporaryFile(name, mime, data);
      try { await Sharing.shareAsync(file.uri, { mimeType: file.type, dialogTitle: 'حفظ أو مشاركة الملف' }); }
      finally { await FileSystem.deleteAsync(file.uri, { idempotent: true }).catch(() => {}); }
    } catch (error) { Alert.alert('تعذرت المشاركة', String(error?.message || error)); }
  }, [writeTemporaryFile]);

  const openAppSettings = useCallback(async () => {
    try { await Linking.openSettings(); }
    catch (_) { Alert.alert('تعذر فتح الإعدادات', 'افتح إعدادات Android ثم اختر تطبيق مكتبة أبو بسام.'); }
  }, []);
  const getDeviceInfo = useCallback(() => inject('AbuBassamNativeDeviceInfo', nativeDeviceInfo(cameraPermission)), [cameraPermission, inject]);
  const cleanCache = useCallback(async () => {
    try {
      const root = FileSystem.cacheDirectory;
      if (!root) throw new Error('مجلد الملفات المؤقتة غير متاح');
      const entries = await FileSystem.readDirectoryAsync(root), generated = entries.filter((name) => name.startsWith('abu_bassam_'));
      await Promise.all(generated.map((name) => FileSystem.deleteAsync(`${root}${name}`, { idempotent: true })));
      Alert.alert('تم التنظيف', `حُذفت ${generated.length} من الملفات المؤقتة فقط. لم تُحذف ملفاتك.`);
    } catch (error) { Alert.alert('تعذر التنظيف', String(error?.message || error)); }
  }, []);

  const handleSecurity = useCallback(async (message) => {
    const action = String(message.action || ''), requestId = String(message.requestId || ''), payload = message.payload && typeof message.payload === 'object' ? message.payload : {};
    const safeKey = () => { const key = String(payload.key || ''); if (!SECURE_KEY.test(key)) throw new Error('مفتاح التخزين الآمن غير مسموح'); return key; };
    try {
      if (action === 'secureGet') return replySecurity(requestId, true, await SecureStore.getItemAsync(safeKey()) || '');
      if (action === 'secureSet') { await SecureStore.setItemAsync(safeKey(), String(payload.value || '')); return replySecurity(requestId, true, true); }
      if (action === 'secureDelete') { await SecureStore.deleteItemAsync(safeKey()); return replySecurity(requestId, true, true); }
      if (action === 'deviceInfo') return replySecurity(requestId, true, nativeDeviceInfo(cameraPermission));
      if (action === 'biometricStatus') {
        const [available, enrolled, types] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync(), LocalAuthentication.supportedAuthenticationTypesAsync()]);
        return replySecurity(requestId, true, { available, enrolled, types });
      }
      if (action === 'biometricAuth') {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: String(payload.reason || 'افتح مكتبة أبو بسام'), cancelLabel: 'إلغاء', fallbackLabel: 'استخدام قفل الهاتف', disableDeviceFallback: false, biometricsSecurityLevel: 'strong',
        });
        return replySecurity(requestId, true, { success: !!result.success, error: result.error || '' });
      }
      if (action === 'privacyMode') {
        const enabled = !!payload.enabled;
        if (enabled) await ScreenCapture.preventScreenCaptureAsync(PRIVACY_CAPTURE_KEY);
        else await ScreenCapture.allowScreenCaptureAsync(PRIVACY_CAPTURE_KEY);
        return replySecurity(requestId, true, { enabled });
      }
      throw new Error('عملية الأمان غير معروفة');
    } catch (error) { replySecurity(requestId, false, null, error?.message || error); }
  }, [cameraPermission, replySecurity]);

  const onWebMessage = useCallback(async (event) => {
    let message; try { message = JSON.parse(event.nativeEvent.data); } catch (_) { return; }
    if (message.type === 'openCamera') return openCamera(message.mode, message.frameKind);
    if (message.type === 'saveBase64') return saveBase64(message);
    if (message.type === 'saveToGallery') return saveToGallery(message);
    if (message.type === 'savePagesToGallery') return savePagesToGallery(message);
    if (message.type === 'printPages') return printPages(message);
    if (message.type === 'printBase64') return printBase64(message);
    if (message.type === 'printHtml') return printHtml(message);
    if (message.type === 'savePdfHtml') return savePdfHtml(message);
    if (message.type === 'shareBase64') return shareBase64(message);
    if (message.type === 'openExternal') return openExternal(message);
    if (message.type === 'openAppSettings') return openAppSettings();
    if (message.type === 'getDeviceInfo') return getDeviceInfo();
    if (message.type === 'cleanCache') return cleanCache();
    if (message.type === 'security') return handleSecurity(message);
    if (message.type === 'exitApp') return BackHandler.exitApp();
  }, [cleanCache, getDeviceInfo, handleSecurity, openAppSettings, openCamera, openExternal, printBase64, printHtml, printPages, saveBase64, savePdfHtml, savePagesToGallery, saveToGallery, shareBase64]);

  const barcodeMode = cameraMode === 'barcode';
  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle={cameraMode ? 'light-content' : 'dark-content'} backgroundColor={cameraMode ? '#000000' : '#fffaf3'} />
      <WebView
        key={webInstanceKey} ref={webRef} source={{ uri: APP_URL }} style={styles.webView} originWhitelist={['file://*','about:*']} javaScriptEnabled domStorageEnabled
        allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs mixedContentMode="never"
        setSupportMultipleWindows={false} mediaPlaybackRequiresUserAction={false}
        injectedJavaScriptBeforeContentLoaded={ANDROID_BRIDGE} onMessage={onWebMessage} onShouldStartLoadWithRequest={onShouldStartLoadWithRequest} onLoadEnd={() => setWebReady(true)}
        onRenderProcessGone={(event) => recoverWebRenderer(!!event.nativeEvent?.didCrash)}
        onContentProcessDidTerminate={() => recoverWebRenderer(true)}
        onError={() => recoverWebRenderer(false)}
      />
      {!webReady && <View style={styles.loading}><ActivityIndicator size="large" color="#76533e" /><Text style={styles.loadingText}>جاري فتح مكتبة أبو بسام…</Text></View>}
      {cameraMode && (
        <View style={styles.cameraOverlay}>
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} enableTorch={cameraFacing === 'back' && torch}
            onCameraReady={() => setCameraReady(true)} onMountError={onCameraMountError}
            barcodeScannerSettings={barcodeMode ? { barcodeTypes: BARCODE_TYPES } : undefined}
            onBarcodeScanned={barcodeMode && !barcodeLocked ? onBarcodeScanned : undefined} />
          <View style={styles.cameraShade} pointerEvents="box-none">
            <View style={styles.cameraHeader}>
              <TouchableOpacity style={styles.roundButton} onPress={closeCamera} accessibilityLabel="إغلاق الكاميرا"><Text style={styles.roundButtonText}>×</Text></TouchableOpacity>
              <Text style={styles.cameraTitle}>{barcodeMode ? 'قارئ الباركود' : cameraMode === 'maker' ? 'صانع الهوية' : cameraMode === 'cardPhoto' ? 'صورة الكارت' : cameraMode === 'ocr' ? 'تحويل الصورة إلى نص' : 'المسح الضوئي'}</Text>
              <View style={styles.cameraActions}>
                <TouchableOpacity style={styles.roundButton} onPress={() => { setCameraReady(false); setTorch(false); setCameraFacing((value) => value === 'back' ? 'front' : 'back'); }} accessibilityLabel="تبديل الكاميرا"><Text style={styles.flipText}>↻</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.roundButton, cameraFacing !== 'back' && styles.roundButtonDisabled]} onPress={() => cameraFacing === 'back' && setTorch((value) => !value)} disabled={cameraFacing !== 'back'} accessibilityLabel="الفلاش"><Text style={styles.flashText}>{torch ? '☀' : 'ϟ'}</Text></TouchableOpacity>
              </View>
            </View>
            <View style={barcodeMode ? styles.barcodeFrame : cameraFrameKind === 'card' ? styles.cardDocumentFrame : cameraFrameKind === 'photo' ? styles.photoDocumentFrame : styles.documentFrame} />
            <Text style={styles.cameraHint}>{barcodeMode ? 'وجّه الكاميرا نحو الباركود وسيُقرأ تلقائيًا' : cameraMode === 'cardPhoto' ? 'ضع الوجه داخل الإطار ثم اضغط زر التصوير' : cameraMode === 'ocr' ? 'صوّر النص بوضوح وبإضاءة جيدة' : 'ضع المستند داخل الإطار؛ سيُحلل ويُقص محليًا بعد الالتقاط'}</Text>
            {!barcodeMode && <TouchableOpacity style={[styles.shutter, (!cameraReady || cameraBusy) && styles.shutterDisabled]} onPress={captureDocument} disabled={!cameraReady || cameraBusy} accessibilityLabel="التقاط الصورة">{cameraBusy ? <ActivityIndicator color="#087f72" /> : <View style={styles.shutterInner} />}</TouchableOpacity>}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fffaf3' }, webView: { flex: 1, backgroundColor: '#fffaf3' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaf3' },
  loadingText: { color: '#5b4438', fontSize: 15, fontWeight: '700', marginTop: 14 },
  cameraOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100, backgroundColor: '#000' },
  cameraShade: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 38 },
  cameraHeader: { width: '100%', paddingTop: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '900', backgroundColor: '#0008', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20 },
  cameraActions: { flexDirection: 'row', gap: 7 }, roundButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center' },
  roundButtonDisabled: { opacity: 0.45 }, roundButtonText: { color: '#fff', fontSize: 32, lineHeight: 35 }, flipText: { color: '#fff', fontSize: 27, fontWeight: '800' }, flashText: { color: '#fff', fontSize: 25, fontWeight: '800' },
  documentFrame: { width: '91%', aspectRatio: 0.72, maxHeight: '66%', borderWidth: 3, borderColor: '#fff', borderRadius: 15, backgroundColor: '#00000010' },
  cardDocumentFrame: { width: '91%', aspectRatio: 1.585, maxHeight: '54%', borderWidth: 3, borderColor: '#fff', borderRadius: 15, backgroundColor: '#00000010' },
  photoDocumentFrame: { width: '72%', aspectRatio: 0.78, maxHeight: '62%', borderWidth: 3, borderColor: '#fff', borderRadius: 18, backgroundColor: '#00000010' },
  barcodeFrame: { width: '88%', height: 230, borderWidth: 3, borderColor: '#21d3b7', borderRadius: 20, backgroundColor: '#00000012' },
  cameraHint: { color: '#fff', fontSize: 14, fontWeight: '800', textAlign: 'center', backgroundColor: '#000a', paddingHorizontal: 17, paddingVertical: 10, borderRadius: 18 },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', backgroundColor: '#ffffff66', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' }, shutterDisabled: { opacity: 0.55 },
});

registerRootComponent(App);