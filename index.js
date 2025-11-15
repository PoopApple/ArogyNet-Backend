require('dotenv').config();
const express = require('express');
const path = require('path');
const http = require('http');
const https = require('https');
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


const PORT = process.env.PORT || 8090;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : '*';

// Basic security and parsing
app.use(helmet());
app.use(cors({ 
  origin: ALLOWED_ORIGINS, 
  credentials: true 
}));
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
const socketToUser = new Map(); // socketId => userId

// Debug endpoint to check online users
app.get('/debug/online-users', (req, res) => {
    const users = Array.from(onlineUsers.entries()).map(([userId, socketId]) => ({
        userId,
        socketId,
        isOnline: true
    }));
    res.json({ onlineUsers: users, count: users.length });
});



const server = https.createServer(app);

const io = new Server(server, { 
  cors: { 
    origin: ALLOWED_ORIGINS, 
    credentials: true 
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
  allowEIO3: true
});

io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    
    // expect the client to emit `identify` with their userId after connecting
    socket.on('identify', (userId) => {
        if (!userId) {
            console.log('⚠️ Identify called without userId');
            return;
        }
        console.log('👤 User identified:', userId, 'Socket ID:', socket.id);
        onlineUsers.set(userId.toString(), socket.id);
        socketToUser.set(socket.id, userId.toString());
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
    socket.on('sendOffer', ({ remoteUserId, offer, appointmentId }) => {
        console.log('📤 sendOffer received - remoteUserId:', remoteUserId, 'appointmentId:', appointmentId);
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            console.log('✅ Forwarding offer to socket:', targetSocket);
            io.to(targetSocket).emit('incomingOffer', { offer, appointmentId });
        } else {
            console.log('❌ Target user not found for offer:', remoteUserId);
        }
    });

    socket.on('sendAnswer', ({ remoteUserId, answer, appointmentId }) => {
        console.log('📤 sendAnswer received - remoteUserId:', remoteUserId, 'appointmentId:', appointmentId);
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            console.log('✅ Forwarding answer to socket:', targetSocket);
            io.to(targetSocket).emit('incomingAnswer', { answer, appointmentId });
        } else {
            console.log('❌ Target user not found for answer:', remoteUserId);
        }
    });

    socket.on('sendIceCandidate', ({ remoteUserId, candidate, appointmentId }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('incomingIceCandidate', { candidate, appointmentId });
        }
    });

    socket.on('rejectCall', ({ remoteUserId, appointmentId }) => {
        console.log('📞 rejectCall - remoteUserId:', remoteUserId);
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('callRejected', { appointmentId });
        }
    });

    socket.on('callEnded', ({ remoteUserId, appointmentId, duration }) => {
        console.log('📞 callEnded - remoteUserId:', remoteUserId);
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('callEnded', { appointmentId, duration });
        }
    });

    socket.on('requestOffer', ({ remoteUserId, appointmentId }) => {
        const targetSocket = onlineUsers.get(String(remoteUserId));
        if (targetSocket) {
            io.to(targetSocket).emit('requestOffer', { appointmentId });
        }
    });

    // WebRTC signaling - Room-based approach
    socket.on('room:join', ({ userId, appointmentId }) => {
        console.log('📞 room:join - userId:', userId, 'appointmentId:', appointmentId);
        onlineUsers.set(userId.toString(), socket.id);
        socketToUser.set(socket.id, userId.toString());
        
        // Notify others in the room that a user joined
        socket.to(appointmentId).emit('user:joined', { userId, id: socket.id });
        
        // Join the appointment room
        socket.join(appointmentId);
        
        // Confirm to the user they joined
        io.to(socket.id).emit('room:join', { userId, appointmentId });
        console.log('✅ User joined room successfully');
    });

    // User initiates WebRTC call with offer
    socket.on('user:call', ({ to, offer }) => {
        console.log('📞 user:call - to:', to);
        io.to(to).emit('incomming:call', { from: socket.id, offer });
    });

    // Call accepted with answer
    socket.on('call:accepted', ({ to, ans }) => {
        console.log('✅ call:accepted - to:', to);
        io.to(to).emit('call:accepted', { from: socket.id, ans });
    });

    // Peer renegotiation needed
    socket.on('peer:nego:needed', ({ to, offer }) => {
        console.log('🔄 peer:nego:needed - to:', to);
        io.to(to).emit('peer:nego:needed', { from: socket.id, offer });
    });

    // Peer renegotiation done
    socket.on('peer:nego:done', ({ to, ans }) => {
        console.log('✅ peer:nego:done - to:', to);
        io.to(to).emit('peer:nego:final', { from: socket.id, ans });
    });

    socket.on('incomingVideoCall', ({ remoteUserId, callerName, appointmentId }) => {
        const callerUserId = socketToUser.get(socket.id);
        console.log('📞 incomingVideoCall received from socket:', socket.id);
        console.log('📞 callerUserId:', callerUserId);
        console.log('📞 remoteUserId (patient):', remoteUserId);
        console.log('📞 callerName:', callerName);
        console.log('📞 appointmentId:', appointmentId);
        console.log('📞 onlineUsers map:', Array.from(onlineUsers.entries()));
        
        if (!remoteUserId) {
            console.error('❌ remoteUserId is missing in incomingVideoCall');
            return;
        }
        
        const targetSocket = onlineUsers.get(String(remoteUserId));
        console.log('📞 targetSocket for patient:', targetSocket);
        
        if (targetSocket) {
            console.log('✅ Emitting incomingVideoCall to patient socket:', targetSocket);
            io.to(targetSocket).emit('incomingVideoCall', {
                callerName,
                appointmentId,
                callerId: callerUserId || socket.id
            });
            console.log('✅ Notification sent successfully');
        } else {
            console.log('❌ Patient not found in onlineUsers. Patient ID:', remoteUserId);
            console.log('📊 Current online users:', Array.from(onlineUsers.keys()));
            // Emit error back to caller
            socket.emit('callError', { 
                message: 'Patient is not online or not connected',
                patientId: remoteUserId 
            });
        }
    });

    socket.on('callAccepted', ({ remoteUserId, appointmentId }) => {
        const patientUserId = socketToUser.get(socket.id);
        console.log('📞 callAccepted received from patient socket:', socket.id);
        console.log('📞 patientUserId:', patientUserId);
        console.log('📞 remoteUserId (doctor):', remoteUserId);
        console.log('📞 appointmentId:', appointmentId);
        console.log('📞 onlineUsers map:', Array.from(onlineUsers.entries()));
        
        if (!remoteUserId) {
            console.error('❌ remoteUserId is missing in callAccepted');
            return;
        }
        
        const targetSocket = onlineUsers.get(String(remoteUserId));
        console.log('📞 targetSocket for doctor:', targetSocket);
        
        if (targetSocket) {
            console.log('✅ Emitting callAccepted to doctor socket:', targetSocket);
            io.to(targetSocket).emit('callAccepted', {
                appointmentId,
                patientId: patientUserId || socket.id
            });
            console.log('✅ callAccepted notification sent to doctor');
        } else {
            console.log('❌ Doctor not found in onlineUsers. Doctor ID:', remoteUserId);
            console.log('📊 Current online users:', Array.from(onlineUsers.keys()));
            // Emit error back to patient
            socket.emit('callError', { 
                message: 'Doctor is not online or not connected',
                doctorId: remoteUserId 
            });
        }
    });

    socket.on('disconnect', () => {
        const userId = socketToUser.get(socket.id);
        if (userId) {
            onlineUsers.delete(userId);
            socketToUser.delete(socket.id);
            io.emit('presence', { userId, online: false });
            console.log('👋 User disconnected:', userId, 'Socket ID:', socket.id);
        } else {
            console.log('👋 Socket disconnected (not identified):', socket.id);
        }
    });
});

// Attach io to app for controllers that want to emit events
app.set('io', io);

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));