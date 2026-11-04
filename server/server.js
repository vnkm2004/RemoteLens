import express from 'express';
import http from 'http';
import https from 'https';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import os from 'os';
import qrcode from 'qrcode';
import selfsigned from 'selfsigned';

// Protect process from unhandled crashes or sudden network drops
process.on('uncaughtException', (err) => {
  console.error('[Process Protected] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process Protected] Unhandled rejection:', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-target-socket-id', 'x-photo-metadata'],
}));
app.options('*', cors());
app.use(express.json({ limit: '50mb' }));

// Local IP discovery helper
function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

// Generate or load self-signed certificate for HTTPS
function getCertificates() {
  const certDir = path.join(__dirname, 'certs');
  const keyPath = path.join(certDir, 'server.key');
  const certPath = path.join(certDir, 'server.crt');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }

  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
  }

  const localIps = getLocalIpAddresses();
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    ...localIps.map(ip => ({ type: 7, ip }))
  ];

  const pems = selfsigned.generate(
    [{ name: 'commonName', value: 'RemoteCameraApp' }],
    {
      days: 365,
      algorithm: 'sha256',
      keySize: 2048,
      extensions: [{ name: 'subjectAltName', altNames }]
    }
  );

  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);

  return { key: pems.private, cert: pems.cert };
}

const certs = getCertificates();
const PORT = process.env.PORT || 5000;
const server = https.createServer(certs, app);

// Handle client aborted SSL handshakes without crashing
server.on('clientError', (err, socket) => {
  if (err.code === 'ECONNRESET' || !socket.writable) return;
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: 1e8, // 100MB buffer for binary fallback
  pingInterval: 10000,
  pingTimeout: 10000,
});

// Simple Database
const dbFilePath = path.join(__dirname, 'data.json');
let db = { users: {}, devices: {} };

try {
  if (fs.existsSync(dbFilePath)) {
    db = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
  }
} catch (e) {
  console.error('Error reading db file:', e);
}

function saveDb() {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('Error saving db:', e);
  }
}

// Active connections: socketId -> device metadata
const activeSockets = new Map();
// Persistent session tracking: deviceId -> session metadata
const persistentDeviceSessions = new Map();

// REST API for Auth & Network Info
app.get('/api/info', async (req, res) => {
  const localIps = getLocalIpAddresses();
  const primaryIp = localIps[0] || 'localhost';
  const pairRoom = req.query.room || '';
  const url = pairRoom
    ? `https://${primaryIp}:${PORT}?pair=${encodeURIComponent(pairRoom)}`
    : `https://${primaryIp}:${PORT}`;
  
  try {
    const qrDataUrl = await qrcode.toDataURL(url, { margin: 1, scale: 6 });
    res.json({
      primaryIp,
      allIps: localIps,
      port: PORT,
      url,
      qrDataUrl,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User registration / login endpoint (supports instant zero-password pairing)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username) {
    return res.status(400).json({ error: 'Session ID or username is required' });
  }

  const cleanUser = username.trim().toLowerCase();
  const pass = password ? password.trim() : 'nopass';

  if (!db.users[cleanUser]) {
    // Auto-create room/account without password if none given
    db.users[cleanUser] = {
      username: cleanUser,
      password: pass,
      createdAt: new Date().toISOString(),
    };
    saveDb();
  } else if (password && db.users[cleanUser].password !== 'nopass' && db.users[cleanUser].password !== pass) {
    return res.status(401).json({ error: 'Invalid passcode for this room' });
  }

  res.json({
    success: true,
    user: {
      username: cleanUser,
    }
  });
});

// Dynamic QR code generator endpoint
app.get('/api/qr', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
  try {
    const qrDataUrl = await qrcode.toDataURL(targetUrl, { margin: 1, scale: 6 });
    res.json({ qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Map to hold temporary photo transfers in memory (key: photoId)
const pendingPhotoTransfers = new Map();

// High-speed LAN endpoint for Phone B to upload raw uncompressed sensor photo
app.post('/api/photo/transfer', (req, res) => {
  const photoId = `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const chunks = [];
  let totalLength = 0;

  req.on('data', (chunk) => {
    chunks.push(chunk);
    totalLength += chunk.length;
  });

  req.on('end', () => {
    const buffer = Buffer.concat(chunks, totalLength);
    const targetSocketId = req.query.targetSocketId || req.headers['x-target-socket-id'];
    const metadataHeader = req.query.metadata || req.headers['x-photo-metadata'];
    let metadata = {};
    try {
      if (metadataHeader) metadata = JSON.parse(decodeURIComponent(metadataHeader));
    } catch (e) {}

    pendingPhotoTransfers.set(photoId, {
      buffer,
      mimeType: metadata.mimeType || req.headers['content-type'] || 'image/jpeg',
      name: metadata.name || `CAPTURE_${Date.now()}.jpg`,
      metadata,
      createdAt: Date.now(),
    });

    // Auto cleanup after 10 minutes
    setTimeout(() => {
      pendingPhotoTransfers.delete(photoId);
    }, 10 * 60 * 1000);

    console.log(`[Photo Transfer] Received photo ${photoId} (${(totalLength / (1024 * 1024)).toFixed(2)} MB), notifying target ${targetSocketId}`);

    // Notify Phone A immediately via Socket.io
    if (targetSocketId) {
      io.to(targetSocketId).emit('photo_ready_download', {
        photoId,
        metadata: {
          ...metadata,
          id: photoId,
          size: totalLength,
        },
      });
    }

    res.json({ success: true, photoId, size: totalLength });
  });

  req.on('error', (err) => {
    console.error('[Photo Transfer] Upload stream error:', err);
    res.status(500).json({ error: err.message });
  });
});

// High-speed LAN endpoint for Phone A to download the raw uncompressed sensor photo
app.get('/api/photo/transfer/:photoId', (req, res) => {
  const photo = pendingPhotoTransfers.get(req.params.photoId);
  if (!photo) {
    return res.status(404).json({ error: 'Photo not found or expired' });
  }

  res.setHeader('Content-Type', photo.mimeType);
  res.setHeader('Content-Length', photo.buffer.length);
  res.setHeader('Content-Disposition', `inline; filename="${photo.name}"`);
  res.send(photo.buffer);
});

// Endpoint to download the built Android APK file if present
app.get('/api/download/apk', (req, res) => {
  const apkPath = path.join(__dirname, '../client/android/app/build/outputs/apk/debug/app-debug.apk');
  if (fs.existsSync(apkPath)) {
    res.download(apkPath, 'RemoteLens-Pro.apk');
  } else {
    res.status(404).json({
      error: 'APK not yet compiled. Use the "Add to Home Screen" PWA install button for instant 1-tap installation, or build APK in Android Studio via "npm run android:open".'
    });
  }
});

// Serve frontend build if present with strict no-cache on HTML to prevent stale browser caches
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

// Helper: Get all active devices in an account
function getAccountDevices(accountId) {
  const devices = [];
  for (const [sockId, dev] of activeSockets.entries()) {
    if (dev.accountId === accountId && !dev.isDead) {
      devices.push({
        socketId: sockId,
        deviceId: dev.deviceId,
        deviceName: dev.deviceName,
        userAgent: dev.userAgent,
        isCameraActive: dev.isCameraActive || false,
        activeWith: dev.activeWith || null,
        supportedCameras: dev.supportedCameras || [],
        isBackgrounded: dev.isBackgrounded || false,
      });
    }
  }
  return devices;
}

// Helper: Get list of active nearby rooms on local Wi-Fi / hotspot
function getNearbyRoomsList() {
  const roomsMap = new Map();
  for (const [sockId, dev] of activeSockets.entries()) {
    if (!dev.accountId || dev.isDead) continue;
    if (!roomsMap.has(dev.accountId)) {
      roomsMap.set(dev.accountId, {
        roomId: dev.accountId,
        deviceCount: 0,
        devices: [],
        createdAt: db.users[dev.accountId]?.createdAt || new Date().toISOString(),
      });
    }
    const r = roomsMap.get(dev.accountId);
    r.deviceCount++;
    r.devices.push({
      socketId: sockId,
      deviceId: dev.deviceId,
      deviceName: dev.deviceName,
      isCameraActive: dev.isCameraActive || false,
    });
  }
  return Array.from(roomsMap.values());
}

// REST API for Nearby Rooms Discovery on Local Wi-Fi
app.get('/api/rooms/nearby', (req, res) => {
  res.json({
    success: true,
    rooms: getNearbyRoomsList(),
  });
});

// Helper: Broadcast device list to all sockets in account room
function broadcastDeviceList(accountId) {
  const devices = getAccountDevices(accountId);
  io.to(`account:${accountId}`).emit('devices_update', devices);
}

// Socket.io Real-Time Signaling & Remote Control
io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Device registration upon connecting to an account
  socket.on('register_device', ({ accountId, deviceId, deviceName, userAgent, supportedCameras }) => {
    const cleanAccount = String(accountId || '').trim().toLowerCase();
    if (!cleanAccount) return;
    socket.join(`account:${cleanAccount}`);

    let previousSession = persistentDeviceSessions.get(deviceId);
    let previousSocketId = null;

    // Find and clean up previous socket entry for this deviceId
    for (const [sId, existingDev] of activeSockets.entries()) {
      if (existingDev.deviceId === deviceId && sId !== socket.id) {
        previousSocketId = sId;
        activeSockets.delete(sId);
      }
    }

    const deviceData = {
      socketId: socket.id,
      accountId: cleanAccount,
      deviceId,
      deviceName: deviceName || 'Unnamed Phone',
      userAgent,
      isCameraActive: previousSession?.isCameraActive || false,
      activeWith: previousSession?.activeWith || null,
      activeRole: previousSession?.activeRole || null,
      cameraFacing: previousSession?.cameraFacing || 'environment',
      supportedCameras: supportedCameras || [],
      isBackgrounded: false,
      lastSeen: Date.now(),
    };

    activeSockets.set(socket.id, deviceData);
    persistentDeviceSessions.set(deviceId, deviceData);

    console.log(`[Device Registered] ${deviceName} (${deviceId}) on account: ${cleanAccount}`);

    // Seamless Session Re-Binding after Backgrounding / Tab Switch
    if (previousSession && previousSession.activeWith) {
      const partnerSocketId = previousSession.activeWith;
      const partnerDev = activeSockets.get(partnerSocketId);

      if (partnerDev) {
        console.log(`[Session Reconnected] Updating partner ${partnerDev.deviceName} with new socket ${socket.id}`);
        // Notify partner of our new socket ID
        io.to(partnerSocketId).emit('peer_socket_updated', {
          oldSocketId: previousSocketId,
          newSocketId: socket.id,
          deviceId,
        });

        // Notify reconnecting device to restore active session immediately!
        socket.emit('session_restored', {
          peerSocketId: partnerSocketId,
          peerName: partnerDev.deviceName,
          role: previousSession.activeRole,
          cameraFacing: previousSession.cameraFacing,
        });

        // Update partner's activeWith pointer
        partnerDev.activeWith = socket.id;
      }
    }

    broadcastDeviceList(cleanAccount);
  });

  // Query nearby rooms via socket
  socket.on('get_nearby_rooms', () => {
    socket.emit('nearby_rooms_update', getNearbyRoomsList());
  });

  // Device requests to join an existing room (e.g. by scanning QR or selecting from nearby list)
  socket.on('request_join_room', ({ targetRoom, requesterDeviceId, requesterDeviceName }) => {
    const cleanRoom = targetRoom ? targetRoom.trim().toLowerCase() : '';
    if (!cleanRoom) {
      return socket.emit('join_room_result', { accepted: false, reason: 'Invalid room name' });
    }

    // Find any existing active devices in target room
    const targetRoomDevices = [];
    for (const [sId, dev] of activeSockets.entries()) {
      if (dev.accountId === cleanRoom && !dev.isDead && sId !== socket.id) {
        targetRoomDevices.push({ socketId: sId, deviceId: dev.deviceId, deviceName: dev.deviceName });
      }
    }

    console.log(`[Join Room Request] ${requesterDeviceName} wants to join "${cleanRoom}". Active hosts in room: ${targetRoomDevices.length}`);

    if (targetRoomDevices.length === 0) {
      // Room has no active devices; allow direct join immediately
      socket.emit('join_room_result', { accepted: true, targetRoom: cleanRoom });
      return;
    }

    // Notify all active devices in the target room about the join request
    targetRoomDevices.forEach((hostDev) => {
      io.to(hostDev.socketId).emit('room_join_prompt', {
        requesterSocketId: socket.id,
        requesterDeviceId,
        requesterDeviceName: requesterDeviceName || 'Remote Device',
        targetRoom: cleanRoom,
      });
    });
  });

  // Existing Device in room responds to join request (Accept or Decline)
  socket.on('respond_join_room', ({ requesterSocketId, accepted, targetRoom }) => {
    const hostDev = activeSockets.get(socket.id);
    console.log(`[Join Room Response] Host ${hostDev?.deviceName || socket.id} -> Requester ${requesterSocketId}: accepted=${accepted}`);

    io.to(requesterSocketId).emit('join_room_result', {
      accepted,
      targetRoom,
      approverName: hostDev?.deviceName || 'Device A',
      reason: accepted ? 'Accepted by Device A' : 'Declined by Device A',
    });
  });

  // Phone A requests access to Phone B's camera
  socket.on('request_camera_access', ({ targetSocketId }) => {
    const requester = activeSockets.get(socket.id);
    const target = activeSockets.get(targetSocketId);

    if (!requester || !target) {
      return socket.emit('error_message', { message: 'Target device not found or offline' });
    }

    console.log(`[Request Camera] ${requester.deviceName} -> ${target.deviceName}`);
    io.to(targetSocketId).emit('camera_access_prompt', {
      requesterSocketId: socket.id,
      requesterName: requester.deviceName,
      requesterDeviceId: requester.deviceId,
    });
  });

  // Phone B responds to camera access request (accept/deny)
  socket.on('respond_camera_access', ({ requesterSocketId, accepted, cameraFacing }) => {
    const target = activeSockets.get(socket.id);
    const requester = activeSockets.get(requesterSocketId);

    if (target && requester) {
      if (accepted) {
        target.isCameraActive = true;
        target.activeWith = requesterSocketId;
        target.activeRole = 'host';
        target.cameraFacing = cameraFacing || 'environment';

        requester.isCameraActive = true;
        requester.activeWith = socket.id;
        requester.activeRole = 'controller';

        // Save in persistent sessions
        persistentDeviceSessions.set(target.deviceId, target);
        persistentDeviceSessions.set(requester.deviceId, requester);

        broadcastDeviceList(target.accountId);
      }

      console.log(`[Response Camera] ${target.deviceName} -> ${requester.deviceName} accepted: ${accepted}`);
      io.to(requesterSocketId).emit('camera_access_result', {
        providerSocketId: socket.id,
        providerName: target.deviceName,
        accepted,
        cameraFacing: cameraFacing || 'environment',
      });
    }
  });

  // WebRTC Signaling: Offer, Answer, ICE Candidate
  socket.on('webrtc_offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtc_offer', {
      senderSocketId: socket.id,
      sdp,
    });
  });

  socket.on('webrtc_answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('webrtc_answer', {
      senderSocketId: socket.id,
      sdp,
    });
  });

  socket.on('webrtc_ice_candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc_ice_candidate', {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // Remote Camera Controls (Phone A -> Phone B)
  socket.on('remote_capture_trigger', ({ targetSocketId, settings }) => {
    console.log(`[Remote Capture Triggered] from ${socket.id} to ${targetSocketId}`);
    io.to(targetSocketId).emit('remote_capture_trigger', {
      requesterSocketId: socket.id,
      settings: settings || {},
    });
  });

  socket.on('remote_switch_camera', ({ targetSocketId, facingMode }) => {
    const dev = activeSockets.get(socket.id);
    if (dev) dev.cameraFacing = facingMode;
    io.to(targetSocketId).emit('remote_switch_camera', {
      facingMode,
    });
  });

  socket.on('remote_toggle_torch', ({ targetSocketId, enabled }) => {
    io.to(targetSocketId).emit('remote_toggle_torch', {
      enabled,
    });
  });

  socket.on('remote_zoom', ({ targetSocketId, zoomLevel }) => {
    io.to(targetSocketId).emit('remote_zoom', {
      zoomLevel,
    });
  });

  // Relay physical phone orientation & rotation angle (Portrait 0°, Landscape 90°/270°, etc.)
  socket.on('device_orientation_change', ({ targetSocketId, rotation, isPortrait }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('device_orientation_change', {
        rotation,
        isPortrait,
      });
    }
  });

  // Direct high-speed lossless photo relay via WebSocket binary Buffer
  socket.on('photo_direct_binary', ({ targetSocketId, photoId, metadata, buffer }) => {
    console.log(`[Photo Direct Binary Relay] Forwarding ${photoId} (${buffer ? buffer.byteLength || buffer.length : 0} bytes) to ${targetSocketId}`);
    if (targetSocketId) {
      io.to(targetSocketId).emit('photo_direct_binary', {
        photoId,
        metadata,
        buffer,
      });
    }
  });

  // End camera session (User explicitly clicks Disconnect / Stop Camera)
  socket.on('end_camera_session', ({ targetSocketId }) => {
    console.log(`[End Session Explicitly Requested] by ${socket.id}`);
    const current = activeSockets.get(socket.id);
    if (current) {
      current.isCameraActive = false;
      current.activeWith = null;
      current.activeRole = null;
      persistentDeviceSessions.delete(current.deviceId);
      broadcastDeviceList(current.accountId);
    }
    if (targetSocketId) {
      const target = activeSockets.get(targetSocketId);
      if (target) {
        target.isCameraActive = false;
        target.activeWith = null;
        target.activeRole = null;
        persistentDeviceSessions.delete(target.deviceId);
        broadcastDeviceList(target.accountId);
      }
      io.to(targetSocketId).emit('camera_session_ended', {
        reason: 'Session ended by peer',
      });
    }
  });

  // Lossless binary image chunk fallback (when WebRTC DataChannel is blocked)
  socket.on('image_chunk_relay', ({ targetSocketId, data }) => {
    io.to(targetSocketId).emit('image_chunk_relay', data);
  });

  // Backgrounding & Disconnect handling
  socket.on('disconnect', () => {
    const dev = activeSockets.get(socket.id);
    if (dev) {
      console.log(`[Device Socket Paused/Backgrounded] ${dev.deviceName} (${socket.id})`);
      dev.isBackgrounded = true;
      dev.lastSeen = Date.now();

      // Grace period: allow 5 minutes for device to un-background before purging
      setTimeout(() => {
        const currentDev = activeSockets.get(socket.id);
        if (currentDev && currentDev.isBackgrounded) {
          console.log(`[Session Grace Expired] Cleaning up ${dev.deviceName}`);
          activeSockets.delete(socket.id);
          broadcastDeviceList(dev.accountId);
        }
      }, 300000);
    }
  });
});

// Secondary listener on Port 5001 to automatically redirect any stale browser tab to Port 5000
function startPort5001Redirect() {
  try {
    const redirectApp = express();
    redirectApp.use((req, res) => {
      const hostname = req.hostname || 'localhost';
      const destination = `https://${hostname}:${PORT}${req.url}`;
      console.log(`[Redirect 5001->5000] Forwarding ${req.method} ${req.url} -> ${destination}`);
      res.redirect(301, destination);
    });

    const redirectServer = https.createServer(certs, redirectApp);
    redirectServer.listen(5001, '0.0.0.0', () => {
      console.log(`[Auto-Redirect] Port 5001 active: automatically forwarding requests to port ${PORT}`);
    });
    redirectServer.on('error', (err) => {
      // If 5001 is unavailable, that's fine; primary is on PORT (5000)
      console.log('[Auto-Redirect] Port 5001 redirect not bound:', err.code);
    });
  } catch (e) {
    console.warn('[Auto-Redirect] Failed to initialize port 5001 forwarder:', e.message);
  }
}

function startServer(portToTry) {
  server.listen(portToTry, '0.0.0.0', async () => {
    const localIps = getLocalIpAddresses();
    const primaryIp = localIps[0] || 'localhost';
    const url = `https://${primaryIp}:${portToTry}`;

    console.log('\n======================================================');
    console.log('   REMOTE CAMERA SYNC SERVER (ZERO QUALITY LOSS)      ');
    console.log('======================================================');
    console.log(`Server running securely via HTTPS on:`);
    console.log(`  Local:   https://localhost:${portToTry}`);
    localIps.forEach(ip => {
      console.log(`  Network: https://${ip}:${portToTry}`);
    });
    console.log('\nScan this QR code with Phone A and Phone B:');
    try {
      const terminalQr = await qrcode.toString(url, { type: 'terminal', small: true });
      console.log(terminalQr);
    } catch (err) {
      console.log(`Could not render terminal QR: ${err.message}`);
    }
    console.log(`Open ${url} on both devices!`);
    console.log('======================================================\n');

    // Also start port 5001 forwarder if primary is 5000
    if (Number(portToTry) === 5000) {
      startPort5001Redirect();
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] Port ${portToTry} is in use. Waiting 2 seconds to retry...`);
      try {
        server.close();
      } catch (e) {}
      setTimeout(() => {
        try {
          server.listen(portToTry, '0.0.0.0');
        } catch (e) {
          console.warn('[Server] Retry listen error:', e.message);
        }
      }, 2000);
    } else {
      console.error('[Server] Server error:', err);
    }
  });
}

startServer(PORT);
