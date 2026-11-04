import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Screen WakeLock hook to prevent phone screen from dimming/sleeping
 * and cutting off the camera stream or viewfinder.
 */
export function useWakeLock(enabled = true) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef(null);

  const requestLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('[WakeLock] API not supported on this browser');
      return;
    }

    try {
      if (wakeLockRef.current !== null) {
        return;
      }
      const lock = await navigator.wakeLock.request('screen');
      wakeLockRef.current = lock;
      setIsLocked(true);
      console.log('[WakeLock] Screen lock acquired - phone will not sleep');

      lock.addEventListener('release', () => {
        wakeLockRef.current = null;
        setIsLocked(false);
        console.log('[WakeLock] Screen lock released');
      });
    } catch (err) {
      console.warn(`[WakeLock] Could not acquire lock: ${err.message}`);
      setIsLocked(false);
    }
  }, []);

  const releaseLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsLocked(false);
      } catch (err) {
        console.warn(`[WakeLock] Release error: ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      requestLock();

      // Re-acquire lock when app comes back to foreground
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && enabled) {
          requestLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        releaseLock();
      };
    } else {
      releaseLock();
    }
  }, [enabled, requestLock, releaseLock]);

  return { isLocked, requestLock, releaseLock };
}

