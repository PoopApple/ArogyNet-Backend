// WebRTC Signaling and Video Call Management
const Joi = require('joi');
const Appointment = require('../Models/Appointment');
const User = require('../Models/User');
const { getICEServers } = require('../Utils/webrtcConfig');

// Store active video sessions
const activeSessions = new Map();

/**
 * HTTP fallback for signaling if client cannot use sockets directly
 */
const signal = async (req, res) => {
  const schema = Joi.object({ 
    toUserId: Joi.string().required(), 
    payload: Joi.object().required() 
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ message: error.message });

  try {
    // try to emit over sockets if io available
    const io = req.app.get('io');
    if (io) {
      io.emit('signal', { toUserId: value.toUserId, payload: value.payload });
      return res.json({ ok: true });
    }

    // otherwise return 501 as real-time channel missing
    return res.status(501).json({ message: 'Real-time signaling not available' });
  } catch (err) {
    console.error('Signal error:', err);
    return res.status(500).json({ message: 'Signaling failed' });
  }
};

/**
 * Get ICE server configuration for WebRTC
 */
const getICEConfiguration = async (req, res) => {
  try {
    const iceServers = getICEServers();
    res.json({
      iceServers,
      configuration: {
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
      },
    });
  } catch (err) {
    console.error('Get ICE configuration error:', err);
    res.status(500).json({ message: 'Failed to get ICE configuration' });
  }
};

/**
 * Initiate a video call between two users
 */
const initiateVideoCall = async (req, res) => {
  try {
    const schema = Joi.object({
      toUserId: Joi.string().required(),
      appointmentId: Joi.string(),
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const fromUserId = req.user._id;
    const { toUserId, appointmentId } = value;

    // Verify appointment if provided
    if (appointmentId) {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: 'Appointment not found' });
      }
    }

    // Create session
    const sessionId = `${fromUserId}-${toUserId}-${Date.now()}`;
    activeSessions.set(sessionId, {
      fromUserId,
      toUserId,
      appointmentId,
      startTime: new Date(),
      status: 'initiated',
    });

    // Emit call via socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('incomingVideoCall', {
        fromUserId,
        sessionId,
        appointmentId,
      });
    }

    res.json({
      ok: true,
      sessionId,
      iceServers: getICEServers(),
    });
  } catch (err) {
    console.error('Initiate video call error:', err);
    res.status(500).json({ message: 'Failed to initiate video call' });
  }
};

/**
 * Accept an incoming video call
 */
const acceptVideoCall = async (req, res) => {
  try {
    const schema = Joi.object({
      sessionId: Joi.string().required(),
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { sessionId } = value;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'active';
    session.acceptedTime = new Date();

    res.json({
      ok: true,
      sessionId,
      iceServers: getICEServers(),
    });
  } catch (err) {
    console.error('Accept video call error:', err);
    res.status(500).json({ message: 'Failed to accept video call' });
  }
};

/**
 * End a video call and save recording metadata
 */
const endVideoCall = async (req, res) => {
  try {
    const schema = Joi.object({
      sessionId: Joi.string().required(),
      duration: Joi.number(), // in seconds
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { sessionId, duration } = value;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'ended';
    session.endTime = new Date();
    session.duration = duration;

    // Update appointment with video call metadata if exists
    if (session.appointmentId) {
      await Appointment.findByIdAndUpdate(
        session.appointmentId,
        {
          videoCallStatus: 'completed',
          videoCallDuration: duration,
          videoCallEndedAt: new Date(),
        }
      );
    }

    // Keep session data for a short time then clean up
    setTimeout(() => {
      activeSessions.delete(sessionId);
    }, 5 * 60 * 1000); // 5 minutes

    res.json({
      ok: true,
      sessionId,
      duration,
    });
  } catch (err) {
    console.error('End video call error:', err);
    res.status(500).json({ message: 'Failed to end video call' });
  }
};

/**
 * Reject an incoming video call
 */
const rejectVideoCall = async (req, res) => {
  try {
    const schema = Joi.object({
      sessionId: Joi.string().required(),
    });
    
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const { sessionId } = value;
    const session = activeSessions.get(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    session.status = 'rejected';
    activeSessions.delete(sessionId);

    res.json({
      ok: true,
      sessionId,
    });
  } catch (err) {
    console.error('Reject video call error:', err);
    res.status(500).json({ message: 'Failed to reject video call' });
  }
};

module.exports = { 
  signal,
  getICEConfiguration,
  initiateVideoCall,
  acceptVideoCall,
  endVideoCall,
  rejectVideoCall,
};
