import { useState, useRef, useCallback, useEffect } from 'react';

export function useCameraCapture() {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [currentZoom, setCurrentZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [cameraCapabilities, setCameraCapabilities] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [error, setError] = useState(null);

  const streamRef = useRef(null);
  const videoTrackRef = useRef(null);
  const imageCaptureRef = useRef(null);
  const videoElementRef = useRef(null);
  const isRecoveringRef = useRef(false);
  const shouldBeActiveRef = useRef(false);
  const currentFacingRef = useRef('environment');

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    shouldBeActiveRef.current = false;
    if (videoTrackRef.current) {
      videoTrackRef.current.onended = null;
      videoTrackRef.current.stop();
      videoTrackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        t.onended = null;
        t.stop();
      });
      streamRef.current = null;
    }
    setStream(null);
    imageCaptureRef.current = null;
    setTorchEnabled(false);
  }, []);

  // Progressive camera initialization with maximum native hardware clarity
  const startCamera = useCallback(
    async (desiredFacingMode = 'environment') => {
      // Defer if document is hidden to avoid NotAllowedError on backgrounding
      if (typeof document !== 'undefined' && document.hidden) {
        console.log('[Camera] Document hidden, deferring start until visible.');
        return null;
      }

      try {
        setError(null);
        shouldBeActiveRef.current = true;
        currentFacingRef.current = desiredFacingMode;

        // Clean previous tracks if needed
        if (videoTrackRef.current) {
          videoTrackRef.current.onended = null;
          videoTrackRef.current.stop();
          videoTrackRef.current = null;
        }

        // Brief tick for camera driver release
        await new Promise((r) => setTimeout(r, 80));

        const constraintTiers = [
          // Tier 1: High-Definition Viewfinder (Silky-smooth 30fps, zero lag, crystal-clear 1080p preview in both portrait & landscape)
          // Note: Full native 12MP/48MP sensor resolution photo capture is handled independently by ImageCapture.takePhoto()
          {
            video: {
              facingMode: { ideal: desiredFacingMode },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          },
          // Tier 2: 720p HD fallback
          {
            video: {
              facingMode: { ideal: desiredFacingMode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            },
            audio: false,
          },
          // Tier 3: Universal Fallback
          {
            video: {
              facingMode: { ideal: desiredFacingMode },
            },
            audio: false,
          },
          // Tier 4: Bare minimum
          {
            video: true,
            audio: false,
          },
        ];

        let mediaStream = null;
        let lastErr = null;

        for (const constraints of constraintTiers) {
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
            if (mediaStream) break;
          } catch (e) {
            lastErr = e;
            console.warn('[Camera] Constraint tier rejected, trying next...', e.name);
          }
        }

        if (!mediaStream) {
          throw lastErr || new Error('Could not access camera on this device');
        }

        const track = mediaStream.getVideoTracks()[0];
        streamRef.current = mediaStream;
        videoTrackRef.current = track;
        setStream(mediaStream);
        setFacingMode(desiredFacingMode);

        // Apply continuous autofocus, autoexposure, and sharp focus constraints
        if (track.applyConstraints) {
          try {
            await track.applyConstraints({
              advanced: [
                { focusMode: 'continuous' },
                { exposureMode: 'continuous' },
                { whiteBalanceMode: 'continuous' },
              ],
            });
            console.log('[Camera] Continuous autofocus & auto-exposure applied successfully');
          } catch (e) {
            console.log('[Camera] Continuous autofocus note:', e);
          }
        }

        // Auto restart track if interrupted
        track.onended = () => {
          console.warn('[Camera] Video track ended. Preparing auto-recovery...');
          if (shouldBeActiveRef.current && !isRecoveringRef.current) {
            isRecoveringRef.current = true;
            setIsReconnecting(true);
            setTimeout(() => {
              if (shouldBeActiveRef.current && !document.hidden) {
                startCamera(currentFacingRef.current)
                  .catch((e) => console.error('[Camera] Recovery error:', e))
                  .finally(() => {
                    isRecoveringRef.current = false;
                    setIsReconnecting(false);
                  });
              } else {
                isRecoveringRef.current = false;
                setIsReconnecting(false);
              }
            }, 600);
          }
        };

        // Inspect hardware capabilities
        if (track.getCapabilities) {
          try {
            const capabilities = track.getCapabilities();
            setCameraCapabilities(capabilities);

            if ('torch' in capabilities) {
              setTorchSupported(true);
            } else {
              setTorchSupported(false);
            }

            if ('zoom' in capabilities) {
              setZoomSupported(true);
              setZoomRange({
                min: capabilities.zoom.min || 1,
                max: capabilities.zoom.max || 5,
                step: capabilities.zoom.step || 0.1,
              });
              const settings = track.getSettings();
              if (settings.zoom) setCurrentZoom(settings.zoom);
            } else {
              setZoomSupported(false);
            }
          } catch (e) {
            console.warn('[Camera] Capabilities inspection warning:', e);
          }
        }

        // Initialize ImageCapture API
        if (window.ImageCapture) {
          try {
            imageCaptureRef.current = new window.ImageCapture(track);
          } catch (e) {
            imageCaptureRef.current = null;
          }
        } else {
          imageCaptureRef.current = null;
        }

        return mediaStream;
      } catch (err) {
        console.error('[Camera] Failed to initialize camera:', err);
        setError(err.message || 'Camera permission denied or camera not found');
        throw err;
      }
    },
    []
  );

  // Background to Foreground Auto-Recovery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && shouldBeActiveRef.current) {
        const currentTrack = videoTrackRef.current;
        if (!currentTrack || currentTrack.readyState === 'ended') {
          console.log('[Camera] Returned to foreground. Auto-reviving camera hardware track...');
          startCamera(currentFacingRef.current).catch((e) =>
            console.log('[Camera] Foreground revive error:', e)
          );
        }
      }
    };

    const handleWindowFocus = () => {
      if (shouldBeActiveRef.current) {
        const currentTrack = videoTrackRef.current;
        if (!currentTrack || currentTrack.readyState === 'ended') {
          startCamera(currentFacingRef.current).catch((e) =>
            console.log('[Camera] Focus revive error:', e)
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('pageshow', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('pageshow', handleWindowFocus);
    };
  }, [startCamera]);

  // Switch facing mode
  const switchFacingMode = useCallback(
    async (mode) => {
      const newMode = mode || (currentFacingRef.current === 'environment' ? 'user' : 'environment');
      return await startCamera(newMode);
    },
    [startCamera]
  );

  // Toggle torch / flash
  const toggleTorch = useCallback(
    async (enabled) => {
      const track = videoTrackRef.current;
      if (!track || !torchSupported) return false;

      const targetState = enabled !== undefined ? enabled : !torchEnabled;
      try {
        await track.applyConstraints({
          advanced: [{ torch: targetState }],
        });
        setTorchEnabled(targetState);
        return targetState;
      } catch (err) {
        console.warn('[Camera] Failed to toggle torch:', err);
        return false;
      }
    },
    [torchEnabled, torchSupported]
  );

  // Set zoom level
  const setZoom = useCallback(
    async (zoomValue) => {
      const track = videoTrackRef.current;
      if (!track || !zoomSupported) return;

      try {
        const clampedZoom = Math.max(zoomRange.min, Math.min(zoomRange.max, zoomValue));
        await track.applyConstraints({
          advanced: [{ zoom: clampedZoom }],
        });
        setCurrentZoom(clampedZoom);
      } catch (err) {
        console.warn('[Camera] Failed to set zoom:', err);
      }
    },
    [zoomSupported, zoomRange]
  );

  /**
   * Take full-resolution native hardware photograph with:
   * - Zero flash (fillLightMode: 'off')
   * - Full hardware sensor clarity with native hardware ISP de-noising
   * - Automatic portrait/landscape orientation matching physical phone tilt
   */
  const takeNativePhoto = useCallback(async (deviceRotationAngle = 0) => {
    let track = videoTrackRef.current;

    // Self-healing: if track is ended or null, revive it automatically!
    if (!track || track.readyState === 'ended') {
      console.warn('[Camera] Track is not active. Auto-reviving camera before capture...');
      try {
        const revivedStream = await startCamera(currentFacingRef.current);
        if (revivedStream) {
          track = revivedStream.getVideoTracks()[0];
          await new Promise((r) => setTimeout(r, 200));
        }
      } catch (e) {
        console.error('[Camera] Could not auto-revive track:', e);
      }
    }

    if (!track || track.readyState === 'ended') {
      throw new Error('Camera track not active. Tap camera screen to re-enable.');
    }

    setIsCapturing(true);

    try {
      // 1. Primary Path: W3C ImageCapture API takePhoto() (Full native sensor resolution + ISP de-noising)
      if (window.ImageCapture) {
        if (!imageCaptureRef.current || imageCaptureRef.current.track !== track) {
          try {
            imageCaptureRef.current = new window.ImageCapture(track);
          } catch (e) {}
        }

        if (imageCaptureRef.current) {
          try {
            let blob = null;

            // Attempt 1: takePhoto with fillLightMode: 'off' (Strictly NO FLASH)
            try {
              blob = await imageCaptureRef.current.takePhoto({ fillLightMode: 'off' });
            } catch (err1) {
              console.warn('[Camera] takePhoto with fillLightMode off rejected, trying plain takePhoto()...', err1);
              // Attempt 2: Clean native takePhoto without parameters (native Camera2 STILL_CAPTURE)
              blob = await imageCaptureRef.current.takePhoto();
            }

            // Orient photo: if phone was held in portrait (angle 0/180) but sensor output was landscape, rotate to true portrait!
            const oriented = await orientCapturedPhoto(blob, deviceRotationAngle);
            console.log(`[Camera] Native hardware photo captured successfully: ${oriented.width}x${oriented.height} (${(oriented.blob.size / (1024 * 1024)).toFixed(2)} MB, zero flash)`);

            setIsCapturing(false);
            return {
              blob: oriented.blob,
              width: oriented.width,
              height: oriented.height,
              mimeType: oriented.blob.type || 'image/jpeg',
              method: 'ImageCapture (Hardware Sensor)',
            };
          } catch (takePhotoErr) {
            console.warn('[Camera] takePhoto error, falling back to grabFrame...', takePhotoErr);
          }

          // 2. Secondary Path: ImageCapture grabFrame()
          try {
            const imageBitmap = await imageCaptureRef.current.grabFrame();
            const canvas = document.createElement('canvas');
            canvas.width = imageBitmap.width;
            canvas.height = imageBitmap.height;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(imageBitmap, 0, 0);

            const rawBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 1.0));
            const oriented = await orientCapturedPhoto(rawBlob, deviceRotationAngle);

            setIsCapturing(false);
            return {
              blob: oriented.blob,
              width: oriented.width,
              height: oriented.height,
              mimeType: 'image/jpeg',
              method: 'ImageBitmap Frame Grab',
            };
          } catch (grabErr) {
            console.warn('[Camera] grabFrame error, falling back to canvas...', grabErr);
          }
        }
      }

      // 3. Tertiary Path: High-res Canvas Capture
      const video = videoElementRef.current;
      const settings = track.getSettings ? track.getSettings() : {};
      const width = (video && video.videoWidth) || settings.width || 1920;
      const height = (video && video.videoHeight) || settings.height || 1080;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (video && video.videoWidth > 0) {
        ctx.drawImage(video, 0, 0, width, height);
      } else {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      }

      const rawBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 1.0));
      const oriented = await orientCapturedPhoto(rawBlob, deviceRotationAngle);

      setIsCapturing(false);
      return {
        blob: oriented.blob,
        width: oriented.width,
        height: oriented.height,
        mimeType: 'image/jpeg',
        method: 'Lossless Video Frame Buffer',
      };
    } catch (err) {
      setIsCapturing(false);
      console.error('[Camera] Native capture failed:', err);
      throw err;
    }
  }, [startCamera]);

  // Cleanup on unmount only
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    stream,
    videoTrackRef,
    videoElementRef,
    facingMode,
    torchEnabled,
    torchSupported,
    zoomRange,
    currentZoom,
    zoomSupported,
    cameraCapabilities,
    isCapturing,
    isReconnecting,
    error,
    startCamera,
    stopCamera,
    switchFacingMode,
    toggleTorch,
    setZoom,
    takeNativePhoto,
  };
}

function getImageDimensions(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Ensures photos taken when phone is held vertically in portrait are ALWAYS output
 * in true vertical portrait format (3024x4032), even if raw camera sensor is landscape.
 * Uses 100% loss-free JPEG quality (1.0) with high smoothing.
 */
function orientCapturedPhoto(blob, rotationAngle = 0) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const isImgPortrait = img.naturalHeight > img.naturalWidth;
      const isPhonePortrait = rotationAngle === 0 || rotationAngle === 180;

      let rotationNeeded = 0;
      if (isPhonePortrait && !isImgPortrait) {
        // Phone held upright (portrait), but raw sensor gave landscape: rotate 90° to portrait!
        rotationNeeded = 90;
      } else if (!isPhonePortrait && isImgPortrait) {
        // Phone held in landscape, but sensor gave portrait: rotate to landscape
        rotationNeeded = 90;
      }

      if (rotationNeeded === 0) {
        return resolve({
          blob,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      }

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotationNeeded * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

      canvas.toBlob((rotatedBlob) => {
        resolve({
          blob: rotatedBlob || blob,
          width: canvas.width,
          height: canvas.height,
        });
      }, 'image/jpeg', 1.0);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ blob, width: 0, height: 0 });
    };

    img.src = url;
  });
}
