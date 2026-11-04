import React from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  X,
  Download,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export function InstallModal({ isOpen, onClose }) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
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
                Download RemoteLens APK
              </h3>
              <p
                className="text-xs"
                style={{ color: isDark ? '#888888' : '#666666' }}
              >
                Native Android App for full hardware camera access
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

        {/* APK Download Box */}
        <div
          className="p-5 rounded-2xl border space-y-4 mb-4"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div className="space-y-1">
            <h4
              className="text-sm font-bold flex items-center gap-2"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              <span>Android Application Package</span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border border-neutral-500 text-neutral-400">
                v1.0.0
              </span>
            </h4>
            <p
              className="text-xs leading-relaxed"
              style={{ color: isDark ? '#a3a3a3' : '#666666' }}
            >
              Direct installable package compiled with full Camera2 API access, zero-lag streaming, and background keepalive.
            </p>
          </div>

          {/* Big Download Button */}
          <a
            href="/RemoteLens.apk"
            download="RemoteLens.apk"
            className="w-full py-3 px-4 rounded-xl font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2.5 active:scale-95"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Download className="w-4 h-4" />
            <span>Download .APK (4.5 MB)</span>
          </a>

          {/* Quick steps */}
          <div
            className="p-3 rounded-xl border text-[11px] space-y-1.5"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#a3a3a3' : '#525252',
            }}
          >
            <span className="font-semibold block" style={{ color: isDark ? '#ffffff' : '#000000' }}>
              How to install:
            </span>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
              <span>Tap <strong>Download .APK</strong> to download the file directly to your phone.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
              <span>Open the downloaded file from your notification bar or <strong>Downloads</strong> folder.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
              <span>If prompted by Android, tap <strong>"Allow installation from this source"</strong>.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

