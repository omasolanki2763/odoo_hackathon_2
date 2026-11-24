# ReWear Deployment Guide

Step-by-step instructions for deploying ReWear to production on a 0 INR budget using free-tier cloud infrastructure:
- **Frontend**: Cloudflare Pages (Static SPA)
- **Backend**: Render (Node.js Web Service)
- **Database**: MongoDB Atlas (M0 Free Tier)
- **Image Storage**: Cloudinary (Free Tier)

---

## Architecture & URL Routing

```
[ Browser / Client ]
       │
       ├─► Cloudflare Pages (Frontend SPA)
       │     └─► rewear.pages.dev (or custom domain)
       │     └─► Routes handled by React Router via /* -> /index.html (200)
       │
       └─► Render Web Service (Backend REST API)
             └─► rewear-backend.onrender.com/api/...
             └─► Connected to MongoDB Atlas & Cloudinary
```

---

## 1. MongoDB Atlas Setup (Database)

1. **Sign Up / Log In**: Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. **Create a Free Cluster**:
   - Choose **M0 Free** (Shared).
   - Provider: **AWS** (select region closest to users, e.g., `ap-south-1` Mumbai or `eu-central-1` Frankfurt).
   - Cluster Name: `rewear-cluster`.
3. **Configure Database Access**:
   - Navigate to **Security** > **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set a strong username (e.g., `rewear_admin`) and password.
   - Database User Privileges: **Read and write to any database**.
4. **Configure Network Access**:
   - Navigate to **Security** > **Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access From Anywhere** (`0.0.0.0/0`).
   - Click **Confirm**.
5. **Obtain Connection String**:
   - Go to **Database** > **Connect** > **Drivers** (Node.js).
   - Copy the connection URI:
     ```
     mongodb+srv://<username>:<password>@rewear-cluster.xxxxx.mongodb.net/rewear?retryWrites=true&w=majority
     ```
   - Replace `<username>` and `<password>` with your credentials.

---

## 2. Cloudinary Setup (Image Storage)

1. **Sign Up / Log In**: Go to [cloudinary.com](https://cloudinary.com) and create a free account.
2. **Retrieve API Credentials**:
   - Open the **Dashboard**.
   - Copy the three values:
     - **Cloud Name** (`CLOUDINARY_CLOUD_NAME`)
     - **API Key** (`CLOUDINARY_API_KEY`)
     - **API Secret** (`CLOUDINARY_API_SECRET`)

---

## 3. Render Setup (Backend Web Service)

### Option A: Automatic Setup using Render Blueprint (Recommended)
1. Log in to [render.com](https://render.com).
2. Click **New +** > **Blueprint**.
3. Connect your GitHub repository (`odoo_hackathon_2`).
4. Render detects `render.yaml` automatically.
5. In the configuration screen, provide the secret environment variables marked `sync: false`:
   - `MONGODB_URI`: Your MongoDB Atlas URI.
   - `JWT_SECRET`: A secure random 32+ character string.
   - `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name.
   - `CLOUDINARY_API_KEY`: Your Cloudinary API key.
   - `CLOUDINARY_API_SECRET`: Your Cloudinary API secret.
   - `FRONTEND_URL`: Temporary placeholder (e.g., `http://localhost:5173` or your future Cloudflare Pages domain).
6. Click **Apply**.

### Option B: Manual Web Service Setup
1. Log in to [render.com](https://render.com).
2. Click **New +** > **Web Service**.
3. Select your GitHub repository.
4. Fill in service settings:
   - **Name**: `rewear-backend`
   - **Region**: Closest to database (e.g., Frankfurt or Singapore)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. **Advanced Settings**:
   - **Health Check Path**: `/api/health`
6. **Environment Variables**:
   | Variable | Value | Description |
   |---|---|---|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `10000` | Port assigned by Render |
   | `MONGODB_URI` | `mongodb+srv://...` | Atlas connection string |
   | `JWT_SECRET` | `<secret>` | Strong secret for auth tokens |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry duration |
   | `CLOUDINARY_CLOUD_NAME` | `<name>` | Cloudinary account name |
   | `CLOUDINARY_API_KEY` | `<key>` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | `<secret>` | Cloudinary API secret |
   | `FRONTEND_URL` | `https://rewear.pages.dev` | Cloudflare Pages origin for CORS |
7. Click **Create Web Service**.
8. Once built, copy your backend URL (e.g., `https://rewear-backend.onrender.com`).

---

## 4. Cloudflare Pages Setup (Frontend Application)

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Authorize GitHub and select repository (`odoo_hackathon_2`).
4. Configure Build & Deployment:
   - **Project Name**: `rewear`
   - **Production Branch**: `main`
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
5. **Environment Variables**:
   - Add variable:
     - `VITE_API_URL` = `https://rewear-backend.onrender.com` (your Render backend URL)
6. Click **Save and Deploy**.
7. Once deployed, note your public domain (e.g., `https://rewear.pages.dev`).

---

## 5. Connecting Frontend & Backend (Final CORS Step)

1. Return to the Render dashboard for `rewear-backend`.
2. Go to **Environment** tab.
3. Update `FRONTEND_URL` to match your Cloudflare Pages URL:
   ```
   FRONTEND_URL=https://rewear.pages.dev
   ```
   *(Multiple URLs can be separated by commas, e.g.: `https://rewear.pages.dev,http://localhost:5173`)*
4. Save changes. Render automatically redeploys with the updated CORS configuration.

---

## 6. Post-Deployment Verification Checklist

1. **Backend Health Probe**:
   ```bash
   curl -i https://rewear-backend.onrender.com/api/health
   ```
   Expected response: `HTTP/1.1 200 OK` with JSON `{"success": true, "status": "ok"}`.
2. **Client-Side SPA Routing**:
   - Open `https://rewear.pages.dev/items`.
   - Refresh the browser (F5 / Cmd+R).
   - Ensure page loads correctly without 404 (handled by `_redirects`).
3. **Authentication & Token Storage**:
   - Register a new account at `https://rewear.pages.dev/register`.
   - Confirm successful sign-in and token persistence in localStorage.
4. **Image Upload & Listing**:
   - Go to `https://rewear.pages.dev/add-item`.
   - Upload an item with image and submit.
   - Verify image delivers from Cloudinary CDN.

---

## 7. Troubleshooting & Notes

- **Render Cold Starts**: On the free tier, Render spins down inactive backend instances after 15 minutes of idle time. The first request after spindown may take 30-50 seconds to respond.
- **CORS Errors**: If browser console reports `Blocked by CORS policy`, verify that `FRONTEND_URL` on Render exactly matches the browser origin (including protocol `https://` without trailing slash).
- **MongoDB Connection Errors**: Ensure IP Access List on MongoDB Atlas includes `0.0.0.0/0` so Render dynamic IPs can connect.
