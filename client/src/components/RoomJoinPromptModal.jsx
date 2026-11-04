import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Radio, ShieldCheck, Check, X, Smartphone, CheckSquare, Square } from 'lucide-react';

export function RoomJoinPromptModal({ request, onRespond }) {
  const { isDark } = useTheme();
  const [remember, setRemember] = useState(true);

  // Sound chime & vibration on prompt arrival
  useEffect(() => {
    if (!request) return;

    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
      gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.36);
    } catch (e) {}

    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [request]);

  if (!request) return null;

  const handleAccept = () => {
    onRespond(true, remember);
  };

  const handleDecline = () => {
    onRespond(false, false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-sm rounded-3xl border overflow-hidden shadow-2xl p-5 sm:p-6 space-y-5 animate-scale-up"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
          color: isDark ? '#ffffff' : '#000000',
        }}
      >
        {/* Header Icon */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border animate-pulse-ring shrink-0"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Radio className="w-6 h-6" />
          </div>
          <div>
            <span
              className="text-[10px] font-mono uppercase tracking-wider font-bold"
              style={{ color: isDark ? '#a3a3a3' : '#737373' }}
            >
              Pairing Request
            </span>
            <h3 className="text-base font-bold leading-tight">Device Pairing Request</h3>
          </div>
        </div>

        {/* Requester Details */}
        <div
          className="rounded-2xl border p-3.5 space-y-1.5"
          style={{
            backgroundColor: isDark ? '#121212' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 shrink-0" style={{ color: isDark ? '#ffffff' : '#000000' }} />
            <h4 className="text-sm font-bold truncate">
              {request.requesterDeviceName || 'Remote Device'}
            </h4>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: isDark ? '#a3a3a3' : '#737373' }}>
            Wants to join your room{' '}
            <strong className="underline" style={{ color: isDark ? '#ffffff' : '#000000' }}>
              {request.targetRoom}
            </strong>{' '}
            and pair with your device for zero-loss camera control.
          </p>
        </div>

        {/* Remember Permission Checkbox */}
        <div
          onClick={() => setRemember(!remember)}
          className="flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none transition-colors"
          style={{
            backgroundColor: isDark ? '#141414' : '#f5f5f5',
          }}
        >
          <div className="shrink-0" style={{ color: isDark ? '#ffffff' : '#000000' }}>
            {remember ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
          </div>
          <span className="text-xs font-medium" style={{ color: isDark ? '#e5e5e5' : '#262626' }}>
            Remember this device (Always allow future connections)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#333333' : '#d4d4d4',
              color: isDark ? '#a3a3a3' : '#737373',
            }}
          >
            <X className="w-3.5 h-3.5" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept & Pair</span>
          </button>
        </div>
      </div>
    </div>
  );
}

