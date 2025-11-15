const Document = require('../Models/Document');
const Appointment = require('../Models/Appointment');

/**
 * Middleware to check if user can access a document
 * Rules:
 * - Patient can access their own documents
 * - Doctor can access documents from patients they have appointments with
 * - Admin can access all documents
 */
async function canAccessDocument(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Admin has full access
    if (user.role === 'admin') {
      req.document = document;
      return next();
    }

    // Patient can access their own documents
    if (user.role === 'patient' && document.patientId.toString() === user.id) {
      req.document = document;
      return next();
    }

    // Doctor can access documents from their patients
    if (user.role === 'doctor') {
      const hasAppointment = await Appointment.findOne({
        doctorId: user.id,
        patientId: document.patientId,
      });

      if (hasAppointment) {
        req.document = document;
        return next();
      }
    }

    return res.status(403).json({ message: 'Access denied' });
  } catch (err) {
    console.error('[canAccessDocument] Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

/**
 * Middleware to check if user can delete a document
 * Rules:
 * - Only the patient who uploaded can delete
 * - Admin can delete any document
 */
async function canDeleteDocument(req, res, next) {
  try {
    const { id } = req.params;
    const user = req.user;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Admin can delete any document
    if (user.role === 'admin') {
      req.document = document;
      return next();
    }

    // Only the patient who uploaded can delete
    if (user.role === 'patient' && document.patientId.toString() === user.id) {
      req.document = document;
      return next();
    }

    return res.status(403).json({ message: 'Only the owner can delete this document' });
  } catch (err) {
    console.error('[canDeleteDocument] Error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  canAccessDocument,
  canDeleteDocument,
};
