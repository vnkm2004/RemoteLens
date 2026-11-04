import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getServerUrl } from '../utils/serverUrl';
import {
  X,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Zap,
  Camera,
} from 'lucide-react';

export function QrModal({ isOpen, onClose, onOpenScanner }) {
  const { networkInfo, user } = useAuth();
  const { isDark } = useTheme();

  const [copied, setCopied] = useState(false);
  const [qrCodeSrc, setQrCodeSrc] = useState(null);

  // In native Android APK or browser, use networkInfo URL or fallback to known server URL
  const baseOrigin = networkInfo?.url
    ? networkInfo.url.split('?')[0]
    : getServerUrl();

  const pairUrl = user
    ? `${baseOrigin}?pair=${encodeURIComponent(user.username)}`
    : baseOrigin;

  useEffect(() => {
    if (!isOpen) return;

    // Fetch dynamic QR code representing pairUrl using absolute server address
    const targetEndpoint = `${getServerUrl()}/api/qr?url=${encodeURIComponent(pairUrl)}`;
    fetch(targetEndpoint)
      .then((res) => res.json())
      .then((data) => {
        if (data.qrDataUrl) {
          setQrCodeSrc(data.qrDataUrl);
        }
      })
      .catch((err) => {
        console.log('Error fetching QR code from:', targetEndpoint, err);
        setQrCodeSrc(networkInfo?.qrDataUrl);
      });
  }, [isOpen, pairUrl, networkInfo]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(pairUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border p-5 sm:p-7 shadow-2xl transition-all"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border shrink-0"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-base font-bold tracking-tight transition-colors"
                style={{ color: isDark ? '#ffffff' : '#000000' }}
              >
                1-Tap Pair Device B
              </h3>
              <p
                className="text-xs transition-colors"
                style={{ color: isDark ? '#a3a3a3' : '#737373' }}
              >
                Scan with Device B camera to connect instantly
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors border shrink-0"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div
          className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl border shadow-sm mb-4"
          style={{
            backgroundColor: '#ffffff',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          {qrCodeSrc ? (
            <img
              src={qrCodeSrc}
              alt="Scan to pair Phone B"
              className="w-52 h-52 sm:w-56 sm:h-56 object-contain"
            />
          ) : (
            <div className="w-52 h-52 sm:w-56 sm:h-56 flex items-center justify-center text-neutral-400 text-xs">
              Loading QR code...
            </div>
          )}
          <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-black tracking-wider uppercase">
            <Zap className="w-3.5 h-3.5" />
            <span>Scan to auto-pair (No typing needed)</span>
          </div>
        </div>

        {/* Scan Another Device QR Trigger */}
        {onOpenScanner && (
          <div className="mb-4">
            <button
              onClick={() => {
                onClose();
                onOpenScanner();
              }}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#333333' : '#d4d4d4',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Camera className="w-4 h-4" />
              <span>Or Scan Another Device's QR Code</span>
            </button>
          </div>
        )}

        {/* URL Box with Copy */}
        <div className="space-y-2 mb-4">
          <label
            className="block text-xs font-semibold uppercase tracking-wider transition-colors"
            style={{ color: isDark ? '#d4d4d4' : '#262626' }}
          >
            Or open this address on Device B:
          </label>
          <div className="flex items-center gap-2">
            <div
              className="flex-1 px-3 py-2 rounded-xl border text-xs font-mono truncate"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#d4d4d4',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              {pairUrl}
            </div>
            <button
              onClick={handleCopy}
              className="p-2 sm:p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0 active:scale-95"
              style={{
                backgroundColor: isDark ? '#ffffff' : '#000000',
                borderColor: isDark ? '#ffffff' : '#000000',
                color: isDark ? '#000000' : '#ffffff',
              }}
              title="Copy URL"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div
          className="p-3 rounded-xl border text-xs space-y-1 transition-colors"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
            color: isDark ? '#d4d4d4' : '#262626',
          }}
        >
          <div
            className="flex items-center gap-1.5 font-semibold"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Instant Zero-Password Pairing:</span>
          </div>
          <p
            className="text-[11px] leading-relaxed"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Scanning opens the app on Device B and automatically joins room{' '}
            <strong style={{ color: isDark ? '#ffffff' : '#000000' }}>
              {user ? user.username : 'your session'}
            </strong>
            . Device B will immediately show up in your connected devices list!
          </p>
        </div>
      </div>
    </div>
  );
}
