import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NearbyRooms } from './NearbyRooms';
import {
  Camera,
  Smartphone,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  Lock,
  User,
  QrCode,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Server,
  LogIn,
  Check,
  Scan,
} from 'lucide-react';

export function AuthView({ onOpenQr, onOpenInstall, onOpenScanner }) {
  const {
    login,
    quickConnect,
    deviceName,
    setDeviceName,
    serverUrl,
    setServerUrl,
    isNative,
  } = useAuth();
  const { isDark } = useTheme();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [editingDeviceName, setEditingDeviceName] = useState(deviceName);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [customServerIp, setCustomServerIp] = useState(serverUrl || 'https://172.30.250.210:5000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 1-Tap Instant Connect (Creates a new room)
  const handleInstantConnect = async () => {
    setError('');
    setLoading(true);
    try {
      if (editingDeviceName.trim() && editingDeviceName !== deviceName) {
        setDeviceName(editingDeviceName.trim());
      }
      await quickConnect();
    } catch (err) {
      setError(err.message || 'Instant connection failed. Verify Wi-Fi / Hotspot connection.');
    } finally {
      setLoading(false);
    }
  };

  // Join Existing Room Code (e.g. from Device A)
  const handleJoinExistingRoom = async (e) => {
    e.preventDefault();
    if (!joinRoomCode.trim()) {
      setError('Please enter a room code (e.g. 1234567890)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (editingDeviceName.trim() && editingDeviceName !== deviceName) {
        setDeviceName(editingDeviceName.trim());
      }
      await login(joinRoomCode.trim(), '');
    } catch (err) {
      setError(err.message || 'Failed to join room. Verify room code.');
    } finally {
      setLoading(false);
    }
  };

  // Custom credentials submit
  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter a room name or ID');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (editingDeviceName.trim() && editingDeviceName !== deviceName) {
        setDeviceName(editingDeviceName.trim());
      }
      await login(username.trim(), password.trim());
    } catch (err) {
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveServerUrl = (e) => {
    e.preventDefault();
    if (customServerIp.trim()) {
      setServerUrl(customServerIp.trim());
      setShowServerConfig(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-md space-y-5">
        {/* Header Hero */}
        <div className="text-center">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl flex items-center justify-center border shadow-sm transition-all"
            style={{
              backgroundColor: isDark ? '#171717' : '#f5f5f5',
              borderColor: isDark ? '#333333' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Camera className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <h2
            className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1.5 transition-colors"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            Remote Camera Sync
          </h2>
          <p
            className="text-xs sm:text-sm max-w-sm mx-auto leading-relaxed transition-colors"
            style={{ color: isDark ? '#a3a3a3' : '#525252' }}
          >
            Connect Device A and Device B over local Wi-Fi or hotspot. View real-time stream and capture lossless photos.
          </p>
        </div>

        {/* Server Connection Pill (Essential for Native Android APK) */}
        <div
          className="rounded-2xl border p-2.5 px-3.5 backdrop-blur-md flex items-center justify-between gap-2 shadow-sm text-xs"
          style={{
            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <div className="flex items-center gap-2 truncate">
            <Server className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="text-[11px] text-neutral-400 truncate">
              Server: <strong className="text-white">{serverUrl}</strong>
            </span>
          </div>
          <button
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="text-[11px] font-semibold underline shrink-0 transition-colors"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            {showServerConfig ? 'Close' : 'Change IP'}
          </button>
        </div>

        {/* Server IP Config Drawer */}
        {showServerConfig && (
          <form
            onSubmit={handleSaveServerUrl}
            className="rounded-2xl border p-3.5 backdrop-blur-md space-y-2 animate-fade-in text-xs shadow-sm"
            style={{
              backgroundColor: isDark ? '#141414' : '#fafafa',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <label className="block text-[11px] font-semibold text-neutral-300">
              Host PC / Server Address (e.g. https://172.30.250.210:5000):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customServerIp}
                onChange={(e) => setCustomServerIp(e.target.value)}
                placeholder="https://172.30.250.210:5000"
                className="flex-1 px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none"
                style={{
                  backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                  borderColor: isDark ? '#404040' : '#d4d4d4',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl font-bold text-xs shadow flex items-center gap-1 active:scale-95"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </form>
        )}

        {/* Main Connect Card */}
        <div
          className="rounded-3xl border p-5 sm:p-7 backdrop-blur-md shadow-sm transition-all space-y-4"
          style={{
            backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          {error && (
            <div
              className="p-3.5 rounded-xl border text-xs flex items-center gap-2.5"
              style={{
                backgroundColor: isDark ? '#171717' : '#f5f5f5',
                borderColor: isDark ? '#404040' : '#d4d4d4',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Action 1: Join Existing Room Code */}
          <form onSubmit={handleJoinExistingRoom} className="space-y-2">
            <label
              className="block text-xs font-bold uppercase tracking-wider transition-colors"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Join Other Device's Room
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Enter Room Code (e.g. 1234567890)"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value)}
                  className="w-full px-3.5 py-3 rounded-xl text-xs font-mono border focus:outline-none"
                  style={{
                    backgroundColor: isDark ? '#121212' : '#ffffff',
                    borderColor: isDark ? '#404040' : '#d4d4d4',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !joinRoomCode.trim()}
                className="py-3 px-4 rounded-xl font-bold text-xs shadow transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50 shrink-0"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Join</span>
              </button>
            </div>
            <p className="text-[10px] text-neutral-400">
              Enter the exact room name shown on Device A to pair immediately.
            </p>
          </form>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t w-full" style={{ borderColor: isDark ? '#262626' : '#e5e5e5' }}></div>
            <span
              className="absolute px-3 text-[10px] uppercase font-bold tracking-wider"
              style={{
                backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                color: isDark ? '#737373' : '#737373',
              }}
            >
              or start new session
            </span>
          </div>

          {/* Action 2: 1-Tap Instant Connect (Creates a new room) */}
          <div className="space-y-1.5">
            <button
              onClick={handleInstantConnect}
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs border shadow-sm transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#333333' : '#d4d4d4',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{loading ? 'Creating...' : '1-Tap Instant Connect (New Room)'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 3: Scan QR to Join or Show QR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {onOpenScanner && (
              <button
                onClick={onOpenScanner}
                type="button"
                className="py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
                style={{
                  backgroundColor: isDark ? '#141414' : '#f5f5f5',
                  borderColor: isDark ? '#333333' : '#d4d4d4',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Scan QR to Join</span>
              </button>
            )}

            <button
              onClick={onOpenQr}
              type="button"
              className="py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              style={{
                backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#a3a3a3' : '#525252',
              }}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show Pair QR</span>
            </button>
          </div>

          {/* Collapsible Custom Room & Password Section */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-xs font-semibold py-1 transition-colors"
              style={{ color: isDark ? '#a3a3a3' : '#525252' }}
            >
              <span>Custom Room ID / Passcode</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <form onSubmit={handleCustomSubmit} className="mt-2 space-y-2.5 animate-fade-in">
                <div>
                  <label
                    className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: isDark ? '#d4d4d4' : '#262626' }}
                  >
                    Room ID
                  </label>
                  <div className="relative">
                    <div
                      className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      style={{ color: isDark ? '#737373' : '#a3a3a3' }}
                    >
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. camera123"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                      style={{
                        backgroundColor: isDark ? '#121212' : '#ffffff',
                        borderColor: isDark ? '#2e2e2e' : '#d4d4d4',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: isDark ? '#d4d4d4' : '#262626' }}
                  >
                    Passcode (Optional)
                  </label>
                  <div className="relative">
                    <div
                      className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      style={{ color: isDark ? '#737373' : '#a3a3a3' }}
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="password"
                      placeholder="Leave blank for no password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                      style={{
                        backgroundColor: isDark ? '#121212' : '#ffffff',
                        borderColor: isDark ? '#2e2e2e' : '#d4d4d4',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
                    style={{ color: isDark ? '#d4d4d4' : '#262626' }}
                  >
                    Device Name
                  </label>
                  <div className="relative">
                    <div
                      className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
                      style={{ color: isDark ? '#737373' : '#a3a3a3' }}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. Device A or Device B"
                      value={editingDeviceName}
                      onChange={(e) => setEditingDeviceName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                      style={{
                        backgroundColor: isDark ? '#121212' : '#ffffff',
                        borderColor: isDark ? '#2e2e2e' : '#d4d4d4',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  style={{
                    backgroundColor: isDark ? '#ffffff' : '#000000',
                    color: isDark ? '#000000' : '#ffffff',
                  }}
                >
                  <span>Connect to Custom Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Nearby Devices & Rooms on Local Wi-Fi */}
        <NearbyRooms onJoined={(roomId) => login(roomId, '')} />

        {/* Install App / Download APK Banner Card (Hidden in native APK) */}
        {!isNative && (
          <div
            className="rounded-2xl border p-4 backdrop-blur-md flex items-center justify-between gap-3 shadow-sm"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <div className="flex items-center gap-2.5 truncate">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                style={{
                  backgroundColor: isDark ? '#141414' : '#f5f5f5',
                  borderColor: isDark ? '#262626' : '#e5e5e5',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <Download className="w-4 h-4" />
              </div>
              <div className="truncate">
                <h4
                  className="text-xs font-bold truncate"
                  style={{ color: isDark ? '#ffffff' : '#000000' }}
                >
                  Install App & APK
                </h4>
                <p
                  className="text-[10px] truncate"
                  style={{ color: isDark ? '#737373' : '#737373' }}
                >
                  Home screen PWA or Android APK
                </p>
              </div>
            </div>

            <button
              onClick={onOpenInstall}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all active:scale-95 shrink-0"
              style={{
                backgroundColor: isDark ? '#ffffff' : '#000000',
                color: isDark ? '#000000' : '#ffffff',
              }}
            >
              Install
            </button>
          </div>
        )}

        {/* Features row */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className="p-2.5 rounded-xl border text-center transition-all shadow-sm"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <ShieldCheck
              className="w-4 h-4 mx-auto mb-1"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
            <span
              className="block text-[10px] font-semibold truncate"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Zero Loss
            </span>
            <span
              className="block text-[9px] truncate"
              style={{ color: isDark ? '#737373' : '#737373' }}
            >
              Raw Sensor
            </span>
          </div>

          <div
            className="p-2.5 rounded-xl border text-center transition-all shadow-sm"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <Zap
              className="w-4 h-4 mx-auto mb-1"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
            <span
              className="block text-[10px] font-semibold truncate"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              WebRTC P2P
            </span>
            <span
              className="block text-[9px] truncate"
              style={{ color: isDark ? '#737373' : '#737373' }}
            >
              Offline Wi-Fi
            </span>
          </div>

          <div
            className="p-2.5 rounded-xl border text-center transition-all shadow-sm"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <Sparkles
              className="w-4 h-4 mx-auto mb-1"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            />
            <span
              className="block text-[10px] font-semibold truncate"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Auto Save
            </span>
            <span
              className="block text-[9px] truncate"
              style={{ color: isDark ? '#737373' : '#737373' }}
            >
              Device Storage
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
