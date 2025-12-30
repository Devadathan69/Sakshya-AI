# Sakshya AI - Deployment Guide

This guide covers how to deploy the Backend to **Railway** and the Frontend to **Vercel**.

## Phase 1: GitHub Setup

1.  **Commit & Push**: Ensure all your latest changes (including `Procfile`, `runtime.txt`, and frontend config updates) are pushed to GitHub.
    ```bash
    git add .
    git commit -m "chore: prepare for deployment"
    git push origin main
    ```

## Phase 2: Deploy Backend (Railway)

1.  Go to [Railway.app](https://railway.app/) and log in.
2.  Click **"New Project"** -> **"Deploy from GitHub repo"**.
3.  Select your repository (`Sakshya-AI`).
4.  **Important**: Click **"Add Variables"** before deploying (or go to "Variables" tab after).
5.  Add the following variables (copy values from your local `backend/.env`):
    - `GEMINI_API_KEY`: *Your Google Gemini API Key*
    - `GEMINI_MODEL_NAME`: `gemini-2.5-flash-lite`
    - `PADDLE_OCR_URL`: *Your OCR URL (if using remote)* or leave blank/default.
    - `PORT`: `8005` (Railway usually processes this automatically via Procfile, but good to know)
6.  Go to **Settings** -> **Root Directory** and set it to `/backend`.
7.  Deploy! Railway will detect the `Procfile` and `requirements.txt`.
8.  **Get the URL**: Once deployed, go to **Settings** -> **Networking** -> **Generate Domain**. You will get a URL like `https://sakshya-backend-production.up.railway.app`. **Copy this URL.**

## Phase 3: Deploy Frontend (Vercel)

1.  Go to [Vercel.com](https://vercel.com/) and log in.
2.  Click **"Add New..."** -> **"Project"**.
3.  Import your `Sakshya-AI` repository.
4.  **Configure Project**:
    - **Framework Preset**: Vite
    - **Root Directory**: Click "Edit" and select `frontend`.
5.  **Environment Variables**:
    - Add `VITE_API_URL`: Paste the Railway Backend URL you copied earlier (e.g., `https://sakshya-backend-production.up.railway.app`). **Do not add a trailing slash**.
    - Add all your Firebase variables (`VITE_FIREBASE_API_KEY`, etc.) from your local `.env`.
6.  Click **Deploy**.

## Phase 4: Final Verification

1.  Open your Vercel App URL.
2.  **Test Guest Mode**: Try analyzing a document. It should connect to the Railway backend.
3.  **Test Login**: Log in with your account.
4.  **Test History**: Run an analysis and check "My Analyses" to ensure Firestore connectivity.

## Troubleshooting

-   **CORS Errors**: If the frontend says "Network Error" or CORS issues, check the Backend logs in Railway. Ensure `main.py` has `allow_origins=["*"]` (or update it to match your Vercel domain specificially for better security).
-   **Backend 404**: Ensure the `VITE_API_URL` in Vercel does **not** have a trailing slash (`/`).
-   **Build Failures**: Check Vercel logs. Ensure `package.json` and `package-lock.json` are present in `frontend/`.
