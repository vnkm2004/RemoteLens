import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Navbar } from './components/Navbar';
import { AuthView } from './components/AuthView';
import { DeviceManager } from './components/DeviceManager';
import { PermissionPromptModal } from './components/PermissionPromptModal';
import { RoomJoinPromptModal } from './components/RoomJoinPromptModal';
import { RemoteViewfinder } from './components/RemoteViewfinder';
import { LocalCameraHost } from './components/LocalCameraHost';
import { GalleryModal } from './components/GalleryModal';
import { QrModal } from './components/QrModal';
import { QrScannerModal } from './components/QrScannerModal';
import { MobileTabBar } from './components/MobileTabBar';
import { InstallModal } from './components/InstallModal';
import { getAllPhotosLocally } from './utils/storage';

function MainApp() {
  const {
    user,
    activeSession,
    endSession,
    incomingRoomJoinRequest,
    respondRoomJoin,
    requestJoinRoom,
    login,
  } = useAuth();
  const { isDark } = useTheme();

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Load saved photo count on mount
  useEffect(() => {
    getAllPhotosLocally()
      .then((photos) => setSavedCount(photos.length))
      .catch((err) => console.log('Could not load local photos count:', err));
  }, []);

  // Universal Navigation & Back-Button Handler (Both Mobile Browser and Android APK)
  // Ensures hardware back button and swipe-back gestures close overlays/sessions instead of exiting app!
  const openModal = useCallback((modalName) => {
    window.history.pushState({ modal: modalName }, '');
    if (modalName === 'gallery') setIsGalleryOpen(true);
    else if (modalName === 'scanner') setIsScannerOpen(true);
    else if (modalName === 'qr') setIsQrOpen(true);
    else if (modalName === 'install') setIsInstallOpen(true);
  }, []);

  const closeModal = useCallback((modalName) => {
    if (window.history.state?.modal === modalName) {
      window.history.back();
    } else {
      if (modalName === 'gallery') setIsGalleryOpen(false);
      else if (modalName === 'scanner') setIsScannerOpen(false);
      else if (modalName === 'qr') setIsQrOpen(false);
      else if (modalName === 'install') setIsInstallOpen(false);
    }
  }, []);

  // When activeSession starts, push a history entry for back-navigation
  useEffect(() => {
    if (activeSession) {
      window.history.pushState({ view: 'session' }, '');
    }
  }, [activeSession?.peerSocketId]);

  // Handle hardware / browser popstate back events
  useEffect(() => {
    if (!window.history.state) {
      window.history.replaceState({ page: 'root' }, '');
    }

    const handlePopState = (event) => {
      console.log('[Navigation] Hardware / system Back pressed:', event.state);
      // Close topmost open overlay first
      if (isGalleryOpen) {
        setIsGalleryOpen(false);
      } else if (isScannerOpen) {
        setIsScannerOpen(false);
      } else if (isQrOpen) {
        setIsQrOpen(false);
      } else if (isInstallOpen) {
        setIsInstallOpen(false);
      } else if (activeSession) {
        console.log('[Navigation] Back pressed during camera session: returning to dashboard');
        endSession();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isGalleryOpen, isScannerOpen, isQrOpen, isInstallOpen, activeSession, endSession]);

  const handleScanSuccess = async (scannedRoom) => {
    closeModal('scanner');
    console.log('[App] QR Code scanned successfully with room:', scannedRoom);
    try {
      if (user) {
        await requestJoinRoom(scannedRoom);
      } else {
        await login(scannedRoom, '');
      }
    } catch (e) {
      console.warn('[App] Error joining scanned room:', e);
    }
  };

  const handleEndSessionBack = () => {
    if (window.history.state?.view === 'session') {
      window.history.back();
    } else {
      endSession();
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{
        backgroundColor: isDark ? '#000000' : '#ffffff',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      {/* Top Navbar */}
      <Navbar
        onOpenQr={() => openModal('qr')}
        onOpenScanner={() => openModal('scanner')}
        onOpenGallery={() => openModal('gallery')}
        onOpenInstall={() => openModal('install')}
        savedPhotosCount={savedCount}
      />

      {/* Main View Router */}
      <main className={`flex-1 flex flex-col ${activeSession ? 'overflow-hidden' : 'overflow-y-auto pb-20 sm:pb-0'}`}>
        {!user ? (
          <AuthView
            onOpenQr={() => openModal('qr')}
            onOpenScanner={() => openModal('scanner')}
            onOpenInstall={() => openModal('install')}
          />
        ) : activeSession?.role === 'controller' ? (
          /* Device A: Remote Viewfinder & Controller */
          <RemoteViewfinder
            onDisconnect={handleEndSessionBack}
            onOpenGallery={() => openModal('gallery')}
            onPhotoSaved={() => setSavedCount((c) => c + 1)}
          />
        ) : activeSession?.role === 'host' ? (
          /* Device B: Camera Streamer & Sensor Capturer */
          <LocalCameraHost onStop={handleEndSessionBack} />
        ) : (
          /* Device Selection & Dashboard */
          <DeviceManager
            onOpenQr={() => openModal('qr')}
            onOpenScanner={() => openModal('scanner')}
            onOpenInstall={() => openModal('install')}
            onStartLocalHost={() => {
              // Self host camera mode
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Tab Bar (Gallery, Scan, Pair, Devices, Logout) */}
      <MobileTabBar
        onOpenQr={() => openModal('qr')}
        onOpenScanner={() => openModal('scanner')}
        onOpenGallery={() => openModal('gallery')}
        savedPhotosCount={savedCount}
      />

      {/* Incoming Camera Request Prompt (Device B) */}
      <PermissionPromptModal />

      {/* Incoming Room Join Prompt (Device A - when Device B scans QR or requests join) */}
      <RoomJoinPromptModal
        request={incomingRoomJoinRequest}
        onRespond={respondRoomJoin}
      />

      {/* Modals with Back-Button Awareness */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => closeModal('qr')}
        onOpenScanner={() => openModal('scanner')}
      />
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => closeModal('scanner')}
        onScanSuccess={handleScanSuccess}
      />
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => closeModal('gallery')}
        onCountChange={(count) => setSavedCount(count)}
      />
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => closeModal('install')}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
