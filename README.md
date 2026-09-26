# CRYO NAV — AI-Enabled Antarctic Sea-Ice, Iceberg Trajectory & Navigation Decision Support System

> [!IMPORTANT]
> **Prototype & Synthetic Data Notice:**  
> CRYO NAV is an advisory decision-support research prototype. All cryospheric models, sea-ice grids, and iceberg drift algorithms in this prototype use **synthetic baseline models for demonstration and decision support testing**. They are **NOT** validated for actual real-world polar navigation.

---

## About CRYO NAV

CRYO NAV is a decision support system designed for research and logistics vessels operating in Antarctic waters (e.g., the Antarctic Peninsula, Marguerite Bay, and Weddell Sea). It provides polar navigators with interactive situational awareness, multi-objective route generation (SAFEST, BALANCED, FASTEST), satellite observation prioritization (Decision Impact Engine), real-time weather telemetry, and an AI decision support assistant.

---

## Technology Stack

- **Frontend:** React 19, TypeScript (~5.8), Vite 6, Leaflet GIS (v1.9.4), Lucide React, Motion.
- **Backend:** Express 4 on Node.js, bundled via `esbuild` for production.
- **Telemetry Feeds:** Open-Meteo Antarctic Weather & ECMWF Polar Marine APIs.
- **AI Assistant:** Express backend proxy (`/api/gemini/assistant`) powered by `@google/genai` with grounded system instructions and local rule fallback.

---

## Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure environment variables in `.env`:
   ```env
   # Required for Gemini AI assistant (Free tier available at Google AI Studio)
   GEMINI_API_KEY=your_gemini_api_key_here

   # Optional enterprise credentials
   COPERNICUS_MARINE_USER=
   COPERNICUS_MARINE_PASSWORD=
   ```

---

## Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run in Development Mode:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 in your browser.

3. **Run Type Check / Lint:**
   ```bash
   npm run lint
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```

5. **Start Production Server:**
   ```bash
   npm start
   ```

---

## Project Documentation (`docs/`)

Detailed system documentation is available in the [`docs/`](./docs/) directory:

- [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md): System capabilities specification (currently implemented vs planned).
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md): Frontend, backend, data, and target future architecture.
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md): 12-phase project implementation roadmap.
- [`docs/PROJECT_STATUS.md`](./docs/PROJECT_STATUS.md): Operational status matrix across all system components.
- [`docs/VALIDATION.md`](./docs/VALIDATION.md): Baseline health check checklist and API test results.
