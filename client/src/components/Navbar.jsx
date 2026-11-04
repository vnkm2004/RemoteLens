import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { isNativeApp } from '../utils/serverUrl';
import {
  Camera,
  QrCode,
  Images,
  LogOut,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  User,
  Download,
} from 'lucide-react';

export function Navbar({ onOpenQr, onOpenScanner, onOpenGallery, onOpenInstall, savedPhotosCount = 0 }) {
  const { user, isConnected, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const isNative = isNativeApp();

  return (
    <header
      className="sticky top-0 z-40 w-full border-b backdrop-blur-md transition-colors duration-150"
      style={{
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        borderColor: isDark ? '#262626' : '#e5e5e5',
        paddingTop: 'max(env(safe-area-inset-top, 0px), 10px)',
        paddingBottom: '2px',
      }}
    >
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 h-13 sm:h-16 flex items-center justify-between">
        {/* App Logo & Name */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div
            className="w-7 h-7 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform hover:scale-105 shadow-sm shrink-0"
            style={{
              backgroundColor: isDark ? '#ffffff' : '#000000',
              color: isDark ? '#000000' : '#ffffff',
            }}
          >
            <Camera className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1
              className="font-bold text-sm sm:text-lg tracking-tight leading-none flex items-center gap-1 sm:gap-1.5 transition-colors"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              <span>RemoteLens</span>
              <span
                className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider px-1 sm:px-1.5 py-0.5 rounded border"
                style={{
                  backgroundColor: isDark ? '#171717' : '#f5f5f5',
                  borderColor: isDark ? '#404040' : '#d4d4d4',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                PRO
              </span>
            </h1>
            <p
              className="hidden sm:block text-xs font-medium mt-0.5 transition-colors"
              style={{ color: isDark ? '#a3a3a3' : '#525252' }}
            >
              Lossless Remote Camera Sync
            </p>
          </div>
        </div>

        {/* Action Controls - On Mobile: ONLY Download and Theme. Others in Mobile Bottom Tab Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 1. Install / APK button (Hide in native APK) */}
          {!isNative && (
            <button
              onClick={onOpenInstall}
              title="Download Android APK"
              className="p-1.5 sm:p-2.5 rounded-xl border transition-all active:scale-95 flex items-center gap-1.5"
              style={{
                backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden md:inline text-xs font-bold">Download APK</span>
            </button>
          )}

          {/* 2. Theme Switcher (Clean Pure Black & Clean Pure White) */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Switch to Clean White Theme' : 'Switch to Clean Black Theme'}
            className="p-1.5 sm:p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 shrink-0 flex items-center justify-center"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
            )}
          </button>

          {/* 3. Desktop Only: Saved Photos Gallery (On mobile, placed in bottom tabs) */}
          {user && (
            <button
              onClick={onOpenGallery}
              title="View Saved Photos"
              className="hidden sm:flex relative p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 items-center justify-center"
              style={{
                backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Images className="w-4 h-4" />
              {savedPhotosCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                    color: isDark ? '#000000' : '#ffffff',
                  }}
                >
                  {savedPhotosCount}
                </span>
              )}
            </button>
          )}

          {/* 4. Desktop Only: User Profile / Logout (On mobile, placed in bottom tabs) */}
          {user && (
            <div className="hidden sm:flex items-center gap-1.5 shrink-0">
              <div
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border"
                style={{
                  backgroundColor: isDark ? '#171717' : '#f5f5f5',
                  borderColor: isDark ? '#404040' : '#e5e5e5',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold max-w-[90px] truncate">{user.username}</span>
              </div>
              <button
                onClick={logout}
                title="Log out"
                className="p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                  borderColor: isDark ? '#262626' : '#e5e5e5',
                  color: isDark ? '#a3a3a3' : '#737373',
                }}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
