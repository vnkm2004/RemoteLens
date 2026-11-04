// Centralized Server URL Resolver for Web and Native APK
const DEFAULT_HOST_IP = '172.30.250.210:5000';
const DEFAULT_SERVER_URL = `https://${DEFAULT_HOST_IP}`;

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

  // In standard browser on LAN (e.g. https://172.30.250.210:5000), use origin
  if (!isNativeApp()) {
    const origin = window.location.origin;
    // Always map port 5001 to canonical port 5000 for socket and API calls
    if (window.location.port === '5001') {
      return origin.replace(':5001', ':5000');
    }
    return origin;
  }

  // In native Android APK, use saved server URL or default LAN host
  const saved = localStorage.getItem('remote_server_url');
  if (saved && saved.trim()) {
    return saved.trim().replace(/\/+$/, '');
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

