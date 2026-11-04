import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { useWakeLock } from '../hooks/useWakeLock';
import { savePhotoLocally, downloadBlob } from '../utils/storage';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  VideoOff,
  Sliders,
  ZoomIn,
  ZoomOut,
  Download,
  CheckCircle,
  Eye,
  ShieldCheck,
  X,
  Maximize,
  Minimize,
  Sparkles,
  Keyboard,
} from 'lucide-react';

export function RemoteViewfinder({ onDisconnect, onOpenGallery, onPhotoSaved }) {
  const { socket, activeSession } = useAuth();
  const { isDark } = useTheme();

  const videoElementRef = useRef(null);

  const [shutterFlash, setShutterFlash] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [currentFacing, setCurrentFacing] = useState(activeSession?.cameraFacing || 'environment');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  // Fit (100% native uncropped sensor view) vs Fill (fullscreen crop)
  const [videoFitMode, setVideoFitMode] = useState('contain');
  // Remote Phone B orientation angle (0, 90, 180, 270)
  const [remoteOrientation, setRemoteOrientation] = useState({ rotation: 0, isPortrait: true });

  // Keep screen awake while viewing live feed
  useWakeLock(true);

  // Status indicators
  const [lastPhoto, setLastPhoto] = useState(null);
  const [previewModalPhoto, setPreviewModalPhoto] = useState(null);
  const [transferProgress, setTransferProgress] = useState(null);
  const [successToast, setSuccessToast] = useState(null);

  const targetSocketId = activeSession?.peerSocketId;

  // Listen for real-time Phone B physical orientation tilt/rotation
  useEffect(() => {
    if (!socket) return;
    const handleOrientationChange = (data) => {
      console.log('[Controller] Remote device orientation updated:', data);
      setRemoteOrientation(data);
    };
    socket.on('device_orientation_change', handleOrientationChange);
    return () => {
      socket.off('device_orientation_change', handleOrientationChange);
    };
  }, [socket]);

  // Handle incoming lossless photo on Phone A
  const handlePhotoReceived = async (photo) => {
    console.log('[Controller] Lossless raw photo received:', photo);
    setIsCapturing(false);
    setShutterFlash(false);

    try {
      // 1. Save to Phone A IndexedDB
      await savePhotoLocally(photo);

      // 2. Automatically trigger local storage file download on Phone A
      downloadBlob(photo.blob, photo.name);

      const objectUrl = URL.createObjectURL(photo.blob);
      const photoDetails = {
        ...photo,
        url: objectUrl,
      };

      setLastPhoto(photoDetails);
      setPreviewModalPhoto(photoDetails);
      if (onPhotoSaved) onPhotoSaved(photo);

      setSuccessToast({
        title: 'Lossless Sensor Photo Saved!',
        subtitle: `${photo.width}×${photo.height} • ${(photo.size / (1024 * 1024)).toFixed(2)} MB (100% Sensor Quality)`,
      });

      if ('vibrate' in navigator) {
        navigator.vibrate([40, 60, 40]);
      }

      setTimeout(() => setSuccessToast(null), 5000);
    } catch (err) {
      console.error('[Controller] Failed to save photo locally:', err);
    }
  };

  // WebRTC hook as Controller with Ultra-HD 25 Mbps streaming & live stats
  const { remoteStream, connectionState, streamStats, dataChannel } = useWebRTC({
    socket,
    targetSocketId,
    role: 'controller',
    localStream: null,
    onPhotoReceived: handlePhotoReceived,
    onTransferProgress: (progress) => {
      setTransferProgress(progress);
    },
  });

  // Attach remote stream to video element
  useEffect(() => {
    const video = videoElementRef.current;
    if (video && remoteStream) {
      video.srcObject = remoteStream;
      video.onloadedmetadata = () => {
        video.play().catch((e) => console.log('Remote video play metadata:', e));
      };
      video.play().catch((e) => console.log('Remote video play:', e));

      remoteStream.onaddtrack = () => {
        console.log('[Controller] Remote track added to stream');
        video.play().catch((e) => console.log('Remote video play on track:', e));
      };
    }
  }, [remoteStream]);

  // Audio shutter sound synthesizer
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.09);
    } catch (e) {}
  };

  // Click shutter to capture full-resolution photo on Phone B
  const triggerShutter = useCallback(() => {
    if (isCapturing || !socket || !targetSocketId) return;

    setIsCapturing(true);
    setShutterFlash(true);
    playShutterSound();
    setTimeout(() => setShutterFlash(false), 250);

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    console.log('[Controller] Triggering native sensor capture on:', targetSocketId);
    socket.emit('remote_capture_trigger', {
      targetSocketId,
      settings: {
        desiredQuality: 1.0,
      },
    });

    setTimeout(() => {
      setIsCapturing(false);
    }, 15000);
  }, [isCapturing, socket, targetSocketId]);

  // Keyboard shortcut: Spacebar or Enter to capture photo on Desktop PC!
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        // Prevent default spacebar page scrolling
        e.preventDefault();
        triggerShutter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [triggerShutter]);

  // Remote Switch Camera (Back / Front)
  const handleSwitchCamera = () => {
    if (!socket || !targetSocketId) return;
    const newFacing = currentFacing === 'environment' ? 'user' : 'environment';
    setCurrentFacing(newFacing);
    socket.emit('remote_switch_camera', {
      targetSocketId,
      facingMode: newFacing,
    });
  };

  // Remote Toggle Torch
  const handleToggleTorch = () => {
    if (!socket || !targetSocketId) return;
    const newState = !torchEnabled;
    setTorchEnabled(newState);
    socket.emit('remote_toggle_torch', {
      targetSocketId,
      enabled: newState,
    });
  };

  // Remote Zoom
  const handleZoomChange = (newZoom) => {
    setZoomLevel(newZoom);
    if (!socket || !targetSocketId) return;
    socket.emit('remote_zoom', {
      targetSocketId,
      zoomLevel: newZoom,
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-black overflow-hidden select-none">
      {/* Visual Shutter Flash */}
      {shutterFlash && (
        <div className="absolute inset-0 bg-white z-50 animate-shutter-flash pointer-events-none" />
      )}

      {/* Main Viewfinder Video Layer */}
      <div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden">
        <video
          ref={videoElementRef}
          autoPlay
          playsInline
          muted
          style={{
            imageRendering: '-webkit-optimize-contrast',
            transform: `rotate(${remoteOrientation.rotation}deg) ${currentFacing === 'user' ? 'scaleX(-1)' : ''}`,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          className={`w-full h-full ${
            videoFitMode === 'contain' ? 'object-contain' : 'object-cover'
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
          <div className="w-20 h-20 border border-white/50 rounded-xl relative">
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white"></div>
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white"></div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white"></div>
          </div>
        </div>
      </div>

      {/* TOP FLOATING HEADER CONTROLS (Always visible HUD - Compact & Overfitting-Safe on Mobile) */}
      <div className="absolute top-2.5 inset-x-2 sm:top-4 sm:inset-x-4 flex items-center justify-between pointer-events-auto z-30 gap-1.5 sm:gap-2">
        {/* Left: Partner Device Info */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
          <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-neutral-700 text-[11px] sm:text-xs text-white max-w-[34vw] sm:max-w-none truncate shadow-lg">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0"></span>
            <span className="font-semibold truncate">{activeSession?.peerName || 'Device B'}</span>
            <span className="text-[9px] sm:text-[10px] text-neutral-400 font-mono shrink-0">
              ({currentFacing === 'environment' ? 'Back' : 'Front'})
            </span>
          </div>

          {/* Stream HD Resolution & Bitrate */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-neutral-700 text-[11px] font-mono text-neutral-300 shadow-lg shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            <span>
              {streamStats.width > 0 ? `${streamStats.width}×${streamStats.height}` : 'Full HD'} • {streamStats.bitrateMbps > 0 ? `${streamStats.bitrateMbps} Mbps` : '1080p'}
            </span>
          </div>
        </div>

        {/* Right: View Mode (Fit/Fill), Torch, Zoom, Disconnect - Compact on mobile to NEVER overflow */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Fit vs Fill View Toggle - Compact icon on mobile, text on desktop */}
          <button
            onClick={() => setVideoFitMode(videoFitMode === 'contain' ? 'cover' : 'contain')}
            title={videoFitMode === 'contain' ? 'Fit (100% Uncropped). Tap for Fill.' : 'Fill (Cropped). Tap for Fit.'}
            className="flex items-center justify-center gap-1 p-2 sm:px-3 sm:py-1.5 rounded-full backdrop-blur-md border transition-all active:scale-95 bg-black/85 hover:bg-neutral-800 border-neutral-700 text-white shadow-lg shrink-0"
          >
            {videoFitMode === 'contain' ? (
              <>
                <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Fit</span>
              </>
            ) : (
              <>
                <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Fill</span>
              </>
            )}
          </button>

          {/* Torch toggle */}
          <button
            onClick={handleToggleTorch}
            title="Remote Flashlight / Torch"
            className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 shadow-lg shrink-0 flex items-center justify-center ${
              torchEnabled
                ? 'bg-white border-white text-black shadow-white/30'
                : 'bg-black/85 hover:bg-neutral-800 border-neutral-700 text-white'
            }`}
          >
            {torchEnabled ? <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <ZapOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
          </button>

          {/* Zoom toggle button */}
          <button
            onClick={() => setShowZoomSlider(!showZoomSlider)}
            title="Remote Zoom"
            className={`p-2 rounded-full backdrop-blur-md border transition-all active:scale-95 shadow-lg shrink-0 flex items-center justify-center ${
              showZoomSlider
                ? 'bg-white border-white text-black'
                : 'bg-black/85 hover:bg-neutral-800 border-neutral-700 text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Disconnect button */}
          <button
            onClick={onDisconnect}
            title="Disconnect Remote Camera"
            className="p-2 rounded-full bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-white shadow-lg transition-all active:scale-95 shrink-0 flex items-center justify-center"
          >
            <VideoOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Transfer Progress Bar Overlay */}
      {transferProgress && (
        <div className="absolute top-16 inset-x-3 sm:inset-x-8 max-w-lg mx-auto z-40">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-black/90 backdrop-blur-md border border-neutral-700 text-white shadow-2xl space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold gap-2">
              <span className="flex items-center gap-2 text-white truncate">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="truncate">Receiving Full-Resolution Sensor Photo...</span>
              </span>
              <span className="font-mono shrink-0">{transferProgress.percent}%</span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${transferProgress.percent}%` }}
              />
            </div>
            <p className="text-[10px] text-neutral-400 font-mono">
              {(transferProgress.receivedBytes / (1024 * 1024)).toFixed(1)} MB / {(transferProgress.totalSize / (1024 * 1024)).toFixed(1)} MB (P2P Raw Uncompressed)
            </p>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="absolute top-16 inset-x-3 sm:inset-x-8 max-w-lg mx-auto z-40 animate-fade-in">
          <div className="p-3 rounded-2xl bg-black/90 backdrop-blur-md border border-white text-white shadow-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 truncate">
              <CheckCircle className="w-5 h-5 text-white shrink-0" />
              <div className="truncate">
                <h5 className="text-xs font-bold truncate">{successToast.title}</h5>
                <p className="text-[11px] text-neutral-300 font-mono">{successToast.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onOpenGallery}
              className="px-3 py-1.5 rounded-xl bg-white text-[11px] font-bold text-black hover:bg-neutral-200 transition-colors shrink-0"
            >
              View
            </button>
          </div>
        </div>
      )}

      {/* Remote Zoom Slider (Floating on right side) */}
      {showZoomSlider && (
        <div className="absolute right-3 sm:right-6 top-20 bottom-36 flex flex-col items-center justify-center z-30 pointer-events-auto">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-black/85 backdrop-blur-md border border-neutral-700 flex flex-col items-center gap-3 shadow-2xl">
            <button
              onClick={() => handleZoomChange(Math.min(5, zoomLevel + 0.5))}
              className="text-white hover:text-neutral-300 p-1 active:scale-90"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="1"
              max="5"
              step="0.1"
              value={zoomLevel}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="h-28 sm:h-36 w-1.5 appearance-none bg-neutral-800 rounded-lg accent-white orient-vertical"
              style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
            />
            <button
              onClick={() => handleZoomChange(Math.max(1, zoomLevel - 0.5))}
              className="text-white hover:text-neutral-300 p-1 active:scale-90"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-white font-bold">{zoomLevel.toFixed(1)}x</span>
          </div>
        </div>
      )}

      {/* BOTTOM SHUTTER & CONTROLS CONSOLE (Fixed floating HUD at bottom) */}
      <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/90 to-transparent flex items-center justify-between z-30 pointer-events-auto">
        {/* Left: Last Captured Photo Thumbnail / Gallery Trigger */}
        <div className="w-20 sm:w-28 flex items-center justify-start">
          {lastPhoto ? (
            <button
              onClick={onOpenGallery}
              title="Open Photo Gallery"
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
            >
              <img
                src={lastPhoto.url}
                alt="Captured"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/90 text-[8px] font-bold text-white text-center py-0.5 border-t border-neutral-800">
                SAVED
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenGallery}
              title="Open Photo Gallery"
              className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl border border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 flex items-center justify-center text-neutral-400 active:scale-95 transition-all shadow-lg"
            >
              <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          )}
        </div>

        {/* Center: BIG CAMERA SHUTTER BUTTON (With desktop keyboard shortcut) */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={triggerShutter}
            disabled={isCapturing}
            aria-label="Take Photo"
            className={`relative w-20 h-20 sm:w-22 sm:h-22 rounded-full flex items-center justify-center transition-all transform active:scale-90 shadow-2xl ${
              isCapturing ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'
            }`}
          >
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white shadow-2xl"></div>
            {/* Inner trigger pad */}
            <div
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full transition-all flex items-center justify-center shadow-inner"
              style={{
                backgroundColor: isCapturing ? '#737373' : '#ffffff',
              }}
            >
              {isCapturing ? (
                <RefreshCw className="w-6 h-6 text-black animate-spin" />
              ) : (
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-neutral-300"></div>
              )}
            </div>
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-white drop-shadow">
              {isCapturing ? 'Capturing Sensor Photo...' : 'Take Photo'}
            </span>
            <span className="hidden md:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300">
              Spacebar
            </span>
          </div>
        </div>

        {/* Right: Switch Remote Lens Button */}
        <div className="w-20 sm:w-28 flex items-center justify-end">
          <button
            onClick={handleSwitchCamera}
            title="Switch Remote Camera Lens (Front / Back)"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-900/80 hover:bg-neutral-800 backdrop-blur-md border border-neutral-700 text-white flex items-center justify-center transition-all active:scale-95 shadow-xl"
          >
            <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>
      </div>

      {/* Instant Captured Photo Pop-up Viewer */}
      {previewModalPhoto && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 sm:p-5 animate-fade-in">
          <div className="flex items-center justify-between text-white pb-3 border-b border-neutral-800 gap-2">
            <div className="truncate">
              <h4 className="text-sm font-bold flex items-center gap-1.5 truncate">
                <CheckCircle className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">Lossless Photo Captured!</span>
              </h4>
              <p className="text-[11px] text-neutral-400 font-mono mt-0.5 truncate">
                {previewModalPhoto.width}×{previewModalPhoto.height} • {(previewModalPhoto.size / (1024 * 1024)).toFixed(2)} MB (100% Sensor Quality)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => downloadBlob(previewModalPhoto.blob, previewModalPhoto.name)}
                className="px-3 py-1.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition-colors"
              >
                Download
              </button>
              <button
                onClick={() => setPreviewModalPhoto(null)}
                className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            <img
              src={previewModalPhoto.url}
              alt="Captured"
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
            />
          </div>
          <div className="pt-3 text-center border-t border-neutral-800">
            <span className="text-xs font-semibold text-neutral-300">
              Saved directly to Phone A local storage & device downloads
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
