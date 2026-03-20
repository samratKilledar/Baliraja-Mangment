# Institute Management System (IMS)

## 1) System Architecture

- Clients:
  - React Native mobile app (`UI/App`) for Android/iOS.
  - React web app (`UI/Web`) for browser access.
- API Layer:
  - Node.js + Express REST API (`NodeAPI/src`) with JWT auth and RBAC middleware.
- Data Layer:
  - MongoDB via Mongoose models (option to replace with Firestore adapter in `firebaseService.js`).
- Shared pattern:
  - Both mobile and web call the same `/api/v1/*` endpoints.

### High-level flow
1. User logs in from mobile/web.
2. API validates credentials and returns JWT + role.
3. Client stores token and renders role-specific navigation.
4. API enforces authorization with `authenticate + authorize(role...)`.

## 2) Database Schema (MongoDB)

Collections:
- `users`: auth identity, role, active status.
- `students`: enrollment profile, batch/course links.
- `parents`: parent profile and linked students.
- `teachers`: specialization and assigned batches.
- `courses`: program catalog (military/police/etc).
- `batches`: schedule, teacher, capacity.
- `admissions`: admission records.
- `fees`: billing ledger + transactions.
- `attendance`: date-wise attendance with optional GPS.
- `performance`: marks, fitness metrics, remarks.
- `notifications`: role/user targeted notices.

Key relations:
- `users (1) -> (0..1) students/teachers/parents`
- `students (n) -> (n) courses` via `currentCourseIds`
- `students (n) -> (1) batch`
- `fees/attendance/performance (n) -> (1) student`

## 3) API Endpoints

Auth:
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

User:
- `GET /api/v1/users/me`

Students:
- `GET /api/v1/students?q=&batchId=&status=`
- `POST /api/v1/students`

Fees:
- `POST /api/v1/fees`
- `POST /api/v1/fees/:feeId/payments`
- `GET /api/v1/fees/summary`

Attendance:
- `POST /api/v1/attendance`
- `GET /api/v1/attendance/student/:studentId`

Performance:
- `POST /api/v1/performance`
- `GET /api/v1/performance/student/:studentId`

Notifications:
- `POST /api/v1/notifications`
- `GET /api/v1/notifications/my`

Dashboard/Reports:
- `GET /api/v1/dashboard/super-admin`
- `GET /api/v1/reports/fees?from=&to=`
- `GET /api/v1/reports/performance`

OpenAPI starter spec: `NodeAPI/src/docs/openapi.yaml`.

## 4) React Native Folder Structure

- `UI/App/src/api`: API client
- `UI/App/src/context`: auth state
- `UI/App/src/navigation`: role-based navigator
- `UI/App/src/screens/common`: login/common
- `UI/App/src/screens/superAdmin|admin|teacher|student|parent`: role dashboards
- `UI/App/src/components`: reusable UI
- `UI/App/src/theme`: styles/tokens

## 5) React Web Folder Structure

- `UI/Web/src/api`: axios client
- `UI/Web/src/context`: auth provider
- `UI/Web/src/routes`: role route gate
- `UI/Web/src/pages/common`: login
- `UI/Web/src/pages/superAdmin|admin|teacher|student|parent`: role pages
- `UI/Web/src/components`, `layout`, `theme`

## 6) Backend Folder Structure

- `NodeAPI/src/config`: DB config
- `NodeAPI/src/middleware`: auth/error middleware
- `NodeAPI/src/modules/*`: feature-based modular architecture
- `NodeAPI/src/docs`: OpenAPI
- `NodeAPI/src/utils`: shared constants/helpers
- `NodeAPI/src/server.js`: bootstrap

## 7) Sample UI Screens

Implemented starter screens:
- Mobile:
  - Login: `UI/App/src/screens/common/LoginScreen.tsx`
  - Register: `UI/App/src/screens/RegisterScreen.tsx`
  - Role homes: `.../superAdmin/Admin/Teacher/Student/Parent`
- Web:
  - Login: `UI/Web/src/pages/common/LoginPage.jsx`
  - Role dashboards: `UI/Web/src/pages/*/`

## 8) Sample API Code

Implemented modules with controllers/routes:
- Auth: register/login with bcrypt + JWT
- Students: create/list with filters
- Fees: record payments + summary aggregation
- Attendance: mark and fetch per student
- Performance: add and fetch per student
- Notifications + Reports + Super admin dashboard

## 9) Authentication Flow

1. User submits email/password.
2. API checks credentials and returns JWT.
3. Client stores token (`localStorage` on web, context on mobile starter).
4. Each request sends `Authorization: Bearer <token>`.
5. Backend middleware:
   - `authenticate`: verifies JWT.
   - `authorize`: enforces role permissions.

## 10) Deployment Suggestions

Backend:
- Use Render config in `NodeAPI/render.yaml` or deploy to Railway/Fly.
- Add managed MongoDB (Atlas).
- Store secrets in environment variables.

Web:
- Deploy Vite build to Vercel/Netlify.
- Set `VITE_API_URL` to backend URL.

Mobile:
- Use Expo EAS build for Android/iOS.
- Environment-specific API base URL for dev/staging/prod.

Scaling roadmap:
- Online payments: Razorpay/Stripe payment intents + webhook reconciliation.
- SMS: Twilio/Textlocal integration through notification worker.
- Push notifications: FCM/APNs and topic-based role targeting.
- Online schedule: calendar APIs + reminders.
- GPS attendance: geofence validation in attendance endpoint.
