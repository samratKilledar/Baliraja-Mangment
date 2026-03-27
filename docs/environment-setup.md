**Environment Setup**

Use separate env files for local and production-style runs.

**API**

Files supported by the API now:
- `NodeAPI/.env`
- `NodeAPI/.env.local`
- `NodeAPI/.env.development`
- `NodeAPI/.env.development.local`
- `NodeAPI/.env.production`
- `NodeAPI/.env.production.local`

Load order:
1. `.env`
2. `.env.{NODE_ENV}`
3. `.env.local`
4. `.env.{NODE_ENV}.local`

System env vars already set by Render still win over file values.

Recommended local API file:

```env
# NodeAPI/.env.development.local
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ims
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
```

Local terminal commands:

```bash
cd NodeAPI
npm start
```

```bash
cd NodeAPI
npm run dev
```

Both local commands will read `NodeAPI/.env.development.local` by default.

If you want to run the API locally but connect to production DB for testing:

```env
# NodeAPI/.env.production.local
PORT=4000
MONGODB_URI=<your-render-production-mongodb-uri>
JWT_SECRET=<your-production-jwt-secret>
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173,https://baliraja-mangment.vercel.app
```

Run commands:

```bash
cd NodeAPI
npm run start:local
```

```bash
cd NodeAPI
NODE_ENV=production npm start
```

**Web**

Vite already supports:
- `UI/Web/.env`
- `UI/Web/.env.local`
- `UI/Web/.env.development.local`
- `UI/Web/.env.production.local`

Recommended local web file:

```env
# UI/Web/.env.development.local
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPER_EMAIL=superadmin@baliraja.com
VITE_SUPER_PASSWORD=123456
```

Committed production web file:

```env
# UI/Web/.env.production
VITE_API_URL=https://baliraja-mangment.onrender.com/api/v1
```

This means:
- local `npm start` / `npm run dev` in `UI/Web` points to local API
- production `npm run build` uses the Render API URL automatically

If you want the web app to hit the Render API even while running locally:

```env
# UI/Web/.env.production.local
VITE_API_URL=https://baliraja-mangment.onrender.com/api/v1
```

Run commands:

```bash
cd UI/Web
npm start
```

```bash
cd UI/Web
npm run dev
```

To test a production build locally:

```bash
cd UI/Web
npm run build
npm run preview
```
