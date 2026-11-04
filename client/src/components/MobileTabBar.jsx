import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Smartphone,
  Camera,
  QrCode,
  Images,
  LogOut,
} from 'lucide-react';

export function MobileTabBar({
  onOpenQr,
  onOpenScanner,
  onOpenGallery,
  savedPhotosCount = 0,
}) {
  const { user, logout, activeSession } = useAuth();
  const { isDark } = useTheme();

  // Hide tab bar when full-screen camera viewfinder is active
  if (activeSession || !user) return null;

  return (
    <nav
      className="sm:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-lg transition-colors"
      style={{
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#262626' : '#e5e5e5',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)',
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {/* Tab 1: Devices / Home */}
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all active:scale-95"
          style={{ color: isDark ? '#ffffff' : '#000000' }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              borderColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold tracking-tight">Devices</span>
        </button>

        {/* Tab 2: Scan QR */}
        <button
          type="button"
          onClick={onOpenScanner}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all active:scale-95 text-neutral-400 hover:text-white"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Camera className="w-4 h-4" />
          </div>
          <span
            className="text-[10px] font-medium tracking-tight"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Scan QR
          </span>
        </button>

        {/* Tab 3: Pair QR */}
        <button
          type="button"
          onClick={onOpenQr}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all active:scale-95"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <QrCode className="w-4 h-4" />
          </div>
          <span
            className="text-[10px] font-medium tracking-tight"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Pair QR
          </span>
        </button>

        {/* Tab 4: Gallery */}
        <button
          type="button"
          onClick={onOpenGallery}
          className="relative flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all active:scale-95"
        >
          <div
            className="relative w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Images className="w-4 h-4" />
            {savedPhotosCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[14px] h-[14px] text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                }}
              >
                {savedPhotosCount}
              </span>
            )}
          </div>
          <span
            className="text-[10px] font-medium tracking-tight"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Gallery
          </span>
        </button>

        {/* Tab 5: Logout */}
        <button
          type="button"
          onClick={logout}
          className="flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all active:scale-95"
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#a3a3a3' : '#737373',
            }}
          >
            <LogOut className="w-4 h-4" />
          </div>
          <span
            className="text-[10px] font-medium tracking-tight"
            style={{ color: isDark ? '#737373' : '#a3a3a3' }}
          >
            Exit
          </span>
        </button>
      </div>
    </nav>
  );
}

