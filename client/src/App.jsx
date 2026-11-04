import React, { useState, useEffect } from 'react';
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

  const handleScanSuccess = async (scannedRoom) => {
    setIsScannerOpen(false);
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
        onOpenQr={() => setIsQrOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        onOpenInstall={() => setIsInstallOpen(true)}
        savedPhotosCount={savedCount}
      />

      {/* Main View Router */}
      <main className={`flex-1 flex flex-col ${activeSession ? 'overflow-hidden' : 'overflow-y-auto pb-20 sm:pb-0'}`}>
        {!user ? (
          <AuthView
            onOpenQr={() => setIsQrOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenInstall={() => setIsInstallOpen(true)}
          />
        ) : activeSession?.role === 'controller' ? (
          /* Device A: Remote Viewfinder & Controller */
          <RemoteViewfinder
            onDisconnect={endSession}
            onOpenGallery={() => setIsGalleryOpen(true)}
            onPhotoSaved={() => setSavedCount((c) => c + 1)}
          />
        ) : activeSession?.role === 'host' ? (
          /* Device B: Camera Streamer & Sensor Capturer */
          <LocalCameraHost onStop={endSession} />
        ) : (
          /* Device Selection & Dashboard */
          <DeviceManager
            onOpenQr={() => setIsQrOpen(true)}
            onOpenScanner={() => setIsScannerOpen(true)}
            onOpenInstall={() => setIsInstallOpen(true)}
            onStartLocalHost={() => {
              // Self host camera mode
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Tab Bar (Gallery, Scan, Pair, Devices, Logout) */}
      <MobileTabBar
        onOpenQr={() => setIsQrOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenGallery={() => setIsGalleryOpen(true)}
        savedPhotosCount={savedCount}
      />

      {/* Incoming Camera Request Prompt (Device B) */}
      <PermissionPromptModal />

      {/* Incoming Room Join Prompt (Device A - when Device B scans QR or requests join) */}
      <RoomJoinPromptModal
        request={incomingRoomJoinRequest}
        onRespond={respondRoomJoin}
      />

      {/* Modals */}
      <QrModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onOpenScanner={() => setIsScannerOpen(true)}
      />
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        onCountChange={(count) => setSavedCount(count)}
      />
      <InstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
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
