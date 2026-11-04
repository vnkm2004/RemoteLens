import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getServerUrl } from '../utils/serverUrl';
import {
  Wifi,
  RefreshCw,
  Smartphone,
  LogIn,
  Camera,
  Radio,
  CheckCircle,
  AlertCircle,
  Users,
} from 'lucide-react';

export function NearbyRooms({ onJoined }) {
  const { user, requestJoinRoom, joinRequestStatus, cancelJoinRequest } = useAuth();
  const { isDark } = useTheme();

  const [nearbyRooms, setNearbyRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [error, setError] = useState(null);
  const [targetJoiningRoom, setTargetJoiningRoom] = useState(null);

  const fetchNearbyRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = `${getServerUrl()}/api/rooms/nearby`;
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.rooms) {
        // Filter out our current room if logged in
        const currentRoom = user?.username ? user.username.toLowerCase() : '';
        const others = data.rooms.filter((r) => r.roomId !== currentRoom);
        setNearbyRooms(others);
      }
      setLastScanned(new Date());
    } catch (err) {
      console.warn('[NearbyRooms] Failed to query local Wi-Fi rooms:', err);
      setError('Could not scan local network rooms');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNearbyRooms();
    const interval = setInterval(() => {
      // Pause network polling when tab/app is backgrounded to preserve power
      if (typeof document !== 'undefined' && document.hidden) return;
      fetchNearbyRooms();
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchNearbyRooms]);

  const handleRequestJoin = async (roomId) => {
    setTargetJoiningRoom(roomId);
    try {
      await requestJoinRoom(roomId);
      if (onJoined) onJoined(roomId);
    } catch (err) {
      console.warn('Join room error:', err);
    }
  };

  return (
    <div
      className="rounded-3xl border p-4 sm:p-5 transition-all shadow-sm space-y-4"
      style={{
        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
        borderColor: isDark ? '#262626' : '#e5e5e5',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <Wifi className="w-4 h-4" />
          </div>
          <div>
            <h4
              className="text-xs sm:text-sm font-bold tracking-tight"
              style={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              Nearby Devices & Rooms on Wi-Fi
            </h4>
            <p className="text-[11px]" style={{ color: isDark ? '#a3a3a3' : '#737373' }}>
              Auto-discover active devices on this local Wi-Fi network or hotspot
            </p>
          </div>
        </div>

        <button
          onClick={fetchNearbyRooms}
          disabled={isLoading}
          className="p-2 rounded-xl border transition-all active:scale-95 disabled:opacity-50 shrink-0"
          style={{
            backgroundColor: isDark ? '#141414' : '#f5f5f5',
            borderColor: isDark ? '#262626' : '#e5e5e5',
            color: isDark ? '#ffffff' : '#000000',
          }}
          title="Scan network for devices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Rooms List */}
      {nearbyRooms.length === 0 ? (
        <div
          className="p-5 rounded-2xl border border-dashed text-center space-y-1.5"
          style={{
            backgroundColor: isDark ? '#121212' : '#fafafa',
            borderColor: isDark ? '#262626' : '#e5e5e5',
          }}
        >
          <Radio className="w-5 h-5 mx-auto animate-pulse" style={{ color: isDark ? '#737373' : '#a3a3a3' }} />
          <p className="text-xs font-semibold" style={{ color: isDark ? '#d4d4d4' : '#525252' }}>
            No other devices detected yet
          </p>
          <p className="text-[11px] max-w-sm mx-auto" style={{ color: isDark ? '#737373' : '#a3a3a3' }}>
            Ensure Device A and Device B are on the same Wi-Fi or hotspot. Rooms created on either device will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {nearbyRooms.map((room) => {
            const isThisTarget = targetJoiningRoom === room.roomId && joinRequestStatus === 'pending';
            const deviceNames = room.devices.map((d) => d.deviceName).join(', ');

            return (
              <div
                key={room.roomId}
                className="rounded-2xl border p-3.5 flex flex-col justify-between gap-3 transition-all"
                style={{
                  backgroundColor: isDark ? '#121212' : '#fafafa',
                  borderColor: isDark ? '#262626' : '#e5e5e5',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span
                      className="text-xs font-mono font-bold tracking-tight px-2 py-0.5 rounded-md border"
                      style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                        borderColor: isDark ? '#333333' : '#e5e5e5',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    >
                      {room.roomId}
                    </span>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1"
                      style={{
                        backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                        borderColor: isDark ? '#333333' : '#e5e5e5',
                        color: isDark ? '#ffffff' : '#000000',
                      }}
                    >
                      <Users className="w-3 h-3" />
                      <span>{room.deviceCount} online</span>
                    </span>
                  </div>

                  <p className="text-xs font-medium truncate" style={{ color: isDark ? '#e5e5e5' : '#262626' }}>
                    {deviceNames || 'Active Device'}
                  </p>
                </div>

                {/* Join Request Button */}
                <div>
                  {isThisTarget ? (
                    <div className="space-y-1.5">
                      <div
                        className="py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border animate-pulse"
                        style={{
                          backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
                          borderColor: isDark ? '#404040' : '#d4d4d4',
                          color: isDark ? '#ffffff' : '#000000',
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Waiting for approval...</span>
                      </div>
                      <button
                        onClick={cancelJoinRequest}
                        className="w-full text-center text-[10px] underline font-semibold text-neutral-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleRequestJoin(room.roomId)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
                      style={{
                        backgroundColor: isDark ? '#ffffff' : '#000000',
                        color: isDark ? '#000000' : '#ffffff',
                      }}
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Request to Join Room</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

