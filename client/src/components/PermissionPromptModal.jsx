import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Camera,
  ShieldAlert,
  Check,
  X,
  Smartphone,
  CheckSquare,
  Square,
} from 'lucide-react';

export function PermissionPromptModal() {
  const { incomingRequest, respondCameraAccess } = useAuth();
  const { isDark } = useTheme();

  const [selectedFacing, setSelectedFacing] = useState('environment');
  const [remember, setRemember] = useState(true);

  // Pleasant notification chime and vibration when incoming request modal opens
  useEffect(() => {
    if (!incomingRequest) return;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([200, 100, 200]);
      } catch (e) {}
    }

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.12); // E5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
  }, [incomingRequest]);

  if (!incomingRequest) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border p-6 sm:p-7 shadow-2xl transition-all"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        {/* Header Icon */}
        <div className="flex items-center gap-3.5 mb-5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border animate-pulse-ring shrink-0"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3
              className="text-lg font-bold tracking-tight leading-snug transition-colors"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Camera Access Request
            </h3>
            <p
              className="text-xs mt-0.5 transition-colors"
              style={{ color: isDark ? '#a3a3a3' : '#737373' }}
            >
              Remote device permission needed
            </p>
          </div>
        </div>

        {/* Content Box */}
        <div
          className="p-4 rounded-2xl border mb-5 space-y-2 transition-all"
          style={{
            backgroundColor: isDark ? '#141414' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div
            className="flex items-center gap-2 text-sm font-medium transition-colors"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            <Smartphone className="w-4 h-4 shrink-0" />
            <span>
              Device <strong style={{ color: isDark ? '#ffffff' : '#000000' }}>{incomingRequest.requesterName}</strong> wants to connect to your camera.
            </span>
          </div>
          <p
            className="text-xs leading-relaxed transition-colors"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            If accepted, Device A will view your live camera preview and can remotely capture full-resolution photos directly to Device A's storage.
          </p>
        </div>

        {/* Camera Choice */}
        <div className="mb-6">
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2 transition-colors"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            Select Initial Camera:
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedFacing('environment')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                selectedFacing === 'environment'
                  ? (isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white')
                  : (isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-400' : 'border-neutral-200 bg-neutral-100 text-neutral-600')
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Back Camera</span>
              <span className="text-[10px] font-normal opacity-80">High-Res Main Lens</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFacing('user')}
              className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1.5 ${
                selectedFacing === 'user'
                  ? (isDark ? 'border-white bg-white text-black' : 'border-black bg-black text-white')
                  : (isDark ? 'border-neutral-800 bg-neutral-900 text-neutral-400' : 'border-neutral-200 bg-neutral-100 text-neutral-600')
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Front Camera</span>
              <span className="text-[10px] font-normal opacity-80">Selfie Lens</span>
            </button>
          </div>
        </div>

        {/* Remember Permission Checkbox */}
        <div
          onClick={() => setRemember(!remember)}
          className="flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer select-none transition-colors mb-5"
          style={{
            backgroundColor: isDark ? '#141414' : '#f5f5f5',
          }}
        >
          <div className="shrink-0" style={{ color: isDark ? '#ffffff' : '#000000' }}>
            {remember ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </div>
          <span className="text-xs font-medium" style={{ color: isDark ? '#e5e5e5' : '#262626' }}>
            Remember permission (Auto-allow this device in future)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => respondCameraAccess(false)}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{
              backgroundColor: isDark ? '#141414' : '#ffffff',
              borderColor: isDark ? '#262626' : '#d4d4d4',
              color: isDark ? '#a3a3a3' : '#737373',
            }}
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            type="button"
            onClick={() => respondCameraAccess(true, selectedFacing, remember)}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98]"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Check className="w-4 h-4" />
            <span>Accept & Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}
