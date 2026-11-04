import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getServerUrl, setServerUrl, isNativeApp } from '../utils/serverUrl';

const AuthContext = createContext();

function detectDeviceName() {
  const ua = navigator.userAgent;
  let name = 'My Device';

  if (/iPhone/i.test(ua)) name = 'iPhone';
  else if (/iPad/i.test(ua)) name = 'iPad';
  else if (/Android/i.test(ua)) {
    const match = ua.match(/Android.*?; ([\w\s-]+)\)/);
    name = match ? match[1].trim() : 'Android Phone';
  } else if (/Macintosh/i.test(ua)) name = 'MacBook';
  else if (/Windows/i.test(ua)) name = 'Windows PC';
  else if (/Linux/i.test(ua)) name = 'Linux Device';

  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `${name} #${randomSuffix}`;
}

export function AuthProvider({ children }) {
  const [currentServerUrl, setCurrentServerUrl] = useState(getServerUrl());
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('app_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [deviceId] = useState(() => {
    let id = localStorage.getItem('app_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('app_device_id', id);
    }
    return id;
  });

  const [deviceName, setDeviceNameState] = useState(() => {
    return localStorage.getItem('app_device_name') || detectDeviceName();
  });

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState([]);
  
  // Incoming camera access request state for Phone B
  const [incomingRequest, setIncomingRequest] = useState(null);
  
  // Incoming room join request state for Device A
  const [incomingRoomJoinRequest, setIncomingRoomJoinRequest] = useState(null);

  // Outgoing camera request status for Phone A
  const [requestStatus, setRequestStatus] = useState(null);

  // Outgoing room join request status
  const [joinRequestStatus, setJoinRequestStatus] = useState(null); // 'pending' | 'accepted' | 'declined' | 'timeout'
  const [joinRequestError, setJoinRequestError] = useState(null);

  // Active session details
  const [activeSession, setActiveSession] = useState(null);

  // Network info & QR code data
  const [networkInfo, setNetworkInfo] = useState(null);

  const socketRef = useRef(null);
  const requestTimeoutRef = useRef(null);
  const joinTimeoutRef = useRef(null);

  const changeServerUrl = (newUrl) => {
    const updated = setServerUrl(newUrl);
    setCurrentServerUrl(updated);
  };

  const setDeviceName = (name) => {
    setDeviceNameState(name);
    localStorage.setItem('app_device_name', name);
    if (socketRef.current && user) {
      socketRef.current.emit('register_device', {
        accountId: user.username,
        deviceId,
        deviceName: name,
        userAgent: navigator.userAgent,
      });
    }
  };

  // Auth actions using absolute server URL (works in both browser & native Android APK)
  const login = useCallback(async (username, password = '') => {
    const targetUrl = `${getServerUrl()}/api/auth/login`;
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }
    setUser(data.user);
    localStorage.setItem('app_user', JSON.stringify(data.user));
    return data.user;
  }, []);

  // Quick 1-tap connect (no password needed)
  const quickConnect = useCallback(async (customRoom = null) => {
    const randomRoom = customRoom || `room-${Math.floor(100 + Math.random() * 900)}`;
    return await login(randomRoom, '');
  }, [login]);

  // Check URL query parameters for 1-tap instant QR pairing (?pair=ROOM_NAME)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pairRoom = urlParams.get('pair');
    if (pairRoom && (!user || user.username !== pairRoom.toLowerCase())) {
      console.log('[QR Auto-Pair] Detected room from URL:', pairRoom);
      login(pairRoom, '').catch((e) => console.log('Auto-pair error:', e));
    }
  }, [login, user]);

  // Fetch server network info (local IP, QR code)
  useEffect(() => {
    const query = user?.username ? `?room=${encodeURIComponent(user.username)}` : '';
    const targetUrl = `${getServerUrl()}/api/info${query}`;
    fetch(targetUrl)
      .then(res => res.json())
      .then(data => setNetworkInfo(data))
      .catch(err => console.log('Could not fetch server network info from:', targetUrl, err));
  }, [user, currentServerUrl]);

  // Initialize Socket.io connection with resilient auto-reconnect
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const serverEndpoint = getServerUrl();
    console.log('[Socket] Connecting to server at:', serverEndpoint);
    const newSocket = io(serverEndpoint, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 4000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('[Socket] Connected with id:', newSocket.id);
      setIsConnected(true);

      newSocket.emit('register_device', {
        accountId: user.username,
        deviceId,
        deviceName,
        userAgent: navigator.userAgent,
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
    });

    // Update active devices list
    newSocket.on('devices_update', (deviceList) => {
      setDevices(deviceList);
    });

    // Incoming camera request on Device B (with local storage persistent trust auto-approval)
    newSocket.on('camera_access_prompt', (req) => {
      console.log('[Socket] Incoming camera access prompt:', req);

      let isTrusted = false;
      try {
        const trustedMap = JSON.parse(localStorage.getItem('trusted_camera_requesters') || '{}');
        const isRoomAutoAllowed = localStorage.getItem(`auto_allow_camera_room_${user.username}`) === 'true';
        if (isRoomAutoAllowed || trustedMap[req.requesterDeviceId] || trustedMap[req.requesterName]) {
          isTrusted = true;
        }
      } catch (e) {}

      if (isTrusted) {
        console.log('[Auth] Auto-approving camera request from saved local permission:', req.requesterName);
        const savedFacing = localStorage.getItem('preferred_camera_facing') || 'environment';

        newSocket.emit('respond_camera_access', {
          requesterSocketId: req.requesterSocketId,
          accepted: true,
          cameraFacing: savedFacing,
        });

        setActiveSession({
          peerSocketId: req.requesterSocketId,
          peerName: req.requesterName,
          role: 'host',
          cameraFacing: savedFacing,
        });
        return;
      }

      setIncomingRequest(req);
    });

    // Incoming room join prompt on Device A (when Device B scans QR or requests join)
    newSocket.on('room_join_prompt', (req) => {
      console.log('[Socket] Incoming room join prompt:', req);

      let isTrusted = false;
      try {
        const trustedDevices = JSON.parse(localStorage.getItem('trusted_devices') || '{}');
        if (trustedDevices[req.requesterDeviceId]?.autoAllowRoom) {
          isTrusted = true;
        }
      } catch (e) {}

      if (isTrusted) {
        console.log('[Auth] Auto-approving room join request from trusted device:', req.requesterDeviceName);
        newSocket.emit('respond_join_room', {
          requesterSocketId: req.requesterSocketId,
          accepted: true,
          targetRoom: req.targetRoom,
        });
        return;
      }

      setIncomingRoomJoinRequest(req);
    });

    // Result received on Device B after Device A responds to join request
    newSocket.on('join_room_result', async (result) => {
      console.log('[Socket] Join room result:', result);
      if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);

      if (result.accepted) {
        setJoinRequestStatus('accepted');
        try {
          // Switch to target room
          await login(result.targetRoom, '');
          setTimeout(() => setJoinRequestStatus(null), 1500);
        } catch (e) {
          console.error('[Auth] Failed to switch room after acceptance:', e);
          setJoinRequestError('Accepted, but failed to switch room');
        }
      } else {
        setJoinRequestStatus('declined');
        setJoinRequestError(result.reason || 'Join request declined by Device A');
      }
    });

    // Result received on Phone A after Phone B responds
    newSocket.on('camera_access_result', (result) => {
      console.log('[Socket] Camera access result:', result);
      if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current);
      if (result.accepted) {
        setRequestStatus('accepted');
        setActiveSession({
          peerSocketId: result.providerSocketId,
          peerName: result.providerName,
          role: 'controller',
          cameraFacing: result.cameraFacing,
        });
      } else {
        setRequestStatus('declined');
      }
    });

    // Partner phone reconnected with a new socket ID
    newSocket.on('peer_socket_updated', ({ newSocketId }) => {
      console.log('[Socket] Partner device reconnected with new socket:', newSocketId);
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          peerSocketId: newSocketId,
        };
      });
    });

    // Server restores our active session
    newSocket.on('session_restored', ({ peerSocketId, peerName, role, cameraFacing }) => {
      console.log('[Socket] Active session restored from server:', { peerSocketId, role });
      setActiveSession({
        peerSocketId,
        peerName,
        role,
        cameraFacing: cameraFacing || 'environment',
      });
      if (role === 'controller') {
        setRequestStatus('accepted');
      }
    });

    // Session ended explicitly by user clicking disconnect
    newSocket.on('camera_session_ended', ({ reason }) => {
      console.log('[Socket] Session ended explicitly:', reason);
      setActiveSession(null);
      setRequestStatus(null);
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [user, deviceId, deviceName, currentServerUrl]);

  const logout = () => {
    setUser(null);
    localStorage.removeItem('app_user');
    setActiveSession(null);
    setDevices([]);
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };

  // Request camera access from Phone A to Phone B
  const requestCameraAccess = (targetSocketId) => {
    if (!socketRef.current) return;
    setRequestStatus('pending');
    socketRef.current.emit('request_camera_access', { targetSocketId });

    if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current);
    requestTimeoutRef.current = setTimeout(() => {
      setRequestStatus((current) => {
        if (current === 'pending') {
          console.log('[Auth] Request camera access timed out (15s)');
          return 'timeout';
        }
        return current;
      });
    }, 15000);
  };

  const cancelCameraRequest = () => {
    if (requestTimeoutRef.current) clearTimeout(requestTimeoutRef.current);
    setRequestStatus(null);
  };

  // Device B initiates a request to join a room (e.g. by scanning QR or clicking nearby room)
  const requestJoinRoom = (targetRoom) => {
    if (!socketRef.current) return Promise.reject(new Error('Socket not connected'));
    const cleanRoom = targetRoom ? targetRoom.trim().toLowerCase() : '';
    if (!cleanRoom) return Promise.reject(new Error('Invalid room name'));

    setJoinRequestStatus('pending');
    setJoinRequestError(null);

    socketRef.current.emit('request_join_room', {
      targetRoom: cleanRoom,
      requesterDeviceId: deviceId,
      requesterDeviceName: deviceName,
    });

    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    joinTimeoutRef.current = setTimeout(() => {
      setJoinRequestStatus((curr) => {
        if (curr === 'pending') {
          setJoinRequestError('Join request timed out. Device A may be offline or in another room.');
          return 'timeout';
        }
        return curr;
      });
    }, 15000);

    return Promise.resolve();
  };

  const cancelJoinRequest = () => {
    if (joinTimeoutRef.current) clearTimeout(joinTimeoutRef.current);
    setJoinRequestStatus(null);
    setJoinRequestError(null);
  };

  // Device A responds to an incoming room join request (accept or decline)
  const respondRoomJoin = (accepted, remember = true) => {
    if (!socketRef.current || !incomingRoomJoinRequest) return;

    if (accepted && remember) {
      try {
        const trusted = JSON.parse(localStorage.getItem('trusted_devices') || '{}');
        trusted[incomingRoomJoinRequest.requesterDeviceId] = {
          name: incomingRoomJoinRequest.requesterDeviceName,
          autoAllowRoom: true,
          autoAllowCamera: true,
          savedAt: Date.now(),
        };
        localStorage.setItem('trusted_devices', JSON.stringify(trusted));
        console.log('[Auth] Saved trusted device in localStorage for auto-pairing:', incomingRoomJoinRequest.requesterDeviceName);
      } catch (e) {
        console.error('Failed to save trusted device:', e);
      }
    }

    socketRef.current.emit('respond_join_room', {
      requesterSocketId: incomingRoomJoinRequest.requesterSocketId,
      accepted,
      targetRoom: incomingRoomJoinRequest.targetRoom,
    });

    setIncomingRoomJoinRequest(null);
  };

  // Device B responds to request (with local storage persistent permission saving)
  const respondCameraAccess = (accepted, cameraFacing = 'environment', remember = true) => {
    if (!socketRef.current || !incomingRequest) return;

    if (accepted && remember) {
      try {
        const trusted = JSON.parse(localStorage.getItem('trusted_camera_requesters') || '{}');
        trusted[incomingRequest.requesterDeviceId] = {
          name: incomingRequest.requesterName,
          savedAt: Date.now(),
        };
        trusted[incomingRequest.requesterName] = {
          savedAt: Date.now(),
        };
        localStorage.setItem('trusted_camera_requesters', JSON.stringify(trusted));

        // Also save to unified trusted_devices
        const unified = JSON.parse(localStorage.getItem('trusted_devices') || '{}');
        unified[incomingRequest.requesterDeviceId] = {
          name: incomingRequest.requesterName,
          autoAllowCamera: true,
          autoAllowRoom: true,
          savedAt: Date.now(),
        };
        localStorage.setItem('trusted_devices', JSON.stringify(unified));

        if (user?.username) {
          localStorage.setItem(`auto_allow_camera_room_${user.username}`, 'true');
        }
        localStorage.setItem('preferred_camera_facing', cameraFacing);
        console.log('[Auth] Saved camera permission in local storage for future reference');
      } catch (e) {
        console.error('Failed to save permission in localStorage:', e);
      }
    }

    socketRef.current.emit('respond_camera_access', {
      requesterSocketId: incomingRequest.requesterSocketId,
      accepted,
      cameraFacing,
    });

    if (accepted) {
      setActiveSession({
        peerSocketId: incomingRequest.requesterSocketId,
        peerName: incomingRequest.requesterName,
        role: 'host',
        cameraFacing,
      });
    }
    setIncomingRequest(null);
  };

  const clearSavedPermissions = () => {
    localStorage.removeItem('trusted_camera_requesters');
    localStorage.removeItem('trusted_devices');
    if (user?.username) {
      localStorage.removeItem(`auto_allow_camera_room_${user.username}`);
    }
    console.log('[Auth] Cleared all saved trusted device permissions from local storage');
  };

  // Get count of saved trusted devices
  const getSavedPermissionsCount = () => {
    try {
      const trusted = JSON.parse(localStorage.getItem('trusted_devices') || '{}');
      return Object.keys(trusted).length;
    } catch (e) {
      return 0;
    }
  };

  // End active session
  const endSession = () => {
    if (socketRef.current && activeSession) {
      socketRef.current.emit('end_camera_session', {
        targetSocketId: activeSession.peerSocketId,
      });
    }
    setActiveSession(null);
    setRequestStatus(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        deviceId,
        deviceName,
        serverUrl: currentServerUrl,
        setServerUrl: changeServerUrl,
        isNative: isNativeApp(),
        setDeviceName,
        socket,
        isConnected,
        devices,
        incomingRequest,
        incomingRoomJoinRequest,
        requestStatus,
        setRequestStatus,
        joinRequestStatus,
        joinRequestError,
        activeSession,
        networkInfo,
        login,
        quickConnect,
        logout,
        requestJoinRoom,
        cancelJoinRequest,
        respondRoomJoin,
        requestCameraAccess,
        cancelCameraRequest,
        respondCameraAccess,
        clearSavedPermissions,
        getSavedPermissionsCount,
        endSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
