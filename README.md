# RemoteLens Pro 📸

Zero-quality-degradation remote camera control and capture system for Web and Android.

## Overview
**RemoteLens Pro** allows two devices (e.g. Device A and Device B, or Phone and Laptop) to link over local Wi-Fi or mobile hotspot (100% offline, zero internet needed). When Device A taps the shutter, Device B captures photographs at full native hardware sensor resolution and transmits the raw binary file directly to Device A with zero compression loss.

## Features
- **Zero Quality Loss**: Captures native still photographs via the W3C `ImageCapture.takePhoto()` API at the full native hardware sensor resolution.
- **High Performance Viewfinder**: 1080p Full HD live video preview with sub-50ms latency over WebRTC.
- **Orientation Synchronization**: Tilting or rotating Device B automatically and smoothly rotates the live viewfinder on Device A, saving true portrait and landscape photos.
- **No Flash by Default**: Native hardware sensor capture with zero flash trigger and built-in hardware ISP de-noising.
- **Multi-Path Binary Delivery**: Direct LAN HTTP streaming + WebSocket binary buffers for instant (<200ms) lossless photo transmission.
- **Clean Black & Clean White Themes**: Pure `#000000` pitch black and pure `#ffffff` white themes without blue or slate tints.
- **Native Android APK & PWA**: Standalone PWA and native Android APK built with Capacitor.
- **1-Tap QR Pairing & Wi-Fi Discovery**: Connect instantly by scanning an on-screen QR code or selecting active rooms on the local network.

## Getting Started

### 1. Install Dependencies
```bash
npm install
npm --prefix client install
npm --prefix server install
```

### 2. Run Server
```bash
npm start
```
The server will run on `https://<YOUR-IP>:5000` and display an ASCII QR code in the terminal.

### 3. Build Client & Android APK
```bash
# Build React client
npm --prefix client run build

# Sync & Compile Android APK
npm run android:sync
cd client/android && ./gradlew assembleDebug
```

