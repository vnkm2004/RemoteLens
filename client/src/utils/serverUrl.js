// Centralized Server URL Resolver for Web and Native APK
const ENV_SERVER_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL
  ? import.meta.env.VITE_SERVER_URL.trim().replace(/\/+$/, '')
  : null;

const DEFAULT_HOST_IP = '172.30.250.210:5000';
const DEFAULT_SERVER_URL = ENV_SERVER_URL || `https://${DEFAULT_HOST_IP}`;

export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    window.location.hostname === 'localhost'
  );
}

export function getServerUrl() {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;

  // 1. Check if user configured a custom server URL in localStorage
  const saved = localStorage.getItem('remote_server_url');
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
  }

  // 2. Check if build-time VITE_SERVER_URL environment variable is provided
  if (ENV_SERVER_URL) {
    return ENV_SERVER_URL;
  }

  // 3. If hosted on a cloud static platform (Vercel, Netlify, GitHub Pages) without custom backend URL
  const isCloudHost = window.location.hostname.includes('vercel.app') ||
                      window.location.hostname.includes('netlify.app') ||
                      window.location.hostname.includes('github.io');
  if (isCloudHost) {
    return DEFAULT_SERVER_URL;
  }

  // 4. In standard browser on local LAN (e.g. https://172.30.250.210:5000), use window origin
  if (!isNativeApp()) {
    const origin = window.location.origin;
    // Always map port 5001 to canonical port 5000 for socket and API calls
    if (window.location.port === '5001') {
      return origin.replace(':5001', ':5000');
    }
    return origin;
  }

  return DEFAULT_SERVER_URL;
}

export function setServerUrl(newUrl) {
  if (!newUrl) return DEFAULT_SERVER_URL;
  let clean = newUrl.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  localStorage.setItem('remote_server_url', clean);
  return clean;
}

