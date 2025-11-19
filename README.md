# ArogyaNet Backend

A comprehensive healthcare management system backend built with Node.js, Express, MongoDB, and Socket.IO. This backend powers the ArogyaNet platform, providing secure APIs for patient-doctor interactions, appointments, medical records, prescriptions, and real-time video consultations.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (Patient, Doctor, Admin)
- **User Management**: Complete user profile management with secure password hashing
- **Appointment System**: Schedule, manage, and track medical appointments
- **Video Consultations**: WebRTC-enabled video calling with signaling server
- **Document Management**: Secure medical document upload/download with AWS S3 integration
- **Prescription Management**: Digital prescription creation and management
- **Health Assessments**: ML-powered liver disease risk assessment integration
- **Real-time Communication**: Socket.IO for instant notifications and live status updates
- **Email Notifications**: Automated email system using Nodemailer
- **Security Features**: Helmet.js, CORS, rate limiting, and secure token management

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- AWS Account (for S3 document storage)
- SMTP Server (for email notifications)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   cd ArogyNet-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   # Server Configuration
   PORT=8090
   NODE_ENV=development

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/arogyanet

   # JWT Secrets
   JWT_ACCESS_SECRET=your_access_token_secret_key_here
   JWT_REFRESH_SECRET=your_refresh_token_secret_key_here
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d

   # AWS S3 Configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_aws_access_key
   AWS_SECRET_ACCESS_KEY=your_aws_secret_key
   S3_BUCKET_NAME=your-bucket-name

   # Email Configuration (Nodemailer)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-specific-password

   # Frontend URL (for CORS and email links)
   FRONTEND_URL=http://localhost:5173

   # ML Service URL (for liver assessment)
   ML_SERVICE_URL=http://localhost:5000
   ```

4. **Database Setup**
   
   Run the setup scripts to initialize collections and create an admin user:
   ```bash
   # Setup MongoDB collections
   node scripts/setupCollections.js

   # Create admin user (optional)
   node scripts/createAdmin.js
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```
This runs the server with nodemon for auto-reloading on file changes.

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:8090` (or your configured PORT).

## 📁 Project Structure

```
ArogyNet-Backend/
├── Controllers/           # Business logic for routes
│   ├── authController.js
│   ├── userController.js
│   ├── appointmentController.js
│   ├── prescriptionController.js
│   ├── documentController.js
│   └── videoController.js
├── Middlewares/           # Express middlewares
│   ├── auth.js           # JWT authentication
│   ├── role.js           # Role-based authorization
│   ├── rateLimiter.js    # Rate limiting
│   ├── requestId.js      # Request ID tracking
│   └── documentPermission.js
├── Models/                # Mongoose schemas
│   ├── User.js
│   ├── Appointment.js
│   ├── Prescription.js
│   ├── Document.js
│   ├── LiverAssessment.js
│   ├── RefreshToken.js
│   └── db.js             # Database connection
├── Routes/                # API route definitions
│   ├── auth.js
│   ├── users.js
│   ├── appointments.js
│   ├── prescriptions.js
│   ├── documents.js
│   ├── assessments.js
│   └── video.js
├── Utils/                 # Utility functions
│   ├── token.js          # JWT token generation
│   ├── hash.js           # Password hashing
│   ├── mailer.js         # Email service
│   ├── logger.js         # Logging utility
│   ├── s3.js             # AWS S3 operations
│   └── webrtcConfig.js   # WebRTC configuration
├── scripts/               # Setup and maintenance scripts
│   ├── setupCollections.js
│   └── createAdmin.js
├── uploads/               # Local file storage (deprecated, use S3)
├── index.js               # Main application entry point
└── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/doctors` - List all doctors
- `GET /api/users/:id` - Get user by ID (admin/authorized)

### Appointments
- `GET /api/appointments` - Get user appointments
- `POST /api/appointments` - Create new appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment
- `PUT /api/appointments/:id/status` - Update appointment status (doctor)

### Prescriptions
- `GET /api/prescriptions` - Get prescriptions
- `POST /api/prescriptions` - Create prescription (doctor)
- `GET /api/prescriptions/:id` - Get prescription details
- `PUT /api/prescriptions/:id` - Update prescription (doctor)

### Documents
- `GET /api/documents` - List user documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/:id` - Get document details
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document
- `PUT /api/documents/:id/share` - Share document with doctor

### Health Assessments
- `POST /api/assessments/liver` - Submit liver disease assessment
- `GET /api/assessments/liver/:id` - Get assessment results
- `GET /api/assessments/liver` - List user assessments

### Video Calls
- `POST /api/video/initiate` - Initiate video call
- `POST /api/video/end` - End video call
- `GET /api/video/ice-servers` - Get TURN/STUN server config

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication:
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens

Include the access token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

## 🔌 WebSocket Events (Socket.IO)

### Client → Server
- `identify` - Register user's socket connection with userId
- `call-offer` - Send WebRTC offer to initiate call
- `call-answer` - Send WebRTC answer to accept call
- `ice-candidate` - Exchange ICE candidates for connection
- `end-call` - Terminate active call
- `join-room` - Join a specific room
- `leave-room` - Leave a room

### Server → Client
- `online-status` - User online/offline status updates
- `incoming-call` - Notification of incoming video call
- `call-accepted` - Call was accepted by recipient
- `call-rejected` - Call was rejected by recipient
- `call-ended` - Call has ended
- `ice-candidate` - ICE candidate from peer
- `appointment-update` - Appointment status changed
- `new-prescription` - New prescription created
- `document-shared` - Document shared with user

## 🔒 Security Features

- **Helmet.js**: HTTP headers security
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Prevent brute force attacks
- **JWT**: Secure token-based authentication
- **bcrypt**: Password hashing with salt
- **Input Validation**: Joi schema validation
- **Role-Based Access Control**: Granular permission system
- **Request ID Tracking**: Correlate logs and debug issues
- **AWS S3**: Secure file storage with presigned URLs

## 📧 Email Notifications

The system sends automated emails for:
- Welcome emails on registration
- Password reset links
- Appointment confirmations
- Appointment reminders
- Prescription notifications

## 🧪 Testing

The API can be tested using:
- Postman/Insomnia
- cURL commands
- Automated testing frameworks

Example test endpoint:
```bash
curl http://localhost:8090/ping
# Response: pong
```

## 🐛 Debugging

Logs are output to the console with structured metadata including:
- Request ID
- User ID
- Timestamp
- HTTP method and path
- Response status
- Duration

## 📊 Database Schema

### User
- Authentication credentials
- Personal information
- Role (patient/doctor/admin)
- Profile details

### Appointment
- Patient and doctor references
- Date and time
- Status (pending/confirmed/completed/cancelled)
- Notes

### Prescription
- Patient reference
- Doctor reference
- Medications array
- Instructions
- Valid until date

### Document
- Owner reference
- File metadata
- S3 storage information
- Sharing permissions

### LiverAssessment
- User reference
- Input parameters
- ML model prediction
- Risk score
- Recommendations

## 🚀 Deployment

### Production Checklist
1. Set `NODE_ENV=production`
2. Use strong JWT secrets
3. Configure MongoDB with authentication
4. Set up AWS S3 bucket with proper permissions
5. Configure SMTP for production emails
6. Enable HTTPS
7. Set up process manager (PM2)
8. Configure reverse proxy (Nginx)
9. Enable monitoring and logging
10. Set up automated backups

### PM2 Example
```bash
pm2 start index.js --name arogyanet-backend
pm2 save
pm2 startup
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

ISC

## 👥 Authors

ArogyaNet Development Team

## 📞 Support

For issues and questions, please open an issue in the repository or contact the development team.

---

**Note**: This is a healthcare application handling sensitive patient data. Ensure compliance with HIPAA, GDPR, or relevant healthcare data protection regulations in your jurisdiction.
