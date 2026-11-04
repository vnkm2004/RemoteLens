import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NearbyRooms } from './NearbyRooms';
import {
  Smartphone,
  Camera,
  Wifi,
  QrCode,
  Edit2,
  Check,
  RefreshCw,
  Video,
  Info,
  Radio,
  Download,
  X,
  LogIn,
  AlertTriangle,
  ShieldCheck,
  Scan,
} from 'lucide-react';

export function DeviceManager({ onOpenQr, onOpenScanner, onOpenInstall, onStartLocalHost }) {
  const {
    user,
    deviceId,
    deviceName,
    setDeviceName,
    devices,
    requestCameraAccess,
    cancelCameraRequest,
    requestStatus,
    login,
    isNative,
    getSavedPermissionsCount,
    clearSavedPermissions,
    joinRequestStatus,
    joinRequestError,
    cancelJoinRequest,
  } = useAuth();
  const { isDark } = useTheme();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(deviceName);
  const [isChangingRoom, setIsChangingRoom] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [roomChangeError, setRoomChangeError] = useState('');
  const [savedCount, setSavedCount] = useState(getSavedPermissionsCount());

  // Filter out current device to see peer devices
  const otherDevices = devices.filter((d) => d.deviceId !== deviceId);

  const handleSaveName = (e) => {
    e.preventDefault();
    if (tempName.trim()) {
      setDeviceName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const handleRoomSwitch = async (e) => {
    e.preventDefault();
    if (!newRoomId.trim()) return;
    setRoomChangeError('');
    try {
      await login(newRoomId.trim(), '');
      setIsChangingRoom(false);
      setNewRoomId('');
    } catch (err) {
      setRoomChangeError(err.message || 'Failed to switch room');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Current Device Card */}
      <div
        className="rounded-3xl border p-4 sm:p-6 backdrop-blur-md shadow-sm transition-all"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-colors"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Smartphone className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                {isEditingName ? (
                  <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      className="px-2.5 py-1 text-xs sm:text-sm rounded-lg border focus:outline-none"
                      style={{
                        backgroundColor: isDark ? '#141414' : '#ffffff',
                        borderColor: isDark ? '#404040' : '#d4d4d4',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="p-1 rounded transition-colors"
                      style={{
                        backgroundColor: isDark ? '#ffffff' : '#000000',
                        color: isDark ? '#000000' : '#ffffff',
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <>
                    <h2
                      className="text-base sm:text-lg font-bold tracking-tight truncate transition-colors"
                      style={{ color: isDark ? '#ffffff' : '#000000' }}
                    >
                      {deviceName}
                    </h2>
                    <button
                      onClick={() => {
                        setTempName(deviceName);
                        setIsEditingName(true);
                      }}
                      className="transition-colors shrink-0"
                      style={{ color: isDark ? '#737373' : '#a3a3a3' }}
                      title="Edit device name"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shrink-0"
                  style={{
                    backgroundColor: isDark ? '#141414' : '#f5f5f5',
                    borderColor: isDark ? '#404040' : '#d4d4d4',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                >
                  This Device
                </span>
              </div>

              {/* Room ID with instant Change Room switcher */}
              <div className="flex items-center gap-2 mt-1">
                <p
                  className="text-xs font-mono truncate transition-colors"
                  style={{ color: isDark ? '#a3a3a3' : '#737373' }}
                >
                  Room:{' '}
                  <span className="font-bold underline" style={{ color: isDark ? '#ffffff' : '#000000' }}>
                    {user?.username}
                  </span>
                </p>
                <button
                  onClick={() => {
                    setIsChangingRoom(!isChangingRoom);
                    setNewRoomId('');
                    setRoomChangeError('');
                  }}
                  className="px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all active:scale-95"
                  style={{
                    backgroundColor: isDark ? '#1a1a1a' : '#f0f0f0',
                    borderColor: isDark ? '#333333' : '#d4d4d4',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                  title="Switch to another room to connect with your other device"
                >
                  {isChangingRoom ? 'Cancel' : 'Change Room'}
                </button>
              </div>

              {/* Saved Permissions Local Storage Status */}
              {savedCount > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border"
                    style={{
                      backgroundColor: isDark ? '#141414' : '#f5f5f5',
                      borderColor: isDark ? '#333333' : '#e5e5e5',
                      color: isDark ? '#ffffff' : '#000000',
                    }}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{savedCount} Saved Permission{savedCount > 1 ? 's' : ''}</span>
                  </span>
                  <button
                    onClick={() => {
                      clearSavedPermissions();
                      setSavedCount(0);
                    }}
                    className="text-[10px] underline font-semibold text-neutral-400 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Download APK Trigger (Hidden in APK) */}
          {!isNative && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenInstall}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
                style={{
                  backgroundColor: isDark ? '#141414' : '#f5f5f5',
                  borderColor: isDark ? '#333333' : '#e5e5e5',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download APK</span>
              </button>
            </div>
          )}
        </div>

        {/* Change Room Drawer */}
        {isChangingRoom && (
          <form
            onSubmit={handleRoomSwitch}
            className="mt-4 pt-4 border-t space-y-2 animate-fade-in"
            style={{ borderColor: isDark ? '#262626' : '#e5e5e5' }}
          >
            <label className="block text-[11px] font-semibold" style={{ color: isDark ? '#d4d4d4' : '#333333' }}>
              Enter room code to join (must match your other device, e.g. 1234567890):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                placeholder="e.g. 1234567890"
                className="flex-1 px-3 py-2 rounded-xl text-xs border font-mono focus:outline-none"
                style={{
                  backgroundColor: isDark ? '#121212' : '#ffffff',
                  borderColor: isDark ? '#404040' : '#d4d4d4',
                  color: isDark ? '#ffffff' : '#000000',
                }}
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl font-bold text-xs shadow flex items-center gap-1.5 active:scale-95"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Switch</span>
              </button>
            </div>
            {roomChangeError && (
              <p className="text-[11px] text-red-400 font-medium">{roomChangeError}</p>
            )}
          </form>
        )}
      </div>

      {/* Peer Devices List Header */}
      <div>
        <div className="mb-4">
          <h3
            className="text-base sm:text-lg font-bold flex items-center gap-2 transition-colors"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: isDark ? '#ffffff' : '#000000' }} />
            <span>Connected Devices in Room</span>
          </h3>
          <p
            className="text-xs mt-0.5 transition-colors"
            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
          >
            Select Device B to request live remote viewfinder and capture photos.
          </p>
        </div>

        {/* Join Request In Progress Banner */}
        {joinRequestStatus === 'pending' && (
          <div
            className="mb-4 p-3.5 rounded-2xl border flex items-center justify-between gap-3 animate-pulse"
            style={{
              backgroundColor: isDark ? '#141414' : '#fafafa',
              borderColor: isDark ? '#333333' : '#d4d4d4',
            }}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs font-semibold">
                Pairing request sent... Waiting for Device A to approve
              </span>
            </div>
            <button
              onClick={cancelJoinRequest}
              className="text-xs font-bold underline text-neutral-400"
            >
              Cancel
            </button>
          </div>
        )}

        {joinRequestError && (
          <div
            className="mb-4 p-3 rounded-2xl border text-xs flex items-center justify-between gap-2"
            style={{
              backgroundColor: isDark ? '#1a1a1a' : '#fff5f5',
              borderColor: isDark ? '#404040' : '#fed7d7',
              color: isDark ? '#e5e5e5' : '#c53030',
            }}
          >
            <span>{joinRequestError}</span>
            <button onClick={cancelJoinRequest} className="font-bold underline text-[11px]">
              Dismiss
            </button>
          </div>
        )}

        {/* Other Devices Grid */}
        {otherDevices.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed p-6 sm:p-8 text-center transition-all"
            style={{
              backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
              borderColor: isDark ? '#262626' : '#d4d4d4',
            }}
          >
            <div
              className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3.5 rounded-2xl flex items-center justify-center border animate-pulse-ring"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h4
              className="text-base font-bold mb-1.5 transition-colors"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Waiting for Device B to Connect
            </h4>
            <p
              className="text-xs max-w-md mx-auto mb-5 leading-relaxed transition-colors"
              style={{ color: isDark ? '#a3a3a3' : '#737373' }}
            >
              Scan the QR code on Device B or scan Device A's QR code to join room{' '}
              <strong style={{ color: isDark ? '#ffffff' : '#000000' }}>{user.username}</strong> with zero password needed!
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={onOpenQr}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow transition-transform active:scale-95"
                style={{
                  backgroundColor: isDark ? '#ffffff' : '#000000',
                  color: isDark ? '#000000' : '#ffffff',
                }}
              >
                <QrCode className="w-4 h-4" />
                <span>Show QR Code for Device B</span>
              </button>

              <button
                onClick={onOpenScanner}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-transform active:scale-95"
                style={{
                  backgroundColor: isDark ? '#141414' : '#f5f5f5',
                  borderColor: isDark ? '#333333' : '#d4d4d4',
                  color: isDark ? '#ffffff' : '#000000',
                }}
              >
                <Camera className="w-4 h-4" />
                <span>Scan QR to Join Room</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherDevices.map((dev) => (
              <div
                key={dev.socketId}
                className="rounded-2xl border p-4 sm:p-5 backdrop-blur-md transition-all shadow-sm flex flex-col justify-between gap-4"
                style={{
                  backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                  borderColor: isDark ? '#262626' : '#e5e5e5',
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                        style={{
                          backgroundColor: isDark ? '#141414' : '#f5f5f5',
                          borderColor: isDark ? '#262626' : '#e5e5e5',
                          color: isDark ? '#ffffff' : '#000000',
                        }}
                      >
                        <Camera className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <h4
                          className="text-sm font-bold tracking-tight truncate transition-colors"
                          style={{ color: isDark ? '#ffffff' : '#000000' }}
                        >
                          {dev.deviceName}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: isDark ? '#ffffff' : '#000000' }}
                          ></span>
                          <span
                            className="text-[11px] font-medium transition-colors"
                            style={{ color: isDark ? '#a3a3a3' : '#737373' }}
                          >
                            {dev.isCameraActive ? 'Streaming' : 'Ready to Connect'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border shrink-0"
                      style={{
                        backgroundColor: isDark ? '#141414' : '#f5f5f5',
                        borderColor: isDark ? '#262626' : '#e5e5e5',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    >
                      Online
                    </span>
                  </div>

                  <p
                    className="text-xs transition-colors"
                    style={{ color: isDark ? '#a3a3a3' : '#737373' }}
                  >
                    Send a remote access request to view Device B's camera viewfinder and capture uncompressed photos.
                  </p>
                </div>

                {/* Request Access Button with Cancel & Timeout Recovery */}
                <div className="space-y-2">
                  <button
                    onClick={() => requestCameraAccess(dev.socketId)}
                    disabled={requestStatus === 'pending'}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs shadow transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
                    style={{
                      backgroundColor: isDark ? '#ffffff' : '#000000',
                      color: isDark ? '#000000' : '#ffffff',
                    }}
                  >
                    {requestStatus === 'pending' ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Request Sent... Waiting for Accept</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Request Camera Access</span>
                      </>
                    )}
                  </button>

                  {/* Cancel Button if Waiting */}
                  {requestStatus === 'pending' && (
                    <button
                      onClick={cancelCameraRequest}
                      className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: isDark ? '#171717' : '#f5f5f5',
                        borderColor: isDark ? '#333333' : '#d4d4d4',
                        color: isDark ? '#a3a3a3' : '#737373',
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancel Request</span>
                    </button>
                  )}

                  {/* Notice if Request Timed Out */}
                  {requestStatus === 'timeout' && (
                    <div
                      className="p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#fff5f5',
                        borderColor: isDark ? '#404040' : '#fed7d7',
                        color: isDark ? '#e5e5e5' : '#c53030',
                      }}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">No response from {dev.deviceName}. Verify room.</span>
                      </div>
                      <button
                        onClick={cancelCameraRequest}
                        className="underline font-bold text-[10px] shrink-0"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nearby Devices & Rooms on Local Wi-Fi Scanner */}
      <NearbyRooms onJoined={() => {}} />

      {/* How it works info */}
      <div
        className="rounded-3xl border p-4 sm:p-6 transition-all shadow-sm"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        <h4
          className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5"
          style={{ color: isDark ? '#ffffff' : '#000000' }}
        >
          <Info className="w-4 h-4" />
          <span>How Zero-Degradation Remote Camera Works</span>
        </h4>
        <div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-xs"
          style={{ color: isDark ? '#a3a3a3' : '#737373' }}
        >
          <div className="space-y-1">
            <span
              className="font-semibold block"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              1. Pair Devices
            </span>
            <span>Scan QR code with Device B to pair with zero password.</span>
          </div>
          <div className="space-y-1">
            <span
              className="font-semibold block"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              2. Grant Permission
            </span>
            <span>Device B accepts request and streams real-time preview.</span>
          </div>
          <div className="space-y-1">
            <span
              className="font-semibold block"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              3. Click & Save
            </span>
            <span>Device A clicks shutter, Device B captures raw sensor photo, automatically saved to Device A.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
