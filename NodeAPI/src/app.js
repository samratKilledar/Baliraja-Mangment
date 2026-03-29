const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/users/user.routes');
const studentRoutes = require('./modules/students/student.routes');
const feeRoutes = require('./modules/fees/fee.routes');
const attendanceRoutes = require('./modules/attendance/attendance.routes');
const performanceRoutes = require('./modules/performance/performance.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const deviceTokenRoutes = require('./modules/notifications/deviceToken.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const reportRoutes = require('./modules/reports/report.routes');
const courseRoutes = require('./modules/courses/course.routes');
const noticeRoutes = require('./modules/notices/notice.routes');
const teacherRoutes = require('./modules/teachers/teacher.routes');
const workerRoutes = require('./modules/workers/worker.routes');
const complaintRoutes = require('./modules/complaints/complaint.routes');
const brandingRoutes = require('./modules/branding/branding.routes');
const subjectRoutes = require('./modules/subjects/subject.routes');
const admissionOptionsRoutes = require('./modules/admissionOptions/admissionOptions.routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
app.disable('etag');

function resolveCorsOrigin() {
  const configured = process.env.CORS_ORIGIN?.trim();
  if (configured === '*') return '*';

  const configuredOrigins = configured
    ? configured.split(',').map((origin) => origin.trim()).filter(Boolean)
    : ['https://baliraja-mangment.vercel.app'];

  const allowedOriginPatterns = [
    /^https:\/\/baliraja-mangment(?:-[a-z0-9-]+)?\.vercel\.app$/i,
    /^http:\/\/localhost(?::\d+)?$/i,
    /^http:\/\/127\.0\.0\.1(?::\d+)?$/i,
  ];

  return (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (allowedOriginPatterns.some((pattern) => pattern.test(origin))) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  };
}

const corsOptions = {
  origin: resolveCorsOrigin(),
  credentials: true,
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) =>
  res.json({
    status: 'ok',
    service: 'ims-api',
    health: '/health',
    apiBase: '/api/v1',
  })
);

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'ims-api' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/fees', feeRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/performance', performanceRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/device-tokens', deviceTokenRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/notices', noticeRoutes);
app.use('/api/v1/teachers', teacherRoutes);
app.use('/api/v1/workers', workerRoutes);
app.use('/api/v1/complaints', complaintRoutes);
app.use('/api/v1/branding', brandingRoutes);
app.use('/api/v1/subjects', subjectRoutes);
app.use('/api/v1/admission-options', admissionOptionsRoutes);

app.use(errorHandler);

module.exports = app;
