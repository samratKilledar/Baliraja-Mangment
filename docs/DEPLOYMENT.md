# Deployment Guide

This project can run in both local development and production with this flow:

User Browser
  -> React App (Vercel)
  -> NodeJS API (Render)
  -> MongoDB Atlas

## 1. Local development

### Backend (`NodeAPI`)

Create a local env file from the example:

```bash
cd NodeAPI
cp .env.example .env
```

Recommended local values:

```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/ims
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1d
CORS_ORIGIN=http://localhost:5173
FCM_SERVER_KEY=
SUPER_ADMIN_EMAIL=superadmin@baliraja.com
SUPER_ADMIN_PASSWORD=123456
SUPER_ADMIN_PHONE=9999999999
SUPER_ADMIN_FORCE_RESET=false
BOOTSTRAP_KEY=
REVENUE_PASS=
```

Run the API:

```bash
cd NodeAPI
npm install
npm run dev
```

### Web (`UI/Web`)

Create a local env file from the example:

```bash
cd UI/Web
cp .env.example .env.local
```

Recommended local values:

```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_SUPER_EMAIL=superadmin@baliraja.com
VITE_SUPER_PASSWORD=123456
```

Run the web app:

```bash
cd UI/Web
npm install
npm run dev
```

Local flow:

Browser `http://localhost:5173`
  -> API `http://localhost:4000/api/v1`
  -> Local MongoDB or Atlas

## 2. MongoDB Atlas

Create a cluster in MongoDB Atlas and get the connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority
```

In Atlas Network Access, allow the IPs Render needs, or temporarily allow `0.0.0.0/0` while testing.

## 3. Deploy backend to Render

This repo already includes [render.yaml](/Users/sam-snehal/Desktop/Mangment/NodeAPI/render.yaml).

Create a Render Web Service from the repo and confirm:

- Root directory: `NodeAPI`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/health`

Set these Render environment variables:

- `MONGODB_URI` = your MongoDB Atlas URI
- `JWT_SECRET` = a long random secret
- `JWT_EXPIRES_IN` = `1d`
- `CORS_ORIGIN` = your Vercel frontend URL, for example `https://your-app.vercel.app`
- `SUPER_ADMIN_EMAIL` = your admin email
- `SUPER_ADMIN_PASSWORD` = strong password
- `SUPER_ADMIN_PHONE` = admin phone number

Optional Render environment variables:

- `FCM_SERVER_KEY`
- `BOOTSTRAP_KEY`
- `REVENUE_PASS`
- `SUPER_ADMIN_FORCE_RESET=false`

After deploy, your API should respond at:

```text
https://your-render-service.onrender.com/health
https://your-render-service.onrender.com/api/v1
```

## 4. Deploy frontend to Vercel

The Vite app lives in `UI/Web`, and [vercel.json](/Users/sam-snehal/Desktop/Mangment/UI/Web/vercel.json) is included so React Router routes work in the browser.

In Vercel:

- Framework preset: `Vite`
- Root directory: `UI/Web`
- Build command: `npm run build`
- Output directory: `dist`

Set these Vercel environment variables:

- `VITE_API_URL` = your Render API URL with `/api/v1`
  Example: `https://your-render-service.onrender.com/api/v1`
- `VITE_SUPER_EMAIL` = optional
- `VITE_SUPER_PASSWORD` = optional

## 5. Production flow

Production flow will be:

```text
User Browser
  -> React App (Vercel)
  -> NodeJS API (Render)
  -> MongoDB Atlas
```

Example:

```text
https://your-app.vercel.app
  -> https://your-api.onrender.com/api/v1
  -> mongodb+srv://...atlas...
```

## 6. Important checks

- Update `CORS_ORIGIN` on Render to the exact Vercel domain.
- Update `VITE_API_URL` on Vercel to the exact Render API URL ending in `/api/v1`.
- Use a strong `JWT_SECRET`.
- Use MongoDB Atlas for production, not local MongoDB.
- If you change domains later, update both `CORS_ORIGIN` and `VITE_API_URL`.
