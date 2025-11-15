require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const rateLimiter = require('./Middlewares/rateLimiter');

// initialize DB (Models/db.js connects using MONGODB_URI)
require('./Models/db');

const authRoutes = require('./Routes/auth');
const userRoutes = require('./Routes/users');
const appointmentRoutes = require('./Routes/appointments');
const prescriptionRoutes = require('./Routes/prescriptions');
const documentRoutes = require('./Routes/documents');
const videoRoutes = require('./Routes/video');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  allowEIO3: true
});

const PORT = process.env.PORT || 8090;

// Basic security and parsing
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(rateLimiter);

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/ping', (req, res) => res.send('pong'));
app.get('/', (req, res) => res.send('API is running'));

// --- SOCKET.IO ---
// Simple in-memory map. For production use Redis if you scale to multiple nodes.
const onlineUsers = new Map(); // userId => socketId

io.on('connection', (socket) => {
    // expect the client to emit `identify` with their userId after connecting
    socket.on('identify', (userId) => {
        if (!userId) return;
        console.log('👤 User identified:', userId, 'Socket ID:', socket.id);
        onlineUsers.set(userId.toString(), socket.id);
        console.log('📊 onlineUsers now:', Array.from(onlineUsers.entries()));
        io.emit('presence', { userId, online: true });
    });

    socket.on('signal', ({ toUserId, payload }) => {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) io.to(targetSocket).emit('signal', payload);
    });

    socket.on('notify', ({ toUserId, notification }) => {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) io.to(targetSocket).emit('notification', notification);
    });

    // --- WebRTC Signaling Handlers ---
    socket.on('sendOffer', ({ remoteUserId, offer }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('incomingOffer', { offer });
        }
    });

    socket.on('sendAnswer', ({ remoteUserId, answer }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('incomingAnswer', { answer });
        }
    });

    socket.on('sendIceCandidate', ({ remoteUserId, candidate }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('incomingIceCandidate', { candidate });
        }
    });

    socket.on('rejectCall', ({ remoteUserId }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('callRejected');
        }
    });

    socket.on('callEnded', ({ remoteUserId }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('callEnded');
        }
    });

    socket.on('incomingVideoCall', ({ remoteUserId, callerName, appointmentId }) => {
        console.log('📞 incomingVideoCall - remoteUserId:', remoteUserId);
        console.log('📞 onlineUsers map:', Array.from(onlineUsers.entries()));
        const targetSocket = onlineUsers.get(String(remoteUserId));
        console.log('📞 targetSocket:', targetSocket);
        if (targetSocket) {
            console.log('✅ Emitting incomingVideoCall to socket:', targetSocket);
            io.to(targetSocket).emit('incomingVideoCall', {
                callerName,
                appointmentId,
                callerId: socket.id
            });
        } else {
            console.log('❌ Patient not found in onlineUsers');
        }
    });

    socket.on('callAccepted', ({ remoteUserId, appointmentId }) => {
        console.log('📞 callAccepted - remoteUserId:', remoteUserId, 'appointmentId:', appointmentId);
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            console.log('✅ Emitting callAccepted to doctor socket:', targetSocket);
            io.to(targetSocket).emit('callAccepted', {
                appointmentId,
                patientId: socket.id
            });
        }
    });

    socket.on('disconnect', () => {
        for (const [userId, sId] of onlineUsers) {
            if (sId === socket.id) {
                onlineUsers.delete(userId);
                io.emit('presence', { userId, online: false });
                break;
            }
        }
    });
});

// Attach io to app for controllers that want to emit events
app.set('io', io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));