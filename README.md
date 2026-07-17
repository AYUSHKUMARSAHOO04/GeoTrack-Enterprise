# GeoTrack Enterprise

Multi-tenant GPS fleet tracking SaaS platform.

## Architecture

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL/PostGIS
- **Auth**: Supabase Auth → JWT → FastAPI dependency injection
- **State**: TanStack Query (server state) + Zustand (client state)

## Project Structure

```
/
├── app/                    # Next.js App Router pages
├── components/             # React components (UI + feature)
├── hooks/                  # Custom React hooks
├── lib/                    # Supabase clients, API client, utils
├── stores/                 # Zustand stores
├── types/                  # TypeScript type definitions
├── middleware.ts           # Next.js middleware (auth session refresh)
├── backend/
│   ├── app/
│   │   ├── api/v1/         # FastAPI route handlers
│   │   ├── core/           # Config, auth, database, RBAC
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── repositories/   # Data access layer
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic layer
│   │   └── main.py         # FastAPI app entrypoint
│   └── tests/              # Pytest test suite
└── docker-compose.yml      # Full-stack local development
```

## Supabase Client Architecture

Three separate clients following the official Next.js + Supabase pattern:

- `lib/supabase-client.ts` — Browser-only client (`"use client"`, `@supabase/supabase-js`)
- `lib/supabase-server.ts` — Server components only (`@supabase/ssr`, `cookies()` from `next/headers`)
- `lib/supabase-middleware.ts` — Middleware client (request-scoped cookies, returns `{ supabase, response }`)

## Authentication

JWT verification returns **401** for all auth failures (missing token, invalid, expired, unconfigured secret). Never 500.

## RBAC

5 roles: OWNER > ADMIN > MANAGER > OPERATOR > VIEWER
13 permissions enforced via `require_permission()` dependency.

## Development

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Docker

```bash
docker-compose up
```

## CI

All checks must pass:

```bash
# Frontend
npm ci && npm run lint && npm run type-check && npm run build

# Backend
cd backend
ruff check app && ruff format --check app && mypy app && pytest
```
