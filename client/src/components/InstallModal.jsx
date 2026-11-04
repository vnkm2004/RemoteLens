import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Download,
  Smartphone,
  Check,
  ExternalLink,
  Laptop,
  Layers,
  ArrowRight,
} from 'lucide-react';

export function InstallModal({ isOpen, onClose }) {
  const { isDark } = useTheme();

  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    } else {
      alert('To install:\n1. Tap the browser menu (3 dots at top right) or Share button.\n2. Tap "Install App" or "Add to Home screen".');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-2xl transition-all"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-base font-bold tracking-tight"
                style={{ color: isDark ? '#ffffff' : '#000000' }}
              >
                Install RemoteLens Pro
              </h3>
              <p
                className="text-xs"
                style={{ color: isDark ? '#888888' : '#666666' }}
              >
                Use offline with hardware camera access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Option 1: PWA Add to Home Screen (Instant) */}
        <div
          className="p-4 rounded-2xl border mb-4 space-y-3"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4
                className="text-sm font-bold flex items-center gap-1.5"
                style={{ color: isDark ? '#ffffff' : '#000000' }}
              >
                <span>Option 1: Add to Mobile Home Screen</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-neutral-500 text-neutral-400">
                  Instant
                </span>
              </h4>
              <p
                className="text-xs mt-1 leading-relaxed"
                style={{ color: isDark ? '#888888' : '#666666' }}
              >
                Installs as a standalone full-screen mobile app directly from Chrome or Safari with zero APK builds.
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-95"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Download className="w-4 h-4" />
            <span>{isInstalled ? 'App Already Installed' : 'Install to Home Screen'}</span>
          </button>

          <div
            className="p-2.5 rounded-xl border text-[11px] space-y-1"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#a3a3a3' : '#525252',
            }}
          >
            <span className="font-semibold block" style={{ color: isDark ? '#ffffff' : '#000000' }}>
              How to install in browser:
            </span>
            <span>• <strong>Android Chrome:</strong> Tap the 3 dots <code>⋮</code> at top right &gt; tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</span>
            <br />
            <span>• <strong>iPhone Safari:</strong> Tap Share button <code>⎋</code> &gt; tap <strong>"Add to Home Screen"</strong>.</span>
          </div>
        </div>

        {/* Option 2: Native Android APK */}
        <div
          className="p-4 rounded-2xl border space-y-3"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div>
            <h4
              className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              <span>Option 2: Native Android APK</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-neutral-500 text-neutral-400">
                Capacitor
              </span>
            </h4>
            <p
              className="text-xs mt-1 leading-relaxed"
              style={{ color: isDark ? '#888888' : '#666666' }}
            >
              The native Android project is prepared in <code>client/android/</code>.
            </p>
          </div>

          <a
            href="/api/download/apk"
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 active:scale-95"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#404040' : '#d4d4d4',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Download className="w-4 h-4" />
            <span>Download .APK (If Compiled)</span>
          </a>

          <p
            className="text-[11px] leading-relaxed"
            style={{ color: isDark ? '#737373' : '#888888' }}
          >
            To compile APK on your PC: run <code>npm run android:open</code> to open Android Studio and click <strong>Build &gt; Build APK</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

