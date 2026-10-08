# TrackBasata

> **High-Performance Document Processing Productivity Tracker & API Gateway**  
> Tailored for Accounts Receivable (AR) healthcare document processing associates, team leads, and operations managers.

---

## System Architecture

TrackBasata is structured as a fully decoupled, independent full-stack workspace:

```
TrackBasata/
+-- backend/                  # Layered Express + TypeScript API Gateway
¦   +-- src/
¦   ¦   +-- config/           # Zod env validation, Supabase Admin & Upstash Redis clients, Swagger spec
¦   ¦   +-- controllers/      # Thin HTTP request handlers (Categories, Logs, Facilities, Proxies)
¦   ¦   +-- middleware/       # JWT auth guard, is_disabled check, rate limiting, Zod schema validation
¦   ¦   +-- routes/           # Parameterized REST endpoints (/api/v1/*) & image proxies (/api/*)
¦   ¦   +-- services/         # Domain operations, atomic counter increments, audit logging
¦   ¦   +-- types/            # DTOs, request schemas, domain models
¦   ¦   +-- utils/            # Async wrappers, Winston/console loggers, standard JSON responses
¦   +-- test/                 # Automated boot and parameterized query security test suite
¦   +-- package.json
¦   +-- tsconfig.json
¦
+-- frontend/                 # High-Performance Vite 8 + React 18 + Tailwind CSS Client
¦   +-- src/
¦   ¦   +-- api/ & lib/       # Typed API client with auto Supabase Bearer token forwarding
¦   ¦   +-- components/       # Metric cards, counter pad, charts, facility tables, dialogs
¦   ¦   +-- hooks/            # React Query state management, optimistic updates, cache persistence
¦   ¦   +-- pages/            # Counter, DailyLog, Report, Facilities, Team, Settings
¦   ¦   +-- test/             # Vitest test suite with 15 test suites and 96 unit/integration tests
¦   +-- vite.config.ts        # Built-in proxy (/api -> :5000), security CSP headers, vendor chunk splitting
¦   +-- package.json
¦   +-- tsconfig.json
¦
+-- supabase/                 # Database Schema & Migrations
    +-- migrations/           # Centralized categories, RLS policies, audit trail, user governance
```

---

## Core Capabilities & Features

### 1. Atomic Tap Counter Surface
- **Instant Tapping**: Tactile, zero-latency counter pad designed for high-speed AR document sorting and verification.
- **Resilient State Persistence**: Hybrid local-storage hydration guarantees counts are never lost even during network interruptions.
- **Atomic Cloud Sync**: High-frequency tap increments (`POST /api/v1/logs/tap`) synchronize atomically to PostgreSQL JSONB without row lock contention.

### 2. Centralized Category Management
- **Global Administrative Control**: All document categories are centrally managed and locked behind `public.is_admin()`.
- **Workflow Integrity**: Distinguishes between distinct AR queues (`moved_to_indexing` vs `worked_on_indexing`).
- **Non-Destructive Key Remapping**: Migration scripts non-destructively preserve all historical counts while unifying legacy category variants.

### 3. Clinic Facilities Directory
- **Fast Reference Lookups**: Search clinic names, addresses, and fax numbers instantly with search query highlighting.
- **Sort Priority & Verification**: Mark verified provider facilities and customize display ordering.

### 4. Multi-Format Reporting & Telemetry
- **Aggregated Analytics**: Filter by single date or arbitrary date ranges (`?start_date=...&end_date=...`).
- **Export Formats**: One-click generation of PDF documents (via isolated `pdf-vendor` chunk), CSV spreadsheets, and raw JSON exports.

### 5. Multi-Layer Security Architecture
- **JWT Authentication**: Validates Supabase bearer tokens on all protected endpoints.
- **Immediate Deactivation Killswitch**: `auth.ts` inspects `profiles.is_disabled` on each request, instantly cutting off revoked credentials without waiting for JWT expiration.
- **Sliding-Window Rate Limiting**: Redis-backed rate limiting protects mutation endpoints against brute-force or abuse with in-memory fail-open reliability.
- **SSRF-Protected Image Proxies**: `GET /api/v1/logo` and `/api/v1/favicon` validate domain syntax, perform DNS resolution checks, and block private/loopback IP ranges.
- **Hardened HTTP Headers**: Strict Helmet security configuration, iframe embedding protection, and scoped CORS origins.

### 6. Design System & User Experience
- **Dual Visual Themes**: Toggle seamlessly between *Classic* and *Modern* variants, paired with Dark and Light mode support.
- **Typography**: Bundles Hubot Sans variable font for clear visual contrast in high-density document tables.
- **Optimized Bundle Splitting**: Isolated vendor chunks (`react-vendor`, `query-vendor`, `pdf-vendor`, `charts-vendor`, `icons-vendor`) for fast page loads and long-term browser caching.

---

## Interactive Swagger API Documentation

TrackBasata comes with built-in interactive OpenAPI 3.0 documentation:

- **Swagger UI**: [http://localhost:5000/docs](http://localhost:5000/docs) (also available at `/api/docs` and `/api/v1/docs`)
- **OpenAPI 3.0 Specification (JSON)**: [http://localhost:5000/api/v1/docs/swagger.json](http://localhost:5000/api/v1/docs/swagger.json)

### Testing via Swagger:
1. Start the backend: `npm run dev:backend`
2. Open [http://localhost:5000/docs](http://localhost:5000/docs) in your browser.
3. Click the **Authorize** button in the upper-right corner.
4. Paste your Supabase JWT access token. (Tokens persist across page reloads via `persistAuthorization: true`).
5. Choose any parameterized endpoint, click **Try it out**, fill in the parameters, and click **Execute**.

---

## API Endpoints Reference

All endpoints are hosted under `/api/v1/*` and follow REST conventions with parameterized query filtering:

| Method | Parameterized Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Public | Telemetry & service health (Database, Redis, Uptime) |
| `GET` | `/api/v1/categories` *(or `?id=UUID`)* | Authenticated | List all active categories or fetch a single category |
| `POST` | `/api/v1/categories` | Admin Only | Create a new centralized category |
| `PATCH` | `/api/v1/categories?id=UUID` | Admin Only | Update category label, short name, position, or status |
| `PUT` | `/api/v1/categories/reorder` | Admin Only | Atomically update sequence ordering for categories |
| `DELETE`| `/api/v1/categories?id=UUID` | Admin Only | Soft-archive a category (`is_active = false`) |
| `GET` | `/api/v1/logs` *(or `?date=...` / `?start_date=...&end_date=...`)* | Authenticated | Fetch date range or single day log |
| `POST` | `/api/v1/logs` | Authenticated | Upsert daily log document counts with audit tracking |
| `POST` | `/api/v1/logs/tap` | Authenticated | Rapid atomic tap counter increment |
| `DELETE`| `/api/v1/logs?date=YYYY-MM-DD` | Authenticated | Delete a daily log record |
| `GET` | `/api/v1/facilities` *(or `?id=UUID`)* | Authenticated | List all facilities or get single facility |
| `POST` | `/api/v1/facilities` | Admin Only | Create a new clinic facility |
| `PATCH` | `/api/v1/facilities?id=UUID` | Admin Only | Update existing facility details |
| `DELETE`| `/api/v1/facilities?id=UUID` | Admin Only | Remove a clinic facility |
| `GET` | `/api/v1/logo?domain=DOMAIN` | Public | SSRF-guarded Clearbit logo proxy with Redis caching |
| `GET` | `/api/v1/favicon?domain=DOMAIN` | Public | SSRF-guarded Google favicon proxy with Redis caching |

---

## Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (Node 20+ recommended)
- **Supabase Account**: With PostgreSQL and Authentication enabled
- **Upstash Redis** (Optional): For sliding-window rate limiting (defaults to memory fallback)

### 2. Environment Variables

Copy the provided environment templates:

```bash
# In backend:
cp backend/.env.example backend/.env

# In frontend:
cp frontend/.env.example frontend/.env
```

#### Backend Configuration (`backend/.env`)
```ini
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Supabase Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Upstash Redis (Optional for Rate Limiting)
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

#### Frontend Configuration (`frontend/.env`)
```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_API_URL=/api/v1
```

### 3. Database Migration

Run the centralized categories migration in your **Supabase SQL Editor**:

1. Open your local migration file (`supabase/migrations/20261009000001_centralize_categories.sql`).
2. Paste into the SQL Editor and execute.
3. This creates backup tables, seeds canonical categories, and configures admin RLS policies.

---

## Development & Workspace Scripts

Run commands from the `TrackBasata/` root directory:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Install Dependencies** | `npm run install:all` | Installs dependencies in both backend and frontend |
| **Start Backend API** | `npm run dev:backend` | Starts Express server with hot-reload on `http://localhost:5000` |
| **Start Frontend Client** | `npm run dev:frontend` | Starts Vite dev server with proxy on `http://localhost:3000` |
| **Run All Tests** | `npm test` | Runs backend integration tests + 96 frontend Vitest tests |
| **Type Check All** | `npm run typecheck` | Validates TypeScript in backend and frontend (0 errors) |
| **Build for Production** | `npm run build` | Compiles backend to `dist/` and builds optimized Vite client |

---

## License

Private & Proprietary — TrackBasata.
