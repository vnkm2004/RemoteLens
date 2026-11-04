import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import {
  getAllPhotosLocally,
  deletePhotoLocally,
  downloadBlob,
} from '../utils/storage';
import {
  X,
  Download,
  Trash2,
  Camera,
  Check,
} from 'lucide-react';

export function GalleryModal({ isOpen, onClose, onCountChange }) {
  const { isDark } = useTheme();

  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load photos from IndexedDB
  const loadPhotos = async () => {
    try {
      setLoading(true);
      const list = await getAllPhotosLocally();
      const mapped = list.map((p) => ({
        ...p,
        url: URL.createObjectURL(p.blob),
      }));
      setPhotos(mapped);
      if (onCountChange) onCountChange(mapped.length);
    } catch (err) {
      console.error('Failed to load local photos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Push state when inspecting a photo so Android back button closes inspector first
  const handleOpenPhoto = (photo) => {
    window.history.pushState({ modal: 'photo_inspector' }, '');
    setSelectedPhoto(photo);
  };

  const handleClosePhoto = () => {
    if (window.history.state?.modal === 'photo_inspector') {
      window.history.back();
    } else {
      setSelectedPhoto(null);
    }
  };

  // Close inspector on popstate (back button) without closing the gallery modal
  useEffect(() => {
    const handlePop = (e) => {
      if (selectedPhoto) {
        setSelectedPhoto(null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [selectedPhoto]);

  useEffect(() => {
    if (isOpen) {
      loadPhotos();
    }
  }, [isOpen]);

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this photo from local storage?')) return;

    try {
      await deletePhotoLocally(id);
      const updated = photos.filter((p) => p.id !== id);
      setPhotos(updated);
      if (selectedPhoto && selectedPhoto.id === id) {
        setSelectedPhoto(null);
      }
      if (onCountChange) onCountChange(updated.length);
    } catch (err) {
      console.error('Failed to delete photo:', err);
    }
  };

  const handleDownload = (photo, e) => {
    if (e) e.stopPropagation();
    downloadBlob(photo.blob, photo.name);
  };

  if (!isOpen) return null;

  const totalStorageBytes = photos.reduce((acc, p) => acc + (p.size || 0), 0);
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px) + 12px, 24px)',
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden transition-all"
        style={{
          backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
          borderColor: isDark ? '#262626' : '#e5e5e5',
        }}
      >
        {/* Header */}
        <div
          className="p-3.5 sm:p-5 border-b flex items-center justify-between"
          style={{ borderColor: isDark ? '#262626' : '#e5e5e5' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{
                backgroundColor: isDark ? '#141414' : '#f5f5f5',
                borderColor: isDark ? '#262626' : '#e5e5e5',
                color: isDark ? '#ffffff' : '#000000',
              }}
            >
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3
                className="text-base sm:text-lg font-bold tracking-tight flex items-center gap-2"
                style={{ color: isDark ? '#ffffff' : '#000000' }}
              >
                <span>Device A Local Gallery</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-mono border"
                  style={{
                    backgroundColor: isDark ? '#141414' : '#f5f5f5',
                    borderColor: isDark ? '#262626' : '#e5e5e5',
                    color: isDark ? '#ffffff' : '#000000',
                  }}
                >
                  {photos.length} photos ({totalStorageMB} MB)
                </span>
              </h3>
              <p
                className="text-xs transition-colors"
                style={{ color: isDark ? '#888888' : '#666666' }}
              >
                100% Original Sensor Quality • Stored in Device Local Storage
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors border"
            style={{
              backgroundColor: isDark ? '#141414' : '#f5f5f5',
              borderColor: isDark ? '#262626' : '#e5e5e5',
              color: isDark ? '#ffffff' : '#000000',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {photos.length === 0 ? (
            <div className="py-16 text-center">
              <Camera
                className="w-12 h-12 mx-auto mb-3"
                style={{ color: isDark ? '#404040' : '#d4d4d4' }}
              />
              <h4
                className="text-sm font-bold mb-1"
                style={{ color: isDark ? '#ffffff' : '#000000' }}
              >
                No Photos Captured Yet
              </h4>
              <p
                className="text-xs max-w-sm mx-auto"
                style={{ color: isDark ? '#888888' : '#737373' }}
              >
                Connect Phone B's camera and press the shutter button to click and save high-resolution photos here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => handleOpenPhoto(photo)}
                  className="group relative aspect-square rounded-2xl overflow-hidden border cursor-pointer transition-all shadow-sm"
                  style={{
                    backgroundColor: isDark ? '#141414' : '#f5f5f5',
                    borderColor: isDark ? '#262626' : '#e5e5e5',
                  }}
                >
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-0 group-hover:opacity-100 transition-opacity p-2.5 flex flex-col justify-between">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => handleDownload(photo, e)}
                        title="Download"
                        className="p-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(photo.id, e)}
                        title="Delete"
                        className="p-1.5 rounded-lg bg-black text-white border border-neutral-700 hover:bg-neutral-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div>
                      <span className="block text-[10px] font-mono text-white font-bold">
                        {photo.width} × {photo.height}
                      </span>
                      <span className="block text-[9px] font-mono text-neutral-300">
                        {(photo.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Full Image Inspector Modal (Lowered safely below phone notch/camera cutout) */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/95 flex flex-col justify-between px-3 pb-4 sm:px-6 sm:pb-6 animate-fade-in"
            style={{
              paddingTop: 'max(env(safe-area-inset-top, 0px) + 20px, 34px)',
            }}
          >
            {/* Top Toolbar */}
            <div className="flex items-center justify-between text-white pb-3 border-b border-neutral-800 gap-2">
              <div className="truncate flex items-center gap-2">
                <span className="text-xs font-bold truncate max-w-[120px] sm:max-w-xs">{selectedPhoto.name}</span>
                <span className="text-[10px] font-mono text-white px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 shrink-0">
                  {selectedPhoto.width} × {selectedPhoto.height} (
                  {((selectedPhoto.width * selectedPhoto.height) / 1000000).toFixed(1)} MP)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownload(selectedPhoto)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-black font-bold text-xs shadow active:scale-95 transition-transform"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleDelete(selectedPhoto.id)}
                  title="Delete Photo"
                  className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 active:scale-95 transition-transform"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleClosePhoto}
                  title="Close Preview"
                  className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 active:scale-95 transition-transform"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Image Viewer */}
            <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.name}
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              />
            </div>

            {/* Bottom Metadata Sheet */}
            <div className="pt-3 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
              <div className="flex items-center gap-4">
                <span>Size: <strong className="text-white">{(selectedPhoto.size / (1024 * 1024)).toFixed(2)} MB</strong></span>
                <span>Source: <strong className="text-white">{selectedPhoto.sourceDevice || 'Phone B'}</strong></span>
                <span>Date: <strong className="text-white">{new Date(selectedPhoto.timestamp).toLocaleTimeString()}</strong></span>
              </div>
              <span className="text-[11px] text-white font-mono">
                Lossless Transfer Completed (Zero Degradation)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
