// Capture this application's OAuth and password-recovery redirect safely.
import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_CALLBACK_PREFIX = 'abu-bassam-library://auth/callback';
const AUTH_CALLBACK_KEY = 'abu_bassam_auth_callback_v1';
const MAX_CALLBACK_LENGTH = 8192;
let lastCallback = '';
let callbackWrite = Promise.resolve();

function validAuthCallback(value) {
  if (typeof value !== 'string' || value.length > MAX_CALLBACK_LENGTH) return false;
  try {
    const parsed = new URL(value);
    const base = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    if (base !== AUTH_CALLBACK_PREFIX) return false;
    if (parsed.username || parsed.password || parsed.port) return false;
    return Boolean(parsed.searchParams.get('code') || parsed.searchParams.get('error') || parsed.searchParams.get('error_description'));
  } catch (_) {
    return false;
  }
}

async function saveCallback(value) {
  if (!validAuthCallback(value) || value === lastCallback) return false;
  await SecureStore.setItemAsync(AUTH_CALLBACK_KEY, value);
  lastCallback = value;
  return true;
}

function acceptCallback(value) {
  callbackWrite = callbackWrite.catch(() => {}).then(() => saveCallback(value));
  callbackWrite.catch(() => {
    // A failed write does not advance lastCallback: a later retry is permitted.
    console.warn('Could not securely retain authentication callback');
  });
  return callbackWrite;
}

Linking.addEventListener('url', (event) => {
  void acceptCallback(event?.url);
});
Promise.resolve()
  .then(() => Linking.getInitialURL())
  .then((url) => acceptCallback(url))
  .catch(() => { console.warn('Could not read initial authentication callback'); });

require('./index.js');
