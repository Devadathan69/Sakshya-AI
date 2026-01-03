# ⚖️ Sakshya AI
> **Automated Consistency Verification System for the Indian Judiciary**

![Sakshya AI Banner](https://img.shields.io/badge/Status-Production%20Ready-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![Stack](https://img.shields.io/badge/Tech-FastAPI%20%7C%20React%20%7C%20LLM-blueviolet)

**Sakshya AI** is an advanced legal decision support system designed to assist discrepancies in witness testimonies. By leveraging a Hybrid AI pipeline (Gemini + Qwen), it automates the detection of contradictions, omissions, and exaggerations across multiple legal documents and audio depositions.

---

## 🚀 Core Capabilities
*   **🏛️ Neo-Legal Design System**: A complete UI overhaul featuring "Playfair Display" typography, sharp "Legal Panel" aesthetics, and a deep professional dark mode tailored for legal visibility.
*   **🧩 Multi-Witness Matrix**: New N*N cross-verification engine. Compare 3+ witnesses simultaneously to find conflicting narratives.
*   **🎙️ Integrated Transcription**: Native support for **Sarvam.ai** to transcribe Hindi/English audio depositions directly in the browser.
*   **📄 Intelligent Extraction**: Deterministic event comparison to reduce false positives (hallucinations) in trivial statements.

---

## 🛠️ System Architecture

### 1. The Frontend (Client)
*   **Framework**: React + Vite + TypeScript
*   **Styling**: TailwindCSS (Custom "Legal Tech" Theme)
*   **State**: Firebase Auth & Firestore (for history/audit logs)

### 2. The Backend (Server)
*   **API**: FastAPI (Python)
*   **Orchestration**:
    *   **Extraction Layer**: Google Gemini 2.0 Flash (Fast, structured JSON extraction)
    *   **Analysis Layer**: Qwen 2.5 7B (Hosted on Modal/HF) for deep semantic comparison.
*   **Media**: Uses `ffmpeg` and `Sarvam API` for audio processing.

---

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)
*   Keys for Gemini API & Firebase Project

### 1️⃣ Backend Setup
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables**:
Copy the example file and fill in your keys.
```bash
cp .env.example .env
```
*   `GEMINI_API_KEY`: Required for event extraction.
*   `SARVAM_API_KEY`: Required for audio features.
*   `MODAL_API_URL`: URL of your hosted inference server (or local stub).

**Run Server**:
```bash
uvicorn main:app --reload --port 8000
```

### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
```

**Environment Variables**:
Copy the example file.
```bash
cp .env.example .env
```
*   `VITE_API_URL`: `http://localhost:8000` (or your deployed URL)
*   `VITE_FIREBASE_*`: Your Firebase project credentials.

**Run Client**:
```bash
npm run dev
```

---

## 📖 Usage Guide

### Mode 1: Single Witness Analysis
**Objective**: Verify if a witness changed their story over time.
1.  **Impute Statement 1**: Upload FIR copy (PDF/Image) or enter text.
2.  **Impute Statement 2**: Upload Court Deposition or record audio.
3.  **Analyze**: The system highlights where the narrative diverged (e.g., "In FIR he said X, in Court he said Y").

### Mode 2: Multi-Witness Matrix
**Objective**: Cross-examine multiple witnesses for the same event.
1.  **Add Witnesses**: Create profiles for PW-1, PW-2, PW-3, etc.
2.  **Upload Evidence**: Attach their Section 161 statements or depositions.
3.  **Run Matrix**: The system compares Every-vs-Every to generate a consolidated discrepancy report.

---

## 🛡️ Legal Disclaimer
**Sakshya AI is a Decision Support System (DSS), not a Judge.**
The analysis provided by this tool is probabilistic and based on Large Language Models. It should be used to *flag* potential issues for human review. It does not constitute legal advice and is not admissible as primary evidence in a court of law without independent verification.

---

## 🤝 Contribution
Developed by **Devadathan** for the **Sakshya AI Project**.
*   **Frontend**: React, Tailwind, Framer Motion
*   **Backend**: FastAPI, LangChain, PyTorch
*   **AI**: Google DeepMind (Gemini), Alibaba Cloud (Qwen), Sarvam AI (Speech)
