// Centralized Server URL Resolver for Web and Native APK
const ENV_SERVER_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL
  ? import.meta.env.VITE_SERVER_URL.trim().replace(/\/+$/, '')
  : null;

export const PRODUCTION_SERVER_URL = 'https://remotelensserver.vnkm.in';
export const PRODUCTION_FRONTEND_URL = 'https://remotelens.vnkm.in';

const DEFAULT_SERVER_URL = ENV_SERVER_URL || PRODUCTION_SERVER_URL;

export function isNativeApp() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.Capacitor?.isNativePlatform?.() ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && !window.location.port) ||
    window.location.hostname === 'localhost'
  );
}

export function getFrontendUrl() {
  if (typeof window !== 'undefined' && window.location.origin && window.location.origin.startsWith('http')) {
    const host = window.location.hostname;
    // If running on user domain or vercel domain, use current origin
    if (host.includes('remotelens.vnkm.in') || host.includes('vnkm.in') || host.includes('vercel.app')) {
      return window.location.origin;
    }
  }
  // Everywhere else (APK, internal IPs, localhost), always return the public production frontend URL
  return PRODUCTION_FRONTEND_URL;
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

  // 3. If hosted on custom production domain or cloud platform
  const hostname = window.location.hostname;
  if (
    hostname.includes('remotelens.vnkm.in') ||
    hostname.includes('vnkm.in') ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app')
  ) {
    return PRODUCTION_SERVER_URL;
  }

  // 4. In native Android APK, default to live cloud server so it works anywhere out of the box
  if (isNativeApp()) {
    return PRODUCTION_SERVER_URL;
  }

  // 5. In standard browser on local LAN (e.g. https://172.30.250.210:5000), use window origin
  const origin = window.location.origin;
  if (origin && !origin.includes('localhost') && origin.startsWith('http')) {
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

