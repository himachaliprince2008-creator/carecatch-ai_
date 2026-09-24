# CareMatch AI 🏥

> **Right Care. Right Place. Right Cost.**

CareMatch AI is an intelligent, AI-powered healthcare navigation platform built for India. It helps patients find verified hospitals, compare treatment costs, and access disease-specific outcome data — without fabricating any medical facts.

---

## Executive Project Overview

CareMatch AI bridges the gap between patients and healthcare providers across India by combining natural language understanding, a deterministic recommendation engine, and a verified hospital registry. Users can describe their healthcare need in plain English, Hindi, or Hinglish, and the platform intelligently filters 250+ hospitals across India by disease, location, budget, PM-JAY eligibility, and available facilities.

The platform is built on a strict principle: **no AI hallucination of medical facts**. All hospital results, success rates, and cost data come from the verified mock registry or database — never invented by the AI.

---

## Comprehensive Feature List

### 🤖 AI-Powered Search Assistant (CareMatch Chatbot)
- Conversational chat UI with natural language input (English, Hindi, Hinglish)
- Powered by **Google Gemini 2.5 Flash** for intent extraction
- Extracts: location, specialty, treatment, budget, PM-JAY need, ICU/Emergency requirements
- **Voice Search** — click the microphone button to speak your query (uses browser Web Speech API, supports `en-IN`)
- Microphone turns red and pulses while actively listening
- Shows structured hospital result cards sorted by success rate (descending)
- Clarification prompts when query is ambiguous

### 🔍 Offline Heuristic Fallback Parser
- Activates automatically when Gemini API is unavailable or unconfigured
- Recognises **175+ diseases** across 15+ specialties: Pulmonology, Cardiology, Neurology, ENT, Oncology, Gastroenterology, Orthopedics, Dermatology, Endocrinology, Pediatrics, Gynecology, Infectious Diseases, Traumatology, Anesthesiology, and more
- Recognises **25+ Indian cities**: Delhi, Mumbai, Bengaluru, Hyderabad, Chennai, Pune, Kolkata, Jaipur, Ahmedabad, Lucknow, Kochi, Chandigarh, and more
- Budget parsing in INR formats: ₹50,000 / 1 lakh / 5k / under 2L etc.

### 🏥 Hospital Registry (250 Pan-India Hospitals)
- Dynamically generated registry of 250 hospitals spread across all major Indian states
- Each hospital covers multiple specialties with unique, varied success rates
- Hospitals sorted by highest treatment success rate (descending) in search results
- Internal specializations also sorted by success rate (descending)
- Filters: disease, specialty, city, state, PM-JAY, ICU, Emergency, NABH, budget, radius
- Geospatial distance calculation using Haversine formula

### 🛡️ Admin Console
- Full-featured admin dashboard at `/admin`
- **New Hospital Record** — add hospitals to registry via modal form
- **Verify / Flag** — set verification status (Verified, Pending, Rejected) with audit notes
- **Suspicious Flag** — quarantine records with outlier pricing, coordinates, or accreditation issues
- All admin data seeded with **real Indian hospitals** (AIIMS Delhi, Lilavati Mumbai, Manipal Bengaluru)
- Admin auth bypasses automatically in dev/demo mode (no `ADMIN_API_SECRET` env required locally)

### 📊 CSV Bulk Import Pipeline (7-Stage)
- 7-stage visual pipeline: CSV Input → Parse → Validate → Normalize → Deduplicate → Quality Check → Admin Commit
- Pre-configured Indian test scenarios: National Cardiology Batch, Mixed Stress Test, Verified Conflict Batch
- Detects duplicate rows, invalid pricing (min > max), impossible outcomes (successful > total)
- Row-level accept/skip/update controls before committing
- All test data uses Indian hospitals (AIIMS, Lilavati, Manipal) with INR pricing

### 🗺️ Map & Navigation
- Interactive hospital map via Leaflet + OpenStreetMap (no API key needed)
- `Get Directions` on hospital cards (uses real coordinates)
- Global search bar routes to `/find-care` with pre-filled query

### 🧭 Navigation & Pages
- **Overview** — dashboard home
- **Find Care** — AI-powered hospital search
- **Cost Estimator** — treatment cost comparison
- **Hospital Map** — geospatial view
- **Saved Hospitals** — bookmarks
- **Search History** — past queries
- **Admin workspace** — full admin console
- **Preferences** → `/profile` — account & care preferences
- Fully responsive; mobile sidebar with overlay

---

## Technology Stack & Dependency Specifications

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma |
| AI / LLM | Google Gemini 2.5 Flash (`@google/genai`) |
| Validation | Zod |
| Maps | Leaflet + OpenStreetMap |
| Voice Input | Web Speech API (browser-native, `en-IN`) |
| Deployment | Vercel (Serverless Functions) |
| Icons | Lucide React |

---

## Environment Setup & Deployment Instructions

### Prerequisites
- Node.js 18+
- npm 9+

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
```

Edit `.env.local` with your values:

```env
# Required for database features
DATABASE_URL=your_neon_postgresql_pooled_connection_string
DIRECT_URL=your_neon_direct_connection_string   # optional, for migrations

# Required for AI search
GEMINI_API_KEY=your_google_gemini_api_key

# Optional — if not set, admin routes are open in dev mode
ADMIN_API_SECRET=your_secret_token
```

> **Note:** All three env vars are **optional** for local development. The app runs fully on mock/fallback data without a database or AI key. Voice search and the offline heuristic parser work without any configuration.

```bash
# 3. Start development server
npm run dev
```

The app will be available at **http://localhost:3000** (or 3001 if 3000 is in use).

---

### Database Setup (Optional — for production features)

```bash
# Generate Prisma client
npm run db:generate

# Validate schema
npm run db:validate

# Run migrations
npm run db:migrate -- --name init

# Seed demo data (dev only — never run in production)
npm run db:seed
```

> Every seeded record is marked as `DEMO / SYNTHETIC DATA ONLY`. Never present these as real healthcare data.

---

### Vercel Deployment

1. Push this repository to GitHub
2. Import repository in [Vercel](https://vercel.com) — framework auto-detected as Next.js
3. In **Project Settings → Environment Variables**, add:
   - `DATABASE_URL` — Neon pooled connection string
   - `DIRECT_URL` — (optional) for migrations
   - `GEMINI_API_KEY` — server-side AI key
   - `ADMIN_API_SECRET` — secure token for admin routes
4. Deploy. Vercel injects env vars into Serverless Functions at runtime
5. Run production migrations from your local machine or CI:
   ```bash
   npm run db:deploy
   ```
6. Verify deployment via the health endpoint:
   ```
   GET /api/health
   ```

> **Never** prefix server secrets with `NEXT_PUBLIC_`. Only explicitly `NEXT_PUBLIC_` variables are sent to the browser.

---

### Available API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/hospitals` | List hospitals with filters |
| `GET` | `/api/hospitals/:id` | Hospital detail |
| `GET` | `/api/search` | Search hospitals |
| `POST` | `/api/ai/search` | AI natural language search |
| `POST` | `/api/recommendations` | Weighted match recommendations |
| `GET/POST` | `/api/admin/hospitals` | Admin hospital registry |
| `POST` | `/api/admin/verify` | Verify / flag a record |
| `POST` | `/api/admin/import-csv` | CSV validate & commit |
| `POST` | `/api/admin/pipeline/process` | Run full ingestion pipeline |
| `POST` | `/api/admin/pipeline/commit` | Commit pipeline results |

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages & API routes
│   ├── admin/              # Admin Console page
│   ├── api/                # All API route handlers
│   ├── find-care/          # Hospital search page
│   ├── hospitals/          # Hospital detail pages
│   └── ...
├── components/             # React UI components
│   ├── admin-dashboard.tsx       # Admin Console UI
│   ├── care-assistant.tsx        # AI Chatbot with voice search
│   ├── data-import-pipeline.tsx  # CSV bulk import UI
│   ├── dashboard-shell.tsx       # App shell, nav, header
│   └── hospital-result-card.tsx  # Hospital result cards
└── lib/
    ├── ai/                 # Gemini search assistant + fallback parser
    ├── data-pipeline/      # CSV ingestion pipeline (7 stages)
    ├── recommendations/    # Weighted recommendation engine
    ├── repositories/       # hospital-repository.ts (250 hospitals, 175 diseases)
    ├── security/           # Admin auth, CSRF, rate limiter
    └── validation/         # Zod schemas, data quality engine
```

---

## Key Design Principles

- ✅ **No AI hallucination** — Gemini extracts search *requirements* only; results always come from the database/repository
- ✅ **India-first** — All mock data uses Indian hospitals, INR pricing, and Indian cities
- ✅ **PM-JAY aware** — Filters by Ayushman Bharat eligibility
- ✅ **Offline capable** — Full fallback parser works without any API keys
- ✅ **Transparent scoring** — Every recommendation shows match reasons, not a black-box score
- ✅ **Data integrity** — Quality engine flags suspicious records; no auto-correction of healthcare values

---

## Verification

```bash
# Type-check without building
npx tsc --noEmit

# Production build
npm run build
```
