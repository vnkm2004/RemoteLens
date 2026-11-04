import React, { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { useTheme } from '../context/ThemeContext';
import {
  Camera,
  X,
  RefreshCw,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Zap,
  ZapOff,
} from 'lucide-react';

export function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const { isDark } = useTheme();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const hasDetectedRef = useRef(false);

  const [facingMode, setFacingMode] = useState('environment');
  const [cameraError, setCameraError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Play subtle feedback beep on successful QR scan
  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 note
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch (e) {}
  };

  // Extract clean Room ID from scanned QR text (handles URLs, raw room strings, JSON)
  const extractRoomId = (raw) => {
    if (!raw) return null;
    const text = String(raw).trim();

    // Check if JSON
    try {
      const parsed = JSON.parse(text);
      if (parsed.room || parsed.roomId || parsed.username) {
        return (parsed.room || parsed.roomId || parsed.username).trim().toLowerCase();
      }
    } catch (e) {}

    // Check if URL with ?pair=...
    try {
      const url = new URL(text);
      const pair = url.searchParams.get('pair');
      if (pair) return pair.trim().toLowerCase();
      const room = url.searchParams.get('room');
      if (room) return room.trim().toLowerCase();
    } catch (e) {
      // Not a full URL, continue
    }

    // Check if string contains ?pair=
    const pairMatch = text.match(/[?&]pair=([^&#]+)/i);
    if (pairMatch) {
      return decodeURIComponent(pairMatch[1]).trim().toLowerCase();
    }

    // Raw room string like "room-212" or "camera123"
    return text.replace(/[^a-zA-Z0-9_-]/g, '').trim().toLowerCase();
  };

  // Start hardware camera
  const startCamera = useCallback(async (facing) => {
    setCameraError(null);
    hasDetectedRef.current = false;

    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsScanning(true);
      }

      // Check torch support
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setTorchSupported(Boolean(capabilities.torch));
      }
    } catch (err) {
      console.error('[QR Scanner] Camera error:', err);
      setCameraError(err.message || 'Could not access camera for scanning');
      setIsScanning(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
    setTorchEnabled(false);
  }, []);

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        const next = !torchEnabled;
        await track.applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchEnabled(next);
      } catch (e) {
        console.warn('Torch toggle failed:', e);
      }
    }
  };

  // Flip lens
  const flipCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Active scanning frame loop
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera(facingMode);

    let barcodeDetector = null;
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        barcodeDetector = null;
      }
    }

    const canvas = canvasRef.current || document.createElement('canvas');
    canvasRef.current = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let isProcessing = false;
    let lastScanTime = 0;
    const SCAN_INTERVAL_MS = 120; // 8 scans/sec: instant detection, zero phone overheating

    const scanFrame = async () => {
      if (hasDetectedRef.current) return;

      const now = performance.now();
      if (now - lastScanTime < SCAN_INTERVAL_MS) {
        if (!hasDetectedRef.current) {
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
        return;
      }

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !isProcessing) {
        lastScanTime = now;
        isProcessing = true;

        try {
          let detectedCode = null;

          // Strategy 1: Native hardware-accelerated BarcodeDetector (instant on Chromium/Android)
          if (barcodeDetector) {
            try {
              const barcodes = await barcodeDetector.detect(video);
              if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                detectedCode = barcodes[0].rawValue;
              }
            } catch (e) {
              // BarcodeDetector error, fallback to jsQR
            }
          }

          // Strategy 2: High-efficiency JS fallback with jsQR (480px optimized matrix)
          if (!detectedCode && ctx && video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = Math.min(480, video.videoWidth);
            canvas.height = Math.round((canvas.width * video.videoHeight) / video.videoWidth);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code && code.data) {
              detectedCode = code.data;
            }
          }

          if (detectedCode && !hasDetectedRef.current) {
            const roomId = extractRoomId(detectedCode);
            if (roomId) {
              hasDetectedRef.current = true;
              playBeep();
              if ('vibrate' in navigator) navigator.vibrate([60, 40, 60]);

              stopCamera();
              onScanSuccess(roomId);
              return;
            }
          }
        } catch (err) {
          console.warn('[QR Scan] Frame error:', err);
        } finally {
          isProcessing = false;
        }
      }

      if (!hasDetectedRef.current) {
        animationFrameRef.current = requestAnimationFrame(scanFrame);
      }
    };

    const timer = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(scanFrame);
    }, 300);

    return () => {
      clearTimeout(timer);
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-md rounded-3xl border overflow-hidden shadow-2xl flex flex-col relative"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
          color: isDark ? '#ffffff' : '#000000',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: isDark ? '#262626' : '#e5e5e5' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
              }}
            >
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Scan to Join Room</h3>
              <p className="text-[11px]" style={{ color: isDark ? '#a3a3a3' : '#737373' }}>
                Point at Device A's QR code to pair
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full border transition-all active:scale-95"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative w-full aspect-square bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
          />

          {/* Scanning Box Reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-10">
            <div className="w-56 h-56 sm:w-64 sm:h-64 border-2 border-white/60 rounded-3xl relative overflow-hidden shadow-2xl">
              {/* Corner highlights */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-xl"></div>

              {/* Animated laser line */}
              <div className="w-full h-0.5 bg-white shadow-[0_0_12px_#ffffff] animate-laser-scan"></div>
            </div>
          </div>

          {/* Viewfinder Controls Overlay */}
          <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-3 pointer-events-auto">
            {torchSupported && (
              <button
                onClick={toggleTorch}
                className="p-2.5 rounded-full bg-black/75 backdrop-blur-md border border-neutral-700 text-white shadow-lg active:scale-95 transition-all"
                title={torchEnabled ? 'Turn torch off' : 'Turn torch on'}
              >
                {torchEnabled ? <Zap className="w-4 h-4 text-white" /> : <ZapOff className="w-4 h-4 text-neutral-400" />}
              </button>
            )}

            <button
              onClick={flipCamera}
              className="p-2.5 rounded-full bg-black/75 backdrop-blur-md border border-neutral-700 text-white shadow-lg active:scale-95 transition-all"
              title="Flip camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Error Message */}
          {cameraError && (
            <div className="absolute inset-x-4 top-4 p-3 rounded-2xl bg-black/90 border border-neutral-700 text-white text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-white" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Instructions Footer */}
        <div
          className="p-4 border-t text-center text-xs space-y-1.5"
          style={{
            borderColor: isDark ? '#262626' : '#e5e5e5',
            backgroundColor: isDark ? '#0f0f0f' : '#fcfcfc',
          }}
        >
          <p className="font-semibold" style={{ color: isDark ? '#ffffff' : '#000000' }}>
            Auto-detection active
          </p>
          <p className="text-[11px]" style={{ color: isDark ? '#a3a3a3' : '#737373' }}>
            Position Device A's QR code within the frame. Once scanned, Device A will be prompted to approve pairing.
          </p>
        </div>
      </div>
    </div>
  );
}

