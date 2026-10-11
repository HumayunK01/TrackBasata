<div align="center">

<img src="public/lightlogo.png" alt="TrackBasata logo" width="120" />

# TrackBasata

**High-performance document productivity tracker and workflow manager for Accounts Receivable (AR) healthcare teams.**

[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite_8-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev)
[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vitest](https://img.shields.io/badge/Tests-100_Passed-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Version](https://img.shields.io/badge/Version-3.0.0-10B981?style=flat-square)](package.json)

</div>

---

## Overview

TrackBasata replaces spreadsheets and disparate tracking notes with a purpose-built workstation for healthcare AR associates. It delivers tactile tap counting, category tracking across EHR workflows (NextGen, Athena), team workload visibility, and a tamper-resistant audit trail.

---

## Core Features

### 1. Console & Work Breakdown
- **Team Work Distribution**: Interactive donut charts and progress ring gauges show each team member's share and totals per category.
- **Draggable Category Slider**: Mouse-drag, horizontal scroll, and directional arrows to quickly inspect categories.
- **14-Day Sparklines**: Trend micro-charts for every document category.
- **Weekly & Day-of-Week Trends**: Automatic volume aggregation by day of week and rolling 10-week totals.

### 2. Fast Tap Counter
- **Zero-Latency Tapping**: Big-button touch and click counter built for high-speed document indexing.
- **Local Storage Hydration**: Protects ongoing session counts even if the browser closes or the network disconnects.
- **Auto-Save & Cloud Sync**: Debounced background persistence updates database records automatically.

### 3. Daily Logs & Reporting
- **Daily History**: View, filter, and edit daily count records by date.
- **Multi-Format Export**: One-click generation of formatted PDF summaries, CSV spreadsheets, and JSON exports.
- **Date Range Filters**: Presets for 7 days, 14 days, 30 days, current month, or custom date spans.

### 4. Fax & Indexable Tracker
- **Multi-Step Tracking**: Track incoming faxes, verification steps, and indexing queue handoffs.
- **Search & Resolution**: Instant filtering by patient name or document ID with quick status resolution.

### 5. Clinic Facilities Directory
- **Facility Directory**: Searchable directory of clinic names, verified addresses, and fax numbers.
- **One-Click Copy**: Copy phone, fax, and address details straight to your clipboard.

### 6. Intake Process Guide & Decision Trees
- **Visual Flowcharts**: Step-by-step decision trees for intake routing, ROI medical record requests, single-patient EKG/Cath lab files, and archive rules.
- **Routing Reference**: Directory of 29 approved inbox labels and test patient account details.

### 7. Credential Vault
- **Encrypted Storage**: Store service logins, clinic portal URLs, and notes organized into folders.
- **Secure Retrieval**: Client-side decryption and one-click copy with automatic favicon lookups.

---

## System Architecture

```
TrackBasata/
├── backend/                  # Express + TypeScript REST API Gateway (:5000)
│   ├── src/
│   │   ├── config/           # Environment validation, Supabase Admin, Upstash Redis, Swagger
│   │   ├── controllers/      # Request handlers (Categories, Logs, Facilities, Proxies)
│   │   ├── middleware/       # JWT auth guard, account disabled checks, rate limiting
│   │   ├── routes/           # Parameterized REST endpoints (/api/v1/*)
│   │   ├── services/         # Atomic counter increments, audit logging
│   │   └── server.ts         # HTTP server entrypoint
│   └── test/                 # Service boot and query security tests
│
├── frontend/                 # Vite 8 + React 18 + Tailwind CSS Client (:3000)
│   ├── src/
│   │   ├── components/       # Metric cards, counter pad, charts, facility tables, dialogs
│   │   ├── hooks/            # TanStack React Query hooks with cache persistence
│   │   ├── pages/            # Console, Counter, DailyLog, Report, Facilities, Team, Settings
│   │   └── test/             # 16 Vitest suites covering 100 unit & integration tests
│   └── vite.config.ts        # Proxy to backend (:5000), security CSP headers, vendor chunks
│
└── supabase/                 # PostgreSQL migrations & database schema
    └── migrations/           # Tables, Row Level Security, triggers, and functions
```

---

## Tech Stack

| Component | Technology |
|---|---|
| **Frontend Framework** | React 18 · TypeScript 5 · Vite 8 |
| **Styling & Design** | Tailwind CSS · shadcn/ui · Hubot Sans font |
| **Icons & Motion** | Heroicons (24/outline) · Lucide React · Motion |
| **State & Cache** | TanStack React Query with local storage persistence |
| **Charts** | Recharts · SVG Sparklines |
| **Backend API** | Node.js · Express · TypeScript · Swagger (OpenAPI 3.0) |
| **Database & Auth** | Supabase (PostgreSQL with Row Level Security) |
| **Rate Limiting** | Upstash Redis (sliding-window) with in-memory fallback |
| **Testing** | Vitest · React Testing Library · jsdom |

---

## Getting Started

### Prerequisites
- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher
- **Supabase Account**: With a running PostgreSQL database

### 1. Installation

Install dependencies across the monorepo:

```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

Or install inside the individual folders:

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configure Environment Variables

**Frontend (`frontend/.env.local`):**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
```

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 3. Database Setup

Apply database schema and security policies using the Supabase CLI:

```bash
supabase link --project-ref your-project-id
supabase db push
```

### 4. Running the Development Servers

```bash
# Run both backend and frontend concurrently
npm run dev:backend    # Starts API on http://localhost:5000
npm run dev:frontend   # Starts client on http://localhost:3000
```

- **Web App**: Open [http://localhost:3000](http://localhost:3000)
- **API Swagger Documentation**: Open [http://localhost:5000/docs](http://localhost:5000/docs)

---

## Available Scripts

| Command | Purpose |
|---|---|
| `npm run dev:frontend` | Starts the Vite development server on port 3000 |
| `npm run dev:backend` | Starts the Express API server with hot-reload on port 5000 |
| `npm run build` | Builds production bundles for both frontend and backend |
| `npm run test` | Runs the full automated test suite |
| `npm run typecheck` | Checks TypeScript types without emitting files |

---

## Security & Reliability

- **Row Level Security (RLS)**: Enforces table access control at the database engine level.
- **Deactivation Killswitch**: The backend verifies `profiles.is_disabled` on incoming requests, cutting access immediately if a user is deactivated.
- **SSRF-Hardened Proxies**: Logo and favicon image endpoints validate target domains, check DNS records, and reject private/loopback IP addresses.
- **Input Validation**: All API inputs and frontend forms are validated using Zod schemas.
- **Append-Only Audit Trail**: Administrative updates, account actions, and category changes log to an immutable audit table.

---

## Testing

Run the test suite with Vitest:

```bash
npm test
```

All 16 test suites pass with 100 assertions covering:
- Counter state hydration and persistence
- User category contributions and metric calculations
- Session cleanups and token handling
- Facilities search and data normalization
- Security claims and rate limiting

---

## License

This project is licensed under the [MIT License](LICENSE).
