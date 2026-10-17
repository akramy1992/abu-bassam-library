import { Linking } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_CALLBACK_KEY = 'abu_bassam_auth_callback_v1';
const AUTH_CALLBACK_PREFIX = 'abu-bassam-library://auth/callback';
let lastCallback = '';

function validAuthCallback(value) {
  try {
    const url = new URL(value);
    const base = `${url.protocol}//${url.host}${url.pathname}`;
    if (base !== AUTH_CALLBACK_PREFIX) return false;
    return !!(url.searchParams.get('code') || url.searchParams.get('error') || url.searchParams.get('error_description'));
  } catch (_) {
    return false;
  }
}

async function captureAuthCallback(url) {
  const value = String(url || '').trim();
  if (!value || value === lastCallback || !validAuthCallback(value)) return;
  try {
    await SecureStore.setItemAsync(AUTH_CALLBACK_KEY, value);
    lastCallback = value;
  } catch (_) {
    // Keep lastCallback unchanged so the same OS event can be retried safely.
  }
}

Linking.getInitialURL().then(captureAuthCallback).catch(() => {});
Linking.addEventListener('url', (event) => captureAuthCallback(event?.url));

require('./index.js');
