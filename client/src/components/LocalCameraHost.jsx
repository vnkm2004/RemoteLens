import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCameraCapture } from '../hooks/useCameraCapture';
import { useWebRTC } from '../hooks/useWebRTC';
import { useWakeLock } from '../hooks/useWakeLock';
import { sendLosslessPhoto } from '../utils/imageTransfer';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  VideoOff,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export function LocalCameraHost({ onStop }) {
  const { socket, activeSession, deviceName } = useAuth();
  const { isDark } = useTheme();

  const {
    stream,
    videoElementRef,
    facingMode,
    torchEnabled,
    torchSupported,
    zoomSupported,
    currentZoom,
    zoomRange,
    isCapturing,
    error: cameraError,
    startCamera,
    stopCamera,
    switchFacingMode,
    toggleTorch,
    setZoom,
    takeNativePhoto,
  } = useCameraCapture();

  // Keep phone screen awake during camera streaming
  useWakeLock(true);

  const [shutterFlash, setShutterFlash] = useState(false);
  const [transferStatus, setTransferStatus] = useState(null); // { sentBytes, totalSize, percent }
  const [lastCapturedInfo, setLastCapturedInfo] = useState(null);

  // Capture queue for rapid burst shooting (N continuous photos)
  const captureQueueRef = useRef([]);
  const isProcessingQueueRef = useRef(false);
  const deviceRotationRef = useRef(0);

  // Power-Optimized Background Audio Keepalive (Only activates if phone is backgrounded/locked)
  // Keeps the mobile OS from freezing WebRTC during app-switching, but stays 100% OFF during foreground use
  // to prevent phone SoC heating and battery drain!
  useEffect(() => {
    let audioCtx = null;
    let oscillator = null;

    const startKeepalive = () => {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = 0.00001; // Silent
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        console.log('[Power] Background audio keepalive engaged');
      } catch (e) {}
    };

    const stopKeepalive = () => {
      try {
        if (oscillator) {
          oscillator.stop();
          oscillator.disconnect();
          oscillator = null;
        }
        if (audioCtx) {
          audioCtx.close();
          audioCtx = null;
        }
        console.log('[Power] Foreground active: audio hardware released to keep phone cool');
      } catch (e) {}
    };

    const handleVisibility = () => {
      if (document.hidden) {
        startKeepalive();
      } else {
        stopKeepalive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopKeepalive();
    };
  }, []);

  // Physical Device Orientation Tracking (Portrait 0°, Landscape Right 90°, Upside Down 180°, Landscape Left 270°)
  const [deviceRotation, setDeviceRotation] = useState(0);

  useEffect(() => {
    const updateOrientation = () => {
      let angle = 0;
      if (window.screen?.orientation?.angle !== undefined) {
        angle = window.screen.orientation.angle;
      } else if (typeof window.orientation === 'number') {
        angle = (window.orientation + 360) % 360;
      }
      setDeviceRotation(angle);
    };

    // Accelerometer / Gravity fallback - Throttled to 350ms to prevent CPU heating (60Hz -> 3Hz)
    let lastMotionCheck = 0;
    const handleMotion = (event) => {
      const now = Date.now();
      if (now - lastMotionCheck < 350) return;
      lastMotionCheck = now;

      const acc = event.accelerationIncludingGravity;
      if (!acc) return;
      const x = acc.x || 0;
      const y = acc.y || 0;

      let detected = 0;
      if (Math.abs(x) > 5 && Math.abs(x) > Math.abs(y)) {
        detected = x > 0 ? 90 : 270;
      } else if (Math.abs(y) > 5 && Math.abs(y) > Math.abs(x)) {
        detected = y < 0 ? 180 : 0;
      }

      setDeviceRotation((prev) => (prev !== detected ? detected : prev));
    };

    updateOrientation();
    window.addEventListener('orientationchange', updateOrientation);
    if (window.screen?.orientation) {
      window.screen.orientation.addEventListener('change', updateOrientation);
    }
    window.addEventListener('devicemotion', handleMotion, { passive: true });

    return () => {
      window.removeEventListener('orientationchange', updateOrientation);
      if (window.screen?.orientation) {
        window.screen.orientation.removeEventListener('change', updateOrientation);
      }
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  // Sync orientation changes to Device A in real time!
  useEffect(() => {
    if (!socket || !targetSocketId) return;
    socket.emit('device_orientation_change', {
      targetSocketId,
      rotation: deviceRotation,
      isPortrait: deviceRotation === 0 || deviceRotation === 180,
    });
  }, [deviceRotation, socket, targetSocketId]);

  // Target Phone A socket id
  const targetSocketId = activeSession?.peerSocketId;

  // WebRTC connection as Host
  const { dataChannel, connectionState } = useWebRTC({
    socket,
    targetSocketId,
    role: 'host',
    localStream: stream,
    onPhotoReceived: null,
  });

  // Start local camera on mount
  useEffect(() => {
    const initialFacing = activeSession?.cameraFacing || 'environment';
    startCamera(initialFacing).catch(err => {
      console.error('Camera startup error:', err);
    });

    return () => {
      stopCamera();
    };
  }, []);

  // Connect local video element to media stream
  useEffect(() => {
    const video = videoElementRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch((e) => console.log('Video play policy:', e));
    }
  }, [stream]);

  // Sync deviceRotation to ref
  useEffect(() => {
    deviceRotationRef.current = deviceRotation;
  }, [deviceRotation]);

  // Listen for remote triggers from Phone A via socket
  useEffect(() => {
    if (!socket) return;

    // Process queued capture requests sequentially for rapid burst shooting
    const processQueue = async () => {
      if (isProcessingQueueRef.current) return;
      isProcessingQueueRef.current = true;

      while (captureQueueRef.current.length > 0) {
        const item = captureQueueRef.current.shift();
        const currentRot = deviceRotationRef.current;
        console.log(`[Host] Processing queued capture. Remaining in queue: ${captureQueueRef.current.length}`);

        setShutterFlash(true);
        setTimeout(() => setShutterFlash(false), 120);

        try {
          setTransferStatus({ percent: 0, text: 'Capturing native sensor photo...' });

          // 1. Capture raw uncompressed photo directly from camera hardware (oriented to match phone tilt, zero flash)
          const captureResult = await takeNativePhoto(currentRot);
          console.log('[Host] Native photo captured:', captureResult);

          setLastCapturedInfo({
            width: captureResult.width,
            height: captureResult.height,
            size: captureResult.blob.size,
            method: captureResult.method,
          });

          // 2. Transmit raw Blob to Device A asynchronously in background
          // Camera is immediately freed to capture the next queued photo!
          const photoName = `IMG_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${captureResult.mimeType.includes('png') ? 'png' : 'jpg'}`;

          sendLosslessPhoto({
            blob: captureResult.blob,
            dataChannel,
            socket,
            targetSocketId,
            metadata: {
              width: captureResult.width,
              height: captureResult.height,
              sourceDevice: deviceName,
              name: photoName,
              captureId: item.captureId,
            },
            onProgress: (p) => {
              setTransferStatus({
                percent: p.percent,
                text: `Transmitting lossless photo: ${p.percent}% (${(p.sentBytes / (1024 * 1024)).toFixed(1)} MB / ${(p.totalSize / (1024 * 1024)).toFixed(1)} MB)`,
              });
            },
          }).then(() => {
            setTransferStatus({ percent: 100, text: 'Lossless transfer complete!' });
            setTimeout(() => setTransferStatus(null), 2500);
          }).catch((err) => {
            console.error('[Host] Background photo transfer error:', err);
          });

          // Brief 120ms gap between consecutive sensor shots to let exposure adjust
          if (captureQueueRef.current.length > 0) {
            await new Promise((r) => setTimeout(r, 120));
          }
        } catch (err) {
          console.error('[Host] Capture failed:', err);
          setTransferStatus({ percent: 0, text: `Capture failed: ${err.message}` });
          setTimeout(() => setTransferStatus(null), 3000);
        }
      }

      isProcessingQueueRef.current = false;
    };

    // Trigger Photo Capture from Phone A
    const handleRemoteCapture = ({ settings, captureId }) => {
      console.log('[Host] Remote capture trigger received from Phone A:', captureId);
      captureQueueRef.current.push({ settings, captureId });
      processQueue();
    };

    // Remote camera switch
    const handleRemoteSwitch = ({ facingMode: remoteFacing }) => {
      console.log('[Host] Remote switch camera received:', remoteFacing);
      switchFacingMode(remoteFacing);
    };

    // Remote torch toggle
    const handleRemoteTorch = ({ enabled }) => {
      console.log('[Host] Remote toggle torch received:', enabled);
      toggleTorch(enabled);
    };

    // Remote zoom
    const handleRemoteZoom = ({ zoomLevel }) => {
      console.log('[Host] Remote zoom received:', zoomLevel);
      setZoom(zoomLevel);
    };

    socket.on('remote_capture_trigger', handleRemoteCapture);
    socket.on('remote_switch_camera', handleRemoteSwitch);
    socket.on('remote_toggle_torch', handleRemoteTorch);
    socket.on('remote_zoom', handleRemoteZoom);

    return () => {
      socket.off('remote_capture_trigger', handleRemoteCapture);
      socket.off('remote_switch_camera', handleRemoteSwitch);
      socket.off('remote_toggle_torch', handleRemoteTorch);
      socket.off('remote_zoom', handleRemoteZoom);
    };
  }, [
    socket,
    dataChannel,
    targetSocketId,
    deviceName,
    takeNativePhoto,
    switchFacingMode,
    toggleTorch,
    setZoom,
  ]);

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-black overflow-hidden flex flex-col justify-between">
      {/* Shutter flash overlay */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-shutter-flash pointer-events-none" />
      )}

      {/* Main Video Viewfinder */}
      <div className="relative w-full h-full flex items-center justify-center bg-black">
        <video
          ref={videoElementRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Framing Grid Overlay */}
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-20">
          <div className="border-r border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div className="border-r border-b border-white"></div>
          <div></div>
        </div>

        {/* Center Target Focus Box */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-20 h-20 border-2 border-white/40 rounded-xl relative">
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
          </div>
        </div>

        {/* Top Floating Status - Mobile responsive non-overlapping layout */}
        <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-auto gap-2">
          {/* Active Partner Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-neutral-700 text-xs text-white max-w-[65%] truncate">
            <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0"></span>
            <span className="font-semibold truncate">
              Live with {activeSession?.peerName || 'Device A'}
            </span>
          </div>

          {/* Connection state */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-neutral-700 text-[11px] font-mono text-neutral-300 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">P2P Stream Active</span>
            <span className="sm:hidden">Active</span>
          </div>
        </div>

        {/* Transfer Progress / Sensor Capture Overlay */}
        {transferStatus && (
          <div className="absolute top-14 sm:top-16 inset-x-3 sm:inset-x-4 z-40">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-black/90 backdrop-blur-md border border-neutral-700 text-white shadow-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold gap-2">
                <span className="flex items-center gap-1.5 text-white truncate">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="truncate">{transferStatus.text}</span>
                </span>
                <span className="font-mono shrink-0">{transferStatus.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-150"
                  style={{ width: `${transferStatus.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Last Photo Specs Pill */}
        {lastCapturedInfo && (
          <div className="absolute bottom-20 sm:bottom-24 left-3 right-3 sm:left-4 sm:right-4 z-30 pointer-events-none">
            <div className="p-2.5 rounded-xl bg-black/80 backdrop-blur-md border border-neutral-700 text-[11px] text-neutral-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>Captured: {lastCapturedInfo.width}×{lastCapturedInfo.height}</span>
              </span>
              <span className="font-mono text-white font-semibold">
                {(lastCapturedInfo.size / (1024 * 1024)).toFixed(2)} MB (100% Raw)
              </span>
            </div>
          </div>
        )}

        {/* Camera Error Message with 1-Tap Tap-to-Revive */}
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90 z-40 text-center">
            <div className="max-w-sm p-6 rounded-3xl bg-neutral-900 border border-neutral-700">
              <AlertTriangle className="w-10 h-10 text-white mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-2">Camera Paused</h4>
              <p className="text-xs text-neutral-400 mb-4">{cameraError}</p>
              <button
                onClick={() => startCamera(facingMode)}
                className="px-5 py-2.5 rounded-xl bg-white text-xs font-bold text-black hover:bg-neutral-200 transition-colors"
              >
                Resume Camera
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Floating Bar - Responsive & Non-Overlapping */}
      <div className="absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black via-black/85 to-transparent flex items-center justify-between gap-3 z-30">
        {/* Switch lens button */}
        <button
          onClick={() => switchFacingMode()}
          title="Switch Front/Back Lens"
          className="p-3 rounded-full bg-neutral-900/90 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 text-white transition-all active:scale-95 shrink-0"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        {/* Torch button (if supported) */}
        {torchSupported ? (
          <button
            onClick={() => toggleTorch()}
            title="Toggle Flash / Torch"
            className={`p-3 rounded-full backdrop-blur-md border transition-all active:scale-95 shrink-0 ${
              torchEnabled
                ? 'bg-white border-white text-black shadow-lg shadow-white/30'
                : 'bg-neutral-900/90 hover:bg-neutral-800 border-neutral-700 text-white'
            }`}
          >
            {torchEnabled ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}

        {/* Stop Sharing Button (Responsive sizing to prevent overlapping) */}
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full bg-white text-black text-xs font-bold shadow-lg hover:bg-neutral-200 transition-all active:scale-95 shrink-0"
        >
          <VideoOff className="w-4 h-4" />
          <span>Stop Camera</span>
        </button>
      </div>
    </div>
  );
}
