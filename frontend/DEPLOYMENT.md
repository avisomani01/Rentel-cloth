# Closet Share Production Deployment Guide

This guide outlines how to deploy the Closet Share decoupled React frontend and Flask REST API backend.

## 1. Flask Backend Deployment (Render)

### Steps:
1. **Repository:** Ensure your backend contains the updated `app.py`, `models.py`, and `requirements.txt` (which now includes `Flask-Cors` and `psycopg2-binary`).
2. **Create Render Web Service:**
   - Name: `closet-share-backend`
   - Environment: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
3. **Environment Variables:**
   - `SECRET_KEY`: Set a secure random key.
   - `DATABASE_URL`: Add your Render PostgreSQL URI.
   - `FRONTEND_URL`: Set this to your deployed React frontend URL (e.g., `https://closet-share.vercel.app`) to authorize credentialed CORS requests.
   - Brevo API variables: `BREVO_API_KEY`, `SENDER_EMAIL`.
   - Cloudinary variables (optional): `CLOUDINARY_URL` (or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## 2. React Frontend Deployment (Vercel)

### Steps:
1. **Create Vercel Project:**
   - Link your GitHub repository.
   - Set the Root Directory to `frontend`.
   - Framework Preset: `Vite`.
2. **Build Settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. **Environment Variables:**
   - `VITE_API_URL`: Set this to your Render backend API URL (e.g., `https://closet-share-backend.onrender.com/api`).
4. **Deploy:** Click **Deploy**. Vercel will build the frontend assets and serve them over SSL.

---

## 3. Cookie & Session Security note

Because the frontend and backend are hosted on separate domains (e.g., `vercel.app` and `onrender.com`), browsers treat authentication cookies as cross-site (third-party).
To authorize this:
- The backend dynamically sets `SameSite=None` and `Secure=True` when `DATABASE_URL` is configured.
- Axios uses `withCredentials: true`.
- Make sure to add the final frontend URL in `FRONTEND_URL` environment variable on Render backend settings.
